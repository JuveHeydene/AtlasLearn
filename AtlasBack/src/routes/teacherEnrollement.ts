import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { title } from "process";
import {authenticateToken} from "../Middlewares/auth.middleware"
import { isCourseOwner, isCourseTeacher } from "../Middlewares/isCourseTeacher";
const prisma = new PrismaClient();

const router = express.Router();


//add teacher in enrollement table 
/**
 * @swagger
 * /teachercourseenrollement/enrollments/teacher:
 *   post:
 *     summary: Enroll a teacher in a course
 *     description: Creates a new teacher enrollment with specified role (AUDITOR by default)
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teacherId, courseId]
 *             properties:
 *               teacherId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               courseId:
 *                 type: string
 *                 example: "6624b5a3e71a1a9d4a8b9b7a"
 *               role:
 *                 type: string
 *                 enum: [AUDITOR, TA, STUDENT]
 *                 default: AUDITOR
 *     responses:
 *       201:
 *         description: Enrollment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeacherEnrollment'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Teacher or course not found
 *       409:
 *         description: Already enrolled
 *       500:
 *         description: Server error
 */
router.post('/enrollments/teacher', authenticateToken, async (req: Request, res: Response):Promise<any> => {
  const { teacherId, courseId, role = 'AUDITOR' } = req.body;

  try {
    // Validate input
    if (!teacherId || !courseId) {
      return res.status(400).json({ error: 'teacherId and courseId are required' });
    }

    // Verify teacher exists and is actually a teacher
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId, role: 'TEACHER' }
    });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check for existing enrollment
    const existingEnrollment = await prisma.teacherCourseEnrollment.findUnique({
      where: {
        teacherId_courseId: {
          teacherId,
          courseId
        }
      }
    });
    if (existingEnrollment) {
      return res.status(409).json({ error: 'Teacher already enrolled in this course' });
    }

    // Create enrollment
    const enrollment = await prisma.teacherCourseEnrollment.create({
      data: {
        teacherId,
        courseId,
        role
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
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
    console.error('Error creating teacher enrollment:', error);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});


//get courses of a teacher in the enroll table
/**
 * @swagger
 * /teachercourseenrollement/course/enrolled-teacher-courses/{teacherId}:
 *   get:
 *     summary: Get all courses a teacher is enrolled in
 *     description: Returns courses where the teacher is enrolled (as AUDITOR, TA, etc.)
 *     tags:
 *       - Courses
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         description: MongoDB ObjectId of the teacher
 *     responses:
 *       200:
 *         description: List of enrolled course objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       400:
 *         description: Invalid request (missing teacherId)
 *       404:
 *         description: Teacher not found
 *       500:
 *         description: Server error
 */
router.get('/enrolled-teacher-courses/:teacherId', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
      const { teacherId } = req.params;
  
      if (!teacherId) {
        return res.status(400).json({ error: 'Teacher ID is required' });
      }
  
      // Verify teacher exists
      const teacherExists = await prisma.user.findUnique({
        where: { id: teacherId, role: 'TEACHER' }
      });
      
      if (!teacherExists) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
  
      // Get enrollments with course data
      const enrollments = await prisma.teacherCourseEnrollment.findMany({
        where: { teacherId },
        include: {
          course: true // Include full course data
        },
        orderBy: {
          enrolledAt: 'desc'
        }
      });
  
      // Extract and return just the course objects
      const courses = enrollments.map(enrollment => enrollment.course);
  
      res.status(200).json(courses);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      res.status(500).json({ error: 'Failed to fetch enrolled courses' });
    }
  });

//delete a teacher in the enrol table
  /**
 * @swagger
 * /teachercourseenrollement/enrollments/teacher/{teacherId}/{courseId}:
 *   delete:
 *     summary: Remove a teacher's enrollment from a course
 *     description: Deletes a specific teacher-course enrollment record
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         description: ID of the teacher
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           example: "6624b5a3e71a1a9d4a8b9b7a"
 *         description: ID of the course
 *     responses:
 *       200:
 *         description: Enrollment successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Enrollment deleted successfully"
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Server error
 */
router.delete('/enrollments/delete-teacher/:teacherId/:courseId', authenticateToken,isCourseOwner, async (req: Request, res: Response):Promise<any> => {
  const { teacherId, courseId } = req.params;

  try {
    // Validate input
    if (!teacherId || !courseId) {
      return res.status(400).json({ error: 'Both teacherId and courseId are required' });
    }

    // Check if enrollment exists
    const enrollment = await prisma.teacherCourseEnrollment.findUnique({
      where: {
        teacherId_courseId: {
          teacherId,
          courseId
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Delete the enrollment
    await prisma.teacherCourseEnrollment.delete({
      where: {
        teacherId_courseId: {
          teacherId,
          courseId
        }
      }
    });

    res.status(200).json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher enrollment:', error);
    res.status(500).json({ error: 'Failed to delete enrollment' });
  }
});


//get users added in the enroll table for a course
/**
 * @swagger
 * /teachercourseenrollement/teachers-enrol/{courseId}:
 *   get:
 *     summary: Get all teachers enrolled in a course (excluding the owner)
 *     description: Retrieves a list of all teachers (TAs and Auditors) enrolled in a specific course
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           example: "6624b5a3e71a1a9d4a8b9b7a"
 *         description: ID of the course
 *     responses:
 *       200:
 *         description: List of teachers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Enrollment ID
 *                   teacherId:
 *                     type: string
 *                     description: ID of the teacher
 *                   courseId:
 *                     type: string
 *                     description: ID of the course
 *                   role:
 *                     type: string
 *                     enum: [TA, AUDITOR]
 *                     description: Role of the teacher in the course
 *                   enrolledAt:
 *                     type: string
 *                     format: date-time
 *                     description: When the teacher was enrolled
 *                   teacher:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Teacher's user ID
 *                       firstName:
 *                         type: string
 *                         description: Teacher's first name
 *                       lastName:
 *                         type: string
 *                         description: Teacher's last name
 *                       email:
 *                         type: string
 *                         description: Teacher's email address
 *       400:
 *         description: Invalid course ID
 *       404:
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.get('/teachers-enrol/:courseId', async (req:Request, res:Response):Promise<any> => {
  const {courseId}=req.params
  
  try {
    
    const teachers = await prisma.teacherCourseEnrollment.findMany({
      where: {
        courseId: courseId,
        role: { in: ['TA', 'AUDITOR'] } // Only get co-teachers, not owner
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


  module.exports =router 