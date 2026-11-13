import express,{ Router } from "express";
import { Request, Response } from "express";
import { fileType, PrismaClient } from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";
import { socketService } from '../Services/socket.service';
const prisma = new PrismaClient();

const router = express.Router();

/**
 * @swagger
 * /create-assignments:
 *   post:
 *     summary: Create a new assignment
 *     tags: [Assignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssignmentInput'
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssignmentWithDetails'
 *       400:
 *         description: Missing required fields or invalid data
 *       404:
 *         description: Course not found (or chapter/lesson not found when provided)
 *       500:
 *         description: Internal server error
 */
router.post('/create-assignments',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { title, description, dueDate, courseId, chapterId, lessonId, createdBy, maxScore, fileUrl } = req.body;
  
    try {
      // Validate required fields
      if (!title || !courseId || !createdBy || !dueDate) {
        return res.status(400).json({ 
          error: 'title, courseId, createdBy, and dueDate are required' 
        });
      }
  
      // Verify course exists
      const courseExists = await prisma.course.findUnique({
        where: { id: courseId }
      });
      if (!courseExists) {
        return res.status(404).json({ error: 'Course not found' });
      }
  
      // Only verify chapter if provided
      if (chapterId) {
        const chapterExists = await prisma.chapter.findUnique({
          where: { id: chapterId }
        });
        if (!chapterExists) {
          return res.status(404).json({ error: 'Chapter not found' });
        }
      }
  
      // Only verify lesson if provided
      if (lessonId) {
        const lessonExists = await prisma.lesson.findUnique({
          where: { id: lessonId }
        });
        if (!lessonExists) {
          return res.status(404).json({ error: 'Lesson not found' });
        }
      }

      const maxScoreInt=parseInt(maxScore, 10) 
  
      // Prepare data object with only provided fields
      const assignmentData = {
        title,
        description,
        dueDate: new Date(dueDate),
        courseId,
        createdBy,
        maxScore: maxScoreInt || 100,
        ...(chapterId && { chapterId }), 
        ...(lessonId && { lessonId }),   
        ...(fileUrl && { fileUrl })      
      };
  
      // Create assignment
      const assignment = await prisma.assignment.create({
        data: assignmentData,
        include: {
          course: {
            select: {
              title: true
            }
          },
          chapter: {
            select: {
              title: true,
              order:true
            }
          },
          lesson: {
            select: {
              title: true
            }
          },
          creator: {
            select: {
              firstName: true,
              lastName:true,
              email: true
            }
          },
          _count: {
            select: {
              submissions: true
            }
          }
        }
      });
        // Find all enrolled students in the course
        const enrollments = await prisma.courseEnrollment.findMany({
          where: {
              courseId: courseId,
              role: 'STUDENT' // Only notify students, not TAs or auditors
          },
          select: {
              studentId: true
          }
      });

      // Create notifications for each student
      if (enrollments.length > 0) {
          const notificationTitle = `New Assignment: ${title}`;
          const notificationMessage = `A new assignment "${title}" has been posted in the Course ${assignment.course.title} In chapter${assignment.chapter?.order}:${assignment.chapter?.title}. Due ${new Date(dueDate).toLocaleDateString()}`;
          
          const notificationPromises = enrollments.map(enrollment => 
              prisma.notification.create({
                  data: {
                      creatorId:createdBy,
                      studentId: enrollment.studentId,
                      courseId: courseId,
                      chapterId:chapterId,
                      title: notificationTitle,
                      message: notificationMessage
                  }
              })
          );

          await Promise.all(notificationPromises);
    // Broadcast to all connected clients
  socketService.broadcastEvent('new_notification_broadcast', {
    notifications: "Notification sent"
  });
      }
      
  
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ error: 'Failed to create assignment' });
    }
  });


  //get all assignments in a course 
/**
 * @swagger
 * /courses/{courseId}/assignments:
 *   get:
 *     summary: Get all assignments in a course
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course
 *     responses:
 *       200:
 *         description: List of assignments in the course
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AssignmentWithDetails'
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.get('/courses/:courseId/assignments',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { courseId } = req.params;
  
    try {
      // Verify course exists
      const courseExists = await prisma.course.findUnique({
        where: { id: courseId }
      });
      if (!courseExists) {
        return res.status(404).json({ error: 'Course not found' });
      }
  
      // Get assignments
      const assignments = await prisma.assignment.findMany({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              title: true
            }
          },
          chapter: {
            select: {
              title: true
            }
          },
          lesson: {
            select: {
              title: true
            }
          },
          creator: {
            select: {
              firstName: true,
              lastName:true,
              email: true
            }
          },
          _count: {
            select: {
              submissions: true
            }
          }
        }
      });
  
      res.status(200).json(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  });


//get all assignments inside a chapter
/**
 * @swagger
 * /assignment/chapters/{chapterId}/assignments:
 *   get:
 *     summary: Get all assignments for a specific chapter
 *     description: Returns a list of assignments for the chapter, ordered by due date, with related course, chapter, lesson, and creator information
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the chapter
 *     responses:
 *       200:
 *         description: List of chapter assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChapterAssignment'
 *       404:
 *         description: Chapter not found
 *       500:
 *         description: Failed to fetch assignments
 * 
 * components:
 *   schemas:
 *     ChapterAssignment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date-time
 *         courseId:
 *           type: string
 *         chapterId:
 *           type: string
 *         lessonId:
 *           type: string
 *           nullable: true
 *         createdBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         maxScore:
 *           type: number
 *         fileUrl:
 *           type: string
 *           nullable: true
 *         fileName:
 *           type: string
 *           nullable: true
 *         filetype:
 *           type: string
 *           nullable: true
 *         course:
 *           $ref: '#/components/schemas/AssignmentCourse'
 *         chapter:
 *           $ref: '#/components/schemas/AssignmentChapter'
 *         lesson:
 *           $ref: '#/components/schemas/AssignmentLesson'
 *         creator:
 *           $ref: '#/components/schemas/AssignmentCreator'
 *         _count:
 *           $ref: '#/components/schemas/SubmissionCount'
 * 
 *     AssignmentCourse:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 * 
 *     AssignmentChapter:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 * 
 *     AssignmentLesson:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           nullable: true
 * 
 *     AssignmentCreator:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 * 
 *     SubmissionCount:
 *       type: object
 *       properties:
 *         submissions:
 *           type: integer
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
  router.get('/chapters/:chapterId/assignments',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { chapterId } = req.params;
  
    try {
      // Verify course exists
      const chapterExists = await prisma.chapter.findUnique({
        where: { id: chapterId }
      });
      if (!chapterExists) {
        return res.status(404).json({ error: 'Chapter not found' });
      }
  
      // Get assignments
      const assignments = await prisma.assignment.findMany({
        where: { chapterId },
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              title: true
            }
          },
          chapter: {
            select: {
              title: true
            }
          },
          lesson: {
            select: {
              title: true
            }
          },
          creator: {
            select: {
              firstName: true,
              lastName:true,
              email: true
            }
          },
          _count: {
            select: {
              submissions: true
            }
          }
        }
      });
  
      res.status(200).json(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  });


//get all assignment in chapter + a user submision
/**
 * @swagger
 * /assignment/chapters/{chapterId}/assignment/{studentId}:
 *   get:
 *     summary: Get chapter assignments with student's submission details
 *     description: Returns all assignments for a chapter including the specified student's submission (if exists), ordered by due date
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the chapter
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the student
 *     responses:
 *       200:
 *         description: List of chapter assignments with student submission data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FlattenedAssignment'
 *       404:
 *         description: Chapter or student not found
 *       500:
 *         description: Failed to fetch assignments
 * 
 * components:
 *   schemas:
 *     FlattenedAssignment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date-time
 *         maxScore:
 *           type: number
 *         fileType:
 *           type: string
 *           nullable: true
 *         fileName:
 *           type: string
 *           nullable: true
 *         fileUrl:
 *           type: string
 *           nullable: true
 *         courseTitle:
 *           type: string
 *         chapterTitle:
 *           type: string
 *         creatorName:
 *           type: string
 *         creatorEmail:
 *           type: string
 *         submissionCount:
 *           type: integer
 *         submission:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *             fileUrl:
 *               type: string
 *               nullable: true
 *             fileName:
 *               type: string
 *               nullable: true
 *             filetype:
 *               type: string
 *               nullable: true
 *             submittedAt:
 *               type: string
 *               format: date-time
 *             grade:
 *               type: number
 *               nullable: true
 *             status:
 *               $ref: '#/components/schemas/AssignmentStatus'
 *             feedback:
 *               type: string
 *               nullable: true
 * 
 *     AssignmentStatus:
 *       type: string
 *       enum: [GRADED, SUBMITTED, NOTSUBMITTED]
 *       default: NOTSUBMITTED
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.get('/chapters/:chapterId/assignment/:studentId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { chapterId, studentId } = req.params;

  try {
      // Verify chapter exists
      const chapterExists = await prisma.chapter.findUnique({
          where: { id: chapterId }
      });
      if (!chapterExists) {
          return res.status(404).json({ error: 'Chapter not found' });
      }

      // Verify student exists
      const studentExists = await prisma.user.findUnique({
          where: { id: studentId }
      });
      if (!studentExists) {
          return res.status(404).json({ error: 'Student not found' });
      }
      const assignments = await prisma.assignment.findMany({
        where: { chapterId },
        orderBy: { createdAt: 'desc' },
        include: {
            course: { select: { title: true } },
            chapter: { select: { title: true } },
            lesson: { select: { title: true } },
            creator: { select: { firstName: true, lastName: true, email: true } },
            _count: { select: { submissions: true } },
            submissions: {
                where: { studentId },
                select: {
                    id: true,
                    fileUrl: true,
                    fileName: true,
                    filetype: true,
                    submittedAt: true,
                    grade: true,
                    status: true,
                    feedback: true
                },
                take: 1
            }
        }
    });

   
    interface Submission {
      id: string
      fileUrl: string
      fileName: string
      filetype: string
      submittedAt: string
      grade: number | null
      status: string
      feedback: string | null
    }
    
   
    
    const flattenedAssignments: any = assignments.map((assignment) => {
      // Handle potential undefined values safely
      const courseTitle = assignment.course?.title ?? 'Unknown Course'
      const chapterTitle = assignment.chapter?.title ?? 'Unknown Chapter'
      const creatorName = assignment.creator 
        ? `${assignment.creator.firstName} ${assignment.creator.lastName}` 
        : 'Unknown Creator'
      const creatorEmail = assignment.creator?.email ?? ''
    
      return {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        maxScore: assignment.maxScore,
        fileType:assignment.filetype,
        fileName:assignment.fileName,
        fileUrl:assignment.fileUrl,
        courseTitle,
        chapterTitle,
        creatorName,
        creatorEmail,
        submissionCount: assignment._count?.submissions ?? 0,
        submission: assignment.submissions?.[0] ? {
          id: assignment.submissions[0].id,
          fileUrl: assignment.submissions[0].fileUrl,
          fileName: assignment.submissions[0].fileName,
          filetype: assignment.submissions[0].filetype,
          submittedAt: assignment.submissions[0].submittedAt,
          grade: assignment.submissions[0].grade,
          status: assignment.submissions[0].status,
          feedback: assignment.submissions[0].feedback
        } : undefined
      }
    })

    res.status(200).json(flattenedAssignments);
} catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
}
      
  
});

/**
 * @swagger
 * /assignment/update-assignment/{id}:
 *   put:
 *     summary: Update an assignment
 *     description: Updates assignment details including title, description, due date, max score, and file information
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignmentUpdateInput'
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdatedAssignment'
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Failed to update assignment
 * 
 * components:
 *   schemas:
 *     AssignmentUpdateInput:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: New title for the assignment
 *           example: "Updated Essay Assignment"
 *         description:
 *           type: string
 *           description: New description for the assignment
 *           example: "Write a 1000-word essay on modern history"
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: New due date for the assignment
 *           example: "2023-12-31T23:59:59Z"
 *         maxScore:
 *           type: number
 *           description: New maximum score for the assignment
 *           example: 100
 *         fileUrl:
 *           type: string
 *           description: New file URL for assignment resources
 *           example: "https://example.com/files/assignment.pdf"
 *         fileName:
 *           type: string
 *           description: New file name
 *           example: "assignment.pdf"
 *         filetype:
 *           type: string
 *           description: New file type
 *           example: "PDF"
 * 
 *     UpdatedAssignment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date-time
 *         courseId:
 *           type: string
 *         chapterId:
 *           type: string
 *         lessonId:
 *           type: string
 *           nullable: true
 *         createdBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         maxScore:
 *           type: number
 *         fileUrl:
 *           type: string
 *           nullable: true
 *         fileName:
 *           type: string
 *           nullable: true
 *         filetype:
 *           type: string
 *           nullable: true
 *         course:
 *           $ref: '#/components/schemas/AssignmentCourse'
 *         chapter:
 *           $ref: '#/components/schemas/AssignmentChapter'
 *         lesson:
 *           $ref: '#/components/schemas/AssignmentLesson'
 *         creator:
 *           $ref: '#/components/schemas/AssignmentCreator'
 *         _count:
 *           $ref: '#/components/schemas/SubmissionCount'
 * 
 *     AssignmentCourse:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 * 
 *     AssignmentChapter:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 * 
 *     AssignmentLesson:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           nullable: true
 * 
 *     AssignmentCreator:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 * 
 *     SubmissionCount:
 *       type: object
 *       properties:
 *         submissions:
 *           type: integer
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
  router.put('/update-assignment/:id',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { 
        title, 
        description, 
        dueDate, 
        maxScore,
        fileUrl, 
        fileName, 
        filetype 
    } = req.body;

    try {
        // Validate assignment exists
        const existingAssignment = await prisma.assignment.findUnique({
            where: { id }
        });

        if (!existingAssignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        // Prepare update data
        const updateData: {
            title?: string;
            description?: string;
            dueDate?: Date;
            maxScore?: number;
            fileUrl?: string;
            fileName?: string;
            filetype?: string;
            updatedAt?: Date;
        } = { 
            updatedAt: new Date() 
        };

        // Add fields to update if they're provided
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (dueDate) updateData.dueDate = new Date(dueDate);
        if (maxScore) updateData.maxScore = parseInt(maxScore, 10);
        if (fileUrl) updateData.fileUrl = fileUrl;
        if (fileName) updateData.fileName = fileName;
        if (filetype) updateData.filetype = filetype;

        // Update the assignment
        const updatedAssignment = await prisma.assignment.update({
            where: { id },
            data: updateData,
            include: {
                course: {
                    select: { title: true }
                },
                chapter: {
                    select: { title: true }
                },
                lesson: {
                    select: { title: true }
                },
                creator: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                _count: {
                    select: { submissions: true }
                }
            }
        });

        res.status(200).json(updatedAssignment);
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({ error: 'Failed to update assignment' });
    }
});


  module.exports =router 