import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";
import { isCourseTeacher } from "../Middlewares/isCourseTeacher";
const prisma = new PrismaClient();

const router = express.Router();


/**
 * @swagger
 * /chapter/create-chapters:
 *   post:
 *     summary: Create a new chapter
 *     tags: [Chapters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChapterInput'
 *     responses:
 *       201:
 *         description: Chapter created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chapter'
 *       400:
 *         description: Missing required fields or invalid data
 *       404:
 *         description: Course not found
 *       409:
 *         description: Chapter title already exists in this course
 *       500:
 *         description: Internal server error
 */
router.post('/create-chapters',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { title, description, courseId } = req.body;
  
    try {
      // Validate required fields
      if (!title || !courseId ) {
        return res.status(400).json({ 
          error: 'title, courseId, and order (number) are required' 
        });
      }
  
      // Verify course exists
      const courseExists = await prisma.course.findUnique({
        where: { id: courseId }
      });
      if (!courseExists) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const highestorder=await prisma.chapter.findFirst({
        where: {
          courseId,
        },
        orderBy: {
          order: 'desc'
        },
        select: {
          order: true
        }
      });

      const chapterorder=(highestorder?.order || 0) + 1
  
  
      // Create chapter
      const chapter = await prisma.chapter.create({
        data: {
          title,
          description,
          order : chapterorder,
          courseId
        },
        include: {
          course: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });
  
      res.status(201).json(chapter);
    } catch (error) {
      if ((error as { code: string }).code=== 'P2002') {
        return res.status(409).json({ 
          error: 'Chapter title already exists in this course' 
        });
      }
      console.error('Error creating chapter:', error);
      res.status(500).json({ error: 'Failed to create chapter' });
    }
  });



//get info on a chapter
/**
 * @swagger
 * /chapter/{chapterId}/chapter:
 *   get:
 *     summary: Get chapter details with progress information
 *     description: Retrieves chapter information including title, description, and progress data
 *     tags: [Chapters]
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the chapter to retrieve
 *     responses:
 *       200:
 *         description: Chapter details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChapterWithProgress'
 *       404:
 *         description: Chapter not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Chapter not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 * 
 * components:
 *   schemas:
 *     ChapterWithProgress:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         order:
 *           type: integer
 *           description: The sequence order of the chapter
 *         courseId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         progresses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ChapterProgress'
 * 
 *     ChapterProgress:
 *       type: object
 *       properties:
 *         status:
 *           $ref: '#/components/schemas/ProgressStatus'
 *         progress:
 *           type: number
 *           description: Completion percentage (0-100)
 *         lastAccessedAt:
 *           type: string
 *           format: date-time
 *         timeSpent:
 *           type: integer
 *           description: Time spent in seconds
 * 
 *     ProgressStatus:
 *       type: string
 *       enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *       description: The progress status of the chapter
 */
  router.get('/:chapterId/chapter',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { chapterId } = req.params;
  
    try {
      const chapter = await prisma.chapter.findUnique({
        where: { id:chapterId },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          courseId: true,
          createdAt: true,
          updatedAt: true,
          progresses: {
            where: {
              chapterId: chapterId // Filter by current user
            },
            select: {
                status: true,
                progress: true,
                lastAccessedAt: true,
                timeSpent:true

            }
        }
        },
        
      });
  
      if (!chapter) {
        return res.status(404).json({ error: 'Chapter not found' });
      }
  
      res.json(chapter);
    } catch (error) {
      console.error('Error retrieving chapter:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });





  // get all chapters in a course associate with the progresse of a particular user in each case
/**
 * @swagger
 * /chapter/courses/{courseId}/chapters:
 *   get:
 *     summary: Get all chapters for a course
 *     tags: [Chapters]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course
 *     responses:
 *       200:
 *         description: List of chapters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChapterWithDetails'
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 *
 * @swagger
 * components:
 *   schemas:
 *     CreateChapterInput:
 *       type: object
 *       required:
 *         - title
 *         - courseId
 *         - order
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the chapter
 *           example: "Introduction to Programming"
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional chapter description
 *           example: "Learn the basics of programming"
 *         order:
 *           type: integer
 *           description: Sequence order of the chapter
 *           example: 1
 *         courseId:
 *           type: string
 *           description: ID of the course this chapter belongs to
 *           example: "507f1f77bcf86cd799439011"
 * 
 *     Chapter:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated chapter ID
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         order:
 *           type: integer
 *         courseId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "507f1f77bcf86cd799439013"
 *         title: "Introduction to Programming"
 *         description: "Learn the basics of programming"
 *         order: 1
 *         courseId: "507f1f77bcf86cd799439011"
 *         createdAt: "2023-08-01T12:00:00Z"
 *         updatedAt: "2023-08-01T12:00:00Z"
 * 
 *     ChapterWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/Chapter'
 *         - type: object
 *           properties:
 *             _count:
 *               type: object
 *               properties:
 *                 lessons:
 *                   type: integer
 *                   example: 5
 *                 quizzes:
 *                   type: integer
 *                   example: 2
 *                 assignments:
 *                   type: integer
 *                   example: 3
 */ 
router.get('/courses/:courseId/chapters',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { courseId } = req.params;

    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  
    try {
      // Verify course exists
      const courseExists = await prisma.course.findUnique({
          where: { id: courseId }
      });
      if (!courseExists) {
          return res.status(404).json({ error: 'Course not found' });
      }

      // Get chapters ordered by 'order' field with user-specific progress
      const chapters = await prisma.chapter.findMany({
          where: { courseId },
          orderBy: { order: 'asc' },
          include: {
              _count: {
                  select: {
                      lessons: true,
                      Quiz: true,
                      Assignment: true
                  }
              },
              progresses: userId ? {
                  where: {
                      userId: userId
                  },
                  take: 1 // Only get the first progress record if multiple exist
              } : false
          }
      });


      // Transform the response to a simpler structure
const simplifiedChapters = chapters.map(chapter => ({
  id: chapter.id,
  title: chapter.title,
  description: chapter.description,
  order: chapter.order,
  status: chapter.progresses?.[0]?.status ?? "NOT_STARTED",
  courseId: chapter.courseId,
  createdAt: chapter.createdAt,
  updatedAt: chapter.updatedAt,
  lessonCount: chapter._count.lessons,
  quizCount: chapter._count.Quiz,
  assignmentCount: chapter._count.Assignment,
  progress: chapter.progresses?.[0]?.progress ?? 0,
  lastAccessedAt: chapter.progresses?.[0]?.lastAccessedAt,
}));

res.status(200).json(simplifiedChapters);

  } catch (error) {
      console.error('Error fetching chapters:', error);
      res.status(500).json({ error: 'Failed to fetch chapters' });
  }

})

/**
 * @swagger
 * /chapter/delete-chapter/{chapterId}:
 *   delete:
 *     summary: Delete a chapter
 *     description: Permanently deletes a chapter and all its associated data (lessons, materials, etc.)
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         description: ID of the chapter to delete
 *     responses:
 *       200:
 *         description: Chapter successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chapter deleted successfully"
 *                 deletedChapter:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     order:
 *                       type: integer
 *                     courseId:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input (missing chapter ID)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Chapter ID is required"
 *       404:
 *         description: Chapter not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to delete chapter"
 */
router.delete('/delete-chapter/:chapterId', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { chapterId } = req.params;
 
  try {
    // Validate chapterId
    if (!chapterId) {
      return res.status(400).json({ error: 'Chapter ID is required' });
    }

    // Delete the chapter
    const deletedChapter = await prisma.chapter.delete({
      where: { id: chapterId },
    });

    res.status(200).json({ message: 'Chapter deleted successfully', deletedChapter });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

  module.exports =router 