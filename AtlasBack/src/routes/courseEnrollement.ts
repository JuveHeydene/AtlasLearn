import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient,EnrollmentRole } from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";

const prisma = new PrismaClient();
const router = express.Router();


/**
 * @swagger
 * /courseenrollement/create-enrollments:
 *   post:
 *     summary: Create a new course enrollment
 *     description: Enrolls a student in a course with optional role specification
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEnrollmentInput'
 *           example:
 *             studentId: "507f191e810c19729de860ea"
 *             courseId: "507f1f77bcf86cd799439011"
 *             role: "STUDENT"
 *     responses:
 *       201:
 *         description: Enrollment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseEnrollment'
 *       400:
 *         description: Invalid input or duplicate enrollment
 *       404:
 *         description: Student or course not found
 *       500:
 *         description: Server error
 *
 * @swagger
 * components:
 *   schemas:
 *     CreateEnrollmentInput:
 *       type: object
 *       required:
 *         - studentId
 *         - courseId
 *       properties:
 *         studentId:
 *           type: string
 *           description: ID of the student to enroll
 *           example: "507f191e810c19729de860ea"
 *         courseId:
 *           type: string
 *           description: ID of the course to enroll in
 *           example: "507f1f77bcf86cd799439011"
 *         role:
 *           type: string
 *           enum: [STUDENT, TA, AUDITOR]
 *           default: "STUDENT"
 *           description: Enrollment role
 * 
 *     CourseEnrollment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *         studentId:
 *           type: string
 *           example: "507f191e810c19729de860ea"
 *         courseId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         enrolledAt:
 *           type: string
 *           format: date-time
 *           example: "2023-05-20T14:30:00Z"
 *         role:
 *           type: string
 *           example: "STUDENT"
 *         student:
 *           $ref: '#/components/schemas/User'
 *         course:
 *           $ref: '#/components/schemas/Course'
 */
router.post('/create-enrollments',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    try {
      const { studentId, courseId, role } = req.body;
  
      // Validate required fields
      if (!studentId || !courseId) {
        return res.status(400).json({ error: 'studentId and courseId are required' });
      }
  
      // Verify student and course exist
      const [student, course] = await Promise.all([
        prisma.user.findUnique({ where: { id: studentId } }),
        prisma.course.findUnique({ where: { id: courseId } })
      ]);
  
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
  
      // Create enrollment
      const enrollment = await prisma.courseEnrollment.create({
        data: {
          studentId,
          courseId,
          role: role || EnrollmentRole.STUDENT,
          
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          course: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });
  
      res.status(201).json(enrollment);
    } catch (error) {
        if ((error as { code: string }).code === 'P2002') {
            return res.status(400).json({ error: 'Student is already enrolled in this course' });
          }
      console.error('Enrollment error:', error);
      res.status(500).json({ error: 'Failed to create enrollment' });
    }
  });
  


/**
 * @swagger
 * /courseenrollement/courses/{courseId}/enrollments:
 *   get:
 *     summary: Get all enrollments for a course with user details
 *     tags: [CourseEnrollments]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course
 *     responses:
 *       200:
 *         description: List of enrollments with user details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EnrollmentWithUserDetails'
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 *
 * @swagger
 * components:
 *   schemas:
 *     EnrollmentWithUserDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439017"
 *         studentId:
 *           type: string
 *           example: "507f1f77bcf86cd799439015"
 *         courseId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-08-01T12:00:00Z"
 *         role:
 *           type: string
 *           enum: [STUDENT, TA, AUDITOR]
 *           example: "STUDENT"
 *         student:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             firstName:
 *               type: string
 *               example: "John"
 *             lastName:
 *               type: string
 *               example: "Doe"
 *             email:
 *               type: string
 *               example: "john.doe@example.com"
 *             role:
 *               type: string
 *               enum: [STUDENT, INSTRUCTOR, ADMIN]
 *             profilePicture:
 *               type: string
 *               nullable: true
 *               example: "https://example.com/profile.jpg"
 *         course:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *               example: "Introduction to Programming"
 *      
 */
router.get('/courses/:courseId/enrollments',authenticateToken, async (req: Request, res: Response):Promise<any> => {
  const { courseId } = req.params;

  try {
    // Verify course exists
    const courseExists = await prisma.course.findUnique({
      where: { id: courseId }
    });
    if (!courseExists) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get enrollments with user details
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            profilePicture: true,
            status:true,
          }
        },
        course: {
          select: {
            title: true,
          }
        }
      },
      orderBy: {
        student: {
          firstName: 'asc'
        }
      }
    });

    res.status(200).json(enrollments);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});


/**
 * @swagger
 * /courseenrollement/courses/enrolled/{studentId}:
 *   get:
 *     summary: Get all courses a student is enrolled in with content counts
 *     description: Returns all courses for a student including chapter, lesson and quiz counts
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the student
 *     responses:
 *       200:
 *         description: List of enrolled courses with content counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   course:
 *                     $ref: '#/components/schemas/Course'
 *                   chapterCount:
 *                     type: number
 *                     example: 5
 *                   lessonCount:
 *                     type: number
 *                     example: 20
 *                   quizCount:
 *                     type: number
 *                     example: 3
 *       404:
 *         description: Student not found
 *       500:
 *         description: Server error
 */
router.get('/courses/enrolled/:userId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
      const { userId } = req.params;

      // Verify student exists
      const student = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true }
      });

      if (!student) {
          return res.status(404).json({ error: 'Student not found' });
      }

      // Get all enrollments for the student
      const enrollments = await prisma.courseEnrollment.findMany({
          where: { studentId:userId },
          include: {
              course: {
                  select: {
                      id: true,
                      title: true,
                      description: true,
                      createdAt: true,
                      teacher: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                      
                  }
              }
          }
      });

      if (enrollments.length === 0) {
          return res.status(200).json([]);
      }

      // Get counts for each course
      const coursesWithCounts = await Promise.all(
          enrollments.map(async (enrollment) => {
              const [chapterCount, lessonCount, quizCount] = await Promise.all([
                  prisma.chapter.count({
                      where: { courseId: enrollment.courseId }
                  }),
                  prisma.lesson.count({
                      where: {
                          chapter: {
                              courseId: enrollment.courseId
                          }
                      }
                  }),
                  prisma.quiz.count({
                      where: { courseId: enrollment.courseId }
                  })
              ]);

              return {
                  course: enrollment.course,
                  chapterCount,
                  lessonCount,
                  quizCount
              };
          })
      );

      res.status(200).json(coursesWithCounts);
  } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      res.status(500).json({ error: 'Failed to retrieve enrolled courses' });
  }
});


module.exports =router 

