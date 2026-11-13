import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";

const prisma = new PrismaClient();

const router = express.Router();

/**
 * @swagger
 * /lesson/create-lessons:
 *   post:
 *     summary: Create a new lesson
 *     tags: [Lessons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLessonInput'
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonWithDetails'
 *       400:
 *         description: Missing required fields or invalid data
 *       404:
 *         description: Chapter not found
 *       409:
 *         description: Lesson title already exists in this chapter
 *       500:
 *         description: Internal server error
 *
 * @swagger
 * components:
 *   schemas:
 *     CreateLessonInput:
 *       type: object
 *       required:
 *         - title
 *         - chapterId
 *         
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the lesson
 *           example: "Introduction to Variables"
 *         
 *         duration:
 *           type: integer
 *           nullable: true
 *           description: Estimated duration in minutes
 *           example: 30
 *         
 *         chapterId:
 *           type: string
 *           description: ID of the parent chapter
 *           example: "507f1f77bcf86cd799439013"
 * 
 *     LessonWithDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439014"
 *         title:
 *           type: string
 *           example: "Introduction to Variables"
 *         content:
 *           nullable: true
 *         duration:
 *           type: integer
 *           nullable: true
 *         order:
 *           type: integer
 *           example: 1
 *         chapterId:
 *           type: string
 *           example: "507f1f77bcf86cd799439013"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-08-01T12:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-08-01T12:00:00Z"
 *         chapter:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             title:
 *               type: string
 *             courseId:
 *               type: string
 *         _count:
 *           type: object
 *           properties:
 *             coursematerials:
 *               type: integer
 *               example: 3
 *             assignments:
 *               type: integer
 *               example: 2
 */
router.post('/create-lessons',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { title, duration, chapterId } = req.body;
  
    try {
      // Validate required fields
      if (!title || !chapterId ) {
        return res.status(400).json({ 
          error: 'title, chapterId, and order (number) are required' 
        });
      }
  
      // Verify chapter exists
      const chapterExists = await prisma.chapter.findUnique({
        where: { id: chapterId }
      });
      if (!chapterExists) {
        return res.status(404).json({ error: 'Chapter not found' });
      }

      const highestorder=await prisma.lesson.findFirst({
        where: {
          chapterId,
        },
        orderBy: {
          order: 'desc'
        },
        select: {
          order: true
        }
      });
  
      const orderInt=(highestorder?.order ||0) + 1
      const durationInt=parseInt(duration, 10) * 60  
      // Create lesson
      const lesson = await prisma.lesson.create({
        data: {
          title,
          duration:durationInt,
          order:orderInt,
          chapterId
        },
        include: {
          chapter: {
            select: {
              id: true,
              title: true,
              courseId: true
            }
          },
          _count: {
            select: {
              coursematerials: true,
              Assignment: true
            }
          }
        }
      });
  
      res.status(201).json(lesson);
    } catch (error) {
      if ((error as { code: string }).code=== 'P2002') {
        return res.status(409).json({ 
          error: 'Lesson title already exists in this chapter' 
        });
      }
      console.error('Error creating lesson:', error);
      res.status(500).json({ error: 'Failed to create lesson' });
    }
  });


  //get all lessons in chapter associated with the users progreesses for each lesson 
/**
 * @swagger
 * /lesson/chapters/{chapterId}/lessons:
 *   get:
 *     summary: Get all lessons in a chapter
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the chapter
 *     responses:
 *       200:
 *         description: List of lessons ordered by sequence
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LessonWithDetails'
 *       404:
 *         description: Chapter not found
 *       500:
 *         description: Internal server error
 */
router.get('/chapters/:chapterId/lessons',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { chapterId } = req.params;
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  
    try {
      // Verify chapter exists
      const chapterExists = await prisma.chapter.findUnique({
        where: { id: chapterId }
      });
      if (!chapterExists) {
        return res.status(404).json({ error: 'Chapter not found' });
      }
  
      // Get lessons ordered by 'order' field
      const lessons = await prisma.lesson.findMany({
        where: { chapterId },
        orderBy: { order: 'asc' },
        include: {
          chapter: {
            select: {
              title: true,
              courseId: true
            }
          },
          _count: {
            select: {
              coursematerials: true,
              Assignment: true
            }
          },
          progresses:userId ? {
            where: {
                userId: userId
            },
            take: 1 // Only get the first progress record if multiple exist
        } : false
        }
      });
  
      res.status(200).json(lessons);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      res.status(500).json({ error: 'Failed to fetch lessons' });
    }
  });

//get a lesson and progresse for a user  by it's Id 
/**
 * @swagger
 * /lesson/lessons/{lessonId}:
 *   get:
 *     summary: Get detailed lesson information
 *     description: Returns lesson details including chapter info, progress data (if userId provided), and counts of related materials/assignments
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the lesson to retrieve
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Optional user ID to include progress information
 *     responses:
 *       200:
 *         description: Lesson details with progress and counts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonDetails'
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Failed to fetch lesson
 * 
 * components:
 *   schemas:
 *     LessonDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         content:
 *           type: object
 *           nullable: true
 *           description: Raw editor content (JSON)
 *         html:
 *           type: string
 *           nullable: true
 *           description: Rendered HTML content
 *         duration:
 *           type: integer
 *           nullable: true
 *           description: Duration in seconds
 *         order:
 *           type: integer
 *           description: Sequence within chapter
 *         chapterId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         lessonchapter:
 *           type: string
 *           description: Title of the containing chapter
 *         lessonstatus:
 *           type: string
 *           nullable: true
 *           enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *           description: User's progress status (only if userId provided)
 *         lessoncompletion:
 *           type: boolean
 *           nullable: true
 *           description: Completion status (only if userId provided)
 *         lessontimespenttofinish:
 *           type: integer
 *           nullable: true
 *           description: Time spent in seconds (only if userId provided)
 *         lessonmaterialcount:
 *           type: integer
 *           description: Count of related course materials
 *         lessonassignmentcount:
 *           type: integer
 *           description: Count of related assignments
 *       example:
 *         id: "507f1f77bcf86cd799439011"
 *         title: "Introduction to Variables"
 *         content: {"type":"doc","content":[{"type":"paragraph"}]}
 *         html: "<p>Learn about variables</p>"
 *         duration: 900
 *         order: 1
 *         chapterId: "507f1f77bcf86cd799439012"
 *         createdAt: "2023-01-15T09:30:00Z"
 *         updatedAt: "2023-01-15T09:30:00Z"
 *         lessonchapter: "Programming Basics"
 *         lessonstatus: "IN_PROGRESS"
 *         lessoncompletion: false
 *         lessontimespenttofinish: 300
 *         lessonmaterialcount: 3
 *         lessonassignmentcount: 1
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
  router.get('/lessons/:lessonId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { lessonId } = req.params;
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;

    try {
        
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                chapter: {
                    select: {
                        title: true,
                        courseId: true
                    }
                },
                _count: {
                    select: {
                        coursematerials: true,
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

        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        // Return the lesson in the exact same format as your example
        res.status(200).json({
            id: lesson.id,
            title: lesson.title,
            content: lesson.content,
            html:lesson.html,
            duration: lesson.duration,
            order: lesson.order,
            chapterId: lesson.chapterId,
            createdAt: lesson.createdAt,
            updatedAt: lesson.updatedAt,
            lessonchapter:lesson.chapter.title,
            lessonstatus:lesson.progresses[0].status,
            lessoncompletion:lesson.progresses[0].isCompleted,
            lessontimespenttofinish:lesson.progresses[0].timeSpent,
            lessonmaterialcount:lesson._count.coursematerials,
            lessonassignmentcount:lesson._count.Assignment
        });
    } catch (error) {
        console.error('Error fetching lesson:', error);
        res.status(500).json({ error: 'Failed to fetch lesson' });
    }
});



//get a lesson only
/**
 * @swagger
 * /lesson/lesson-only/{lessonId}:
 *   get:
 *     summary: Get basic lesson information without progress tracking
 *     description: Returns lesson details including chapter information and counts of related materials/assignments
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the lesson to retrieve
 *     responses:
 *       200:
 *         description: Lesson details with chapter info and counts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BasicLessonDetails'
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Failed to fetch lesson
 * 
 * components:
 *   schemas:
 *     BasicLessonDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         content:
 *           type: object
 *           nullable: true
 *           description: Raw editor content (JSON)
 *         html:
 *           type: string
 *           nullable: true
 *           description: Rendered HTML content
 *         duration:
 *           type: integer
 *           nullable: true
 *           description: Duration in seconds
 *         order:
 *           type: integer
 *           description: Sequence within chapter
 *         chapterId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         chapter:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             courseId:
 *               type: string
 *         _count:
 *           type: object
 *           properties:
 *             coursematerials:
 *               type: integer
 *               description: Count of related course materials
 *             Assignment:
 *               type: integer
 *               description: Count of related assignments
 *       example:
 *         id: "507f1f77bcf86cd799439011"
 *         title: "Introduction to Variables"
 *         content: {"type":"doc","content":[{"type":"paragraph"}]}
 *         html: "<p>Learn about variables</p>"
 *         duration: 900
 *         order: 1
 *         chapterId: "507f1f77bcf86cd799439012"
 *         createdAt: "2023-01-15T09:30:00Z"
 *         updatedAt: "2023-01-15T09:30:00Z"
 *         chapter:
 *           title: "Programming Basics"
 *           courseId: "507f1f77bcf86cd799439013"
 *         _count:
 *           coursematerials: 3
 *           Assignment: 1
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.get('/lesson-only/:lessonId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { lessonId } = req.params;
  

  try {
      
      const lesson = await prisma.lesson.findUnique({
          where: { id: lessonId },
          include: {
              chapter: {
                  select: {
                      title: true,
                      courseId: true
                  }
              },
              _count: {
                  select: {
                      coursematerials: true,
                      Assignment: true
                  }
              },
             
          }
      });

      if (!lesson) {
          return res.status(404).json({ error: 'Lesson not found' });
      }

      // Return the lesson 
      res.status(200).json({
          id: lesson.id,
          title: lesson.title,
          content: lesson.content,
          html:lesson.html,
          duration: lesson.duration,
          order: lesson.order,
          chapterId: lesson.chapterId,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt,
          chapter: {
              title: lesson.chapter?.title,
              courseId: lesson.chapter?.courseId
          },
          _count: {
              coursematerials: lesson._count?.coursematerials,
              Assignment: lesson._count?.Assignment
          },
          
      });
  } catch (error) {
      console.error('Error fetching lesson:', error);
      res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});


//For content creatioon html json text editor
/**
 * @swagger
 * /lesson/{id}/content:
 *   put:
 *     summary: Update lesson content
 *     description: Updates both JSON and HTML content for a lesson
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the lesson to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - json
 *               - html
 *             properties:
 *               json:
 *                 type: object
 *                 description: Raw JSON content from the editor
 *                 example: {"type":"doc","content":[{"type":"paragraph"}]}
 *               html:
 *                 type: string
 *                 description: Rendered HTML content
 *                 example: "<p>Lesson content</p>"
 *     responses:
 *       200:
 *         description: Lesson content updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 lesson:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing required content fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Both json and html content are required"
 *       500:
 *         description: Failed to update lesson content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to update lesson content"
 * 
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
router.put('/:id/content',authenticateToken, async (req, res): Promise<any> => {
  const { id } = req.params;
  const { json, html } = req.body; // accepting both formats

  if (!json || !html) {
    return res.status(400).json({ 
      error: 'Both json and html content are required' 
    });
  }

  try {
    const lesson = await prisma.lesson.update({
      where: { id },
      data: { 
        content: json,  // Store raw JSON (no need to stringify since it is already Json type haha)
        html: html      // Store rendered HTML
      },
    });

    return res.json({ 
      success: true, 
      lesson: {
        id: lesson.id,
        updatedAt: lesson.updatedAt
        
      }
    });
  } catch (error) {
    console.error('Error saving content:', error);
    return res.status(500).json({ 
      error: 'Failed to update lesson content',
       
    });
  }
});


// for retrieving the content :GET /lesson/:id/content
/**
 * @swagger
 * /lesson/{id}/content:
 *   get:
 *     summary: Get lesson content
 *     description: Retrieves lesson content in JSON, HTML, or both formats
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the lesson
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, html, both]
 *           default: both
 *         description: Content format to return (json, html, or both)
 *     responses:
 *       200:
 *         description: Lesson content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/JsonContentResponse'
 *                 - $ref: '#/components/schemas/HtmlContentResponse'
 *                 - $ref: '#/components/schemas/CombinedContentResponse'
 *       404:
 *         description: Lesson not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Lesson not found"
 *       500:
 *         description: Failed to retrieve content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to retrieve content"
 *
 * components:
 *   schemas:
 *     JsonContentResponse:
 *       type: object
 *       properties:
 *         content:
 *           type: object
 *           nullable: true
 *           description: Raw JSON content from editor
 *           example: {"type":"doc","content":[{"type":"paragraph"}]}
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *
 *     HtmlContentResponse:
 *       type: object
 *       properties:
 *         html:
 *           type: string
 *           description: Rendered HTML content
 *           example: "<p>Lesson content</p>"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *
 *     CombinedContentResponse:
 *       type: object
 *       properties:
 *         content:
 *           type: object
 *           nullable: true
 *           description: Raw JSON content from editor
 *         html:
 *           type: string
 *           description: Rendered HTML content
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
router.get('/:id/content',authenticateToken, async (req, res): Promise<any> => {
  const { id } = req.params;
  const { format = 'both' } = req.query; // Optional format parameter

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { 
        content: true,
        html: true,
        updatedAt: true
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Handle different format requests
    switch (format) {
      case 'json':
        return res.json({
          content: lesson.content || null,
          updatedAt: lesson.updatedAt
        });

      case 'html':
        return res.json({
          html: lesson.html || '<p>No content available</p>',
          updatedAt: lesson.updatedAt
        });

      default: // 'both'
        return res.json({
          content: lesson.content || null,
          html: lesson.html ||  '<p>No content available</p>',
          updatedAt: lesson.updatedAt
        });
    }
  } catch (error) {
    console.error('Error fetching content:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve content',
      
    });
  }
});


  module.exports =router 