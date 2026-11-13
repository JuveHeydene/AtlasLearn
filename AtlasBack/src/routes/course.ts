import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { title } from "process";
import {authenticateToken} from "../Middlewares/auth.middleware"
const prisma = new PrismaClient();

const router = express.Router();




//create a course 
/**
 * @swagger
 * /course/create-courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCourseInput'
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 *
 * @swagger
 * components:
 *   schemas:
 *     CreateCourseInput:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - teacherId
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the course
 *           example: "Computer Science"
 *         description:
 *           type: string
 *           description: Description of the course
 *           example: "Fundamentals of programming and algorithms"
 *         teacherId:
 *           type: string
 *           description: ID of the teacher creating the course
 *           example: "507f1f77bcf86cd799439011"
 * 
 *     Course:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated course ID
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         teacherId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "507f1f77bcf86cd799439012"
 *         title: "Introduction to Computer Science"
 *         description: "Fundamentals of programming and algorithms"
 *         teacherId: "67e14228f636b51dc21067c7"
 *         createdAt: "2023-08-01T12:00:00Z"
 *         updatedAt: "2023-08-01T12:00:00Z"
 */
router.post('/create-courses',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { title, description, teacherId } = req.body;
  
    try {
      // Validate required fields
      if (!title || !description || !teacherId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const userExist = await prisma.user.findUnique({
        where: { id: teacherId }
      });

      if(!userExist){
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Create the course
      const course = await prisma.course.create({
        data: {
          title,
          description,
          teacherId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
  
      res.status(201).json(course);
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({ error: 'Failed to create course the course title or course name may have been taken. ' });
    }
  });



  //route to get a unique course Info 
/**
 * @swagger
 * /course/getcourse-only/{courseId}:
 *   get:
 *     summary: Get basic course information with teacher details
 *     description: Returns flattened course data including teacher information
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course to retrieve
 *     responses:
 *       200:
 *         description: Course details with teacher information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlattenedCourse'
 *       404:
 *         description: Course not found
 *       500:
 *         description: Failed to fetch course
 * 
 * components:
 *   schemas:
 *     FlattenedCourse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier of the course
 *         title:
 *           type: string
 *           description: Title of the course
 *         description:
 *           type: string
 *           description: Description of the course
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when the course was created
 *         teacherFirstname:
 *           type: string
 *           description: First name of the course teacher
 *         teacherLastname:
 *           type: string
 *           description: Last name of the course teacher
 *         teacherPicture:
 *           type: string
 *           nullable: true
 *           description: URL of the teacher's profile picture
 *       example:
 *         id: "507f1f77bcf86cd799439011"
 *         title: "Introduction to Computer Science"
 *         description: "Basic concepts of programming and algorithms"
 *         createdAt: "2023-01-15T09:30:00Z"
 *         teacherFirstname: "John"
 *         teacherLastname: "Doe"
 *         teacherPicture: "https://example.com/profile.jpg"
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
  router.get('/getcourse-only/:courseId',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    try {
      const { courseId } = req.params;
      

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          teacher:{
            select:{
              firstName:true,
              lastName:true,
              profilePicture:true,
            }
          },
        }
      });
  
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const flatterndata={
        id: course.id,
        title: course.title,
        description: course.description,
        createdAt:course.createdAt,
        teacherFirstname:course.teacher.firstName,
        teacherLastname:course.teacher.lastName,
        teacherPicture:course.teacher.profilePicture,

      }

      res.status(200).json(flatterndata);
    } catch (error) {
      console.error('Error fetching course:', error);
      res.status(500).json({ 
        error: 'Failed to fetch course',
      });
    }
  });


//route to get a unique course Info with the progress of a particular user in each course
/**
 * @swagger
 * /course/getcourse/{courseId}:
 *   get:
 *     summary: Get course details with teacher information and user progress
 *     description: Returns course data including teacher details and optionally the requesting user's progress status
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course to retrieve
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID of the user to fetch progress for (optional)
 *     responses:
 *       200:
 *         description: Course details with teacher information and user progress
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EnhancedCourse'
 *       404:
 *         description: Course not found
 *       500:
 *         description: Failed to fetch course
 * 
 * components:
 *   schemas:
 *     EnhancedCourse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier of the course
 *         title:
 *           type: string
 *           description: Title of the course
 *         description:
 *           type: string
 *           description: Description of the course
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when the course was created
 *         teacherFirstname:
 *           type: string
 *           description: First name of the course teacher
 *         teacherLastname:
 *           type: string
 *           description: Last name of the course teacher
 *         teacherPicture:
 *           type: string
 *           nullable: true
 *           description: URL of the teacher's profile picture
 *         courseprogress:
 *           type: number
 *           nullable: true
 *           description: User's progress percentage (0-100) if userId was provided
 *         coursestatus:
 *           type: string
 *           nullable: true
 *           enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *           description: User's progress status if userId was provided
 *       example:
 *         id: "507f1f77bcf86cd799439011"
 *         title: "Introduction to Computer Science"
 *         description: "Basic concepts of programming and algorithms"
 *         createdAt: "2023-01-15T09:30:00Z"
 *         teacherFirstname: "John"
 *         teacherLastname: "Doe"
 *         teacherPicture: "https://example.com/profile.jpg"
 *         courseprogress: 75
 *         coursestatus: "IN_PROGRESS"
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */  
router.get('/getcourse/:courseId',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    try {
      const { courseId } = req.params;
      const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          teacher:{
            select:{
              firstName:true,
              lastName:true,
              profilePicture:true,

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
  
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const flatterndata={
        id: course.id,
        title: course.title,
        description: course.description,
        createdAt:course.createdAt,
        teacherFirstname:course.teacher.firstName,
        teacherLastname:course.teacher.lastName,
        teacherPicture:course.teacher.profilePicture,
        courseprogress:course.progresses[0].progress,
        coursestatus:course.progresses[0].status,


      }

      res.status(200).json(flatterndata);
    } catch (error) {
      console.error('Error fetching course:', error);
      res.status(500).json({ 
        error: 'Failed to fetch course',
      });
    }
  });



// get all courses from the db
/**
 * @swagger
 * /course/getAll-courses:
 *   get:
 *     summary: Retrieve all courses
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: List of all courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       500:
 *         description: Internal server error
 */
router.get('/getAll-courses',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const courses = await prisma.course.findMany();
    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});




//get All courses where a user is not enrolled
/**
 * @swagger
 * /course/get-unenrolled-courses/{userId}:
 *   get:
 *     summary: Get all courses not enrolled by a specific user
 *     description: Returns a list of published courses that the user hasn't enrolled in, including enrollment counts and chapter counts
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to check enrollments
 *     responses:
 *       200:
 *         description: List of unenrolled courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UnenrolledCourse'
 *       500:
 *         description: Failed to fetch unenrolled courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch unenrolled courses"
 * 
 * components:
 *   schemas:
 *     UnenrolledCourse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         teacherId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [PUBLISHED]
 *         _count:
 *           type: object
 *           properties:
 *             enrollments:
 *               type: integer
 *               description: Total number of enrollments in this course
 *             Chapter:
 *               type: integer
 *               description: Total number of chapters in this course
 *         progresses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CourseProgress'
 *           maxItems: 1
 *           description: User's progress in this course (if any exists)
 * 
 *     CourseProgress:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         courseId:
 *           type: string
 *         status:
 *           $ref: '#/components/schemas/ProgressStatus'
 *         progress:
 *           type: number
 *           description: Completion percentage (0-100)
 *         timeSpent:
 *           type: integer
 *           description: Time spent in seconds
 *         startedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         lastAccessedAt:
 *           type: string
 *           format: date-time
 * 
 *     ProgressStatus:
 *       type: string
 *       enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *       description: The progress status of the course
 * 
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
router.get('/get-unenrolled-courses/:userId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.params;

  try {
    // 1. First get all course IDs where the user IS enrolled
    const enrolledCourses = await prisma.courseEnrollment.findMany({
      where: {
        studentId: userId
      },
      select: {
        courseId: true
      }
    });

    // Extract just the course IDs
    const enrolledCourseIds = enrolledCourses.map(enrollment => enrollment.courseId);

    // 2. Get all courses EXCEPT those the user is enrolled in
    const unenrolledCourses = await prisma.course.findMany({
      where: {
        id: {
          notIn: enrolledCourseIds
        },
        status:"PUBLISHED"
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            Chapter: true
          }
        },
        progresses: {
          where: {
            userId: userId
          },
          take: 1 // Only get one progress record per course
        }
      }
    });


    res.status(200).json(unenrolledCourses);
  } catch (error) {
    console.error('Error fetching unenrolled courses:', error);
    res.status(500).json({ error: 'Failed to fetch unenrolled courses' });
  }
});





//get teacher courses from db 

/**
 * @swagger
 * /course/teacher-courses/{teacherId}:
 *   get:
 *     summary: Get all courses created by a specific teacher
 *     description: Returns the full course objects (without relations) for a given teacher ID
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
 *         description: List of course objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       400:
 *         description: Invalid request (missing teacherId)
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "6624b5a3e71a1a9d4a8b9b7a"
 *         title:
 *           type: string
 *           example: "Advanced Mathematics"
 *         description:
 *           type: string
 *           example: "Course covering advanced topics"
 *         teacherId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
router.get('/teacher-courses/:userId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;

    // Basic validation
    if (!userId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    const courses = await prisma.course.findMany({
      where: {
        teacherId: userId
      },orderBy:{createdAt:"desc"}
    });

    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    res.status(500).json({ error: 'Failed to fetch teacher courses' });
  }
});

//delete a course 
/**
 * @swagger
 * /course/delete-courses/{id}:
 *   delete:
 *     summary: Delete a course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */

router.delete('/delete-courses/:id',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    await prisma.course.delete({
      where: { id }
    });
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Course not found' });
      } else {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database operation failed' });
      }
    } else {
      console.error('Unknown error:', error);
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});


//update a course 
/**
 * @swagger
 * /course/update-courses/{id}:
 *   put:
 *     summary: Update a course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCourseInput'
 *     responses:
 *       200:
 *         description: Course updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     UpdateCourseInput:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Updated title of the course
 *           example: "Advanced Computer Science"
 *         description:
 *           type: string
 *           description: Updated description of the course
 *           example: "Advanced programming concepts"
 */
router.put('/update-courses/:id',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { title, description } = req.body;

  try {
    const updatedCourse = await prisma.course.update({
      where: { id },
      data: { title, description, updatedAt: new Date() }
    });
    res.status(200).json(updatedCourse);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Course not found' });
    }
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});


//update a course status
 /**
 * @swagger
 * /course/update-course-status/{id}:
 *   put:
 *     summary: Update a course's status
 *     description: Updates the status of a course (DRAFT, PUBLISHED, CLOSED) and sets the updatedAt timestamp
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/QuizStatus'
 *     responses:
 *       200:
 *         description: Course status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Course not found
 *       500:
 *         description: Failed to update course status
 * 
 * components:
 *   schemas:
 *     QuizStatus:
 *       type: string
 *       enum: [DRAFT, PUBLISHED, CLOSED]
 *       default: DRAFT
 *       description: Status of the course
 *       example: PUBLISHED
 * 
 *     Course:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         teacherId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         status:
 *           $ref: '#/components/schemas/QuizStatus'
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.put('/update-course-status/:id',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const {  status } = req.body;

  try {
    const updatedCourse = await prisma.course.update({
      where: { id },
      data: { status,  updatedAt: new Date() }
    });
    res.status(200).json(updatedCourse);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Course not found' });
    }
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});



//get the teacher courses last 3 informations 
/**
 * @swagger
 * /course/teacher-courses-threeinfo/{userId}:
 *   get:
 *     summary: Get teacher's course summary information
 *     description: Returns the total course count and details of the last 3 courses including chapter, lesson, and assignment counts
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the teacher
 *     responses:
 *       200:
 *         description: Teacher course information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeacherCoursesSummary'
 *       400:
 *         description: Missing teacher ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Teacher ID is required"
 *       500:
 *         description: Failed to fetch teacher courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch teacher courses"
 * 
 * components:
 *   schemas:
 *     TeacherCoursesSummary:
 *       type: object
 *       properties:
 *         totalCourses:
 *           type: integer
 *           description: Total number of courses created by the teacher
 *           example: 5
 *         lastCourses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CourseSummary'
 *           maxItems: 3
 *           description: Last 3 courses created with detailed counts
 * 
 *     CourseSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         chapterCount:
 *           type: integer
 *           description: Number of chapters in the course
 *         lessonCount:
 *           type: integer
 *           description: Number of lessons across all chapters
 *         assignmentCount:
 *           type: integer
 *           description: Number of assignments in the course
 * 
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
router.get('/teacher-courses-threeinfo/:userId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;

    // Basic validation
    if (!userId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    // Get the total number of courses the teacher has created
    const totalCourses = await prisma.course.count({
      where: {
        teacherId: userId
      }
    });

    // Get the last 3 courses with their counts
    const courses = await prisma.course.findMany({
      where: {
        teacherId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3,
      include: {
        _count: {
          select: {
            Chapter: true,
            Assignment: true
          }
        },
        Chapter: {
          select: {
            _count: {
              select: {
                lessons: true
              }
            }
          }
        }
      }
    });

    // Format the response to include lesson counts
    const formattedCourses = courses.map(course => ({
      ...course,
      lessonCount: course.Chapter.reduce((sum, chapter) => sum + chapter._count.lessons, 0)
    }));

    res.status(200).json({
      totalCourses,
      lastCourses: formattedCourses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        createdAt: course.createdAt,
        chapterCount: course._count.Chapter,
        lessonCount: course.lessonCount,
        assignmentCount: course._count.Assignment
      }))
    });
  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    res.status(500).json({ error: 'Failed to fetch teacher courses' });
  }
});



//route to get student last 3 coursed enrolled
/**
 * @swagger
 * /course/student-courses-threeinfo/{userId}:
 *   get:
 *     summary: Get student's most recent enrolled courses information
 *     description: Returns details of the last 3 courses enrolled by the student including chapter, lesson, and assignment counts
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the student
 *     responses:
 *       200:
 *         description: Student course information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 formattedCourses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StudentCourseSummary'
 *                   maxItems: 3
 *                   description: Last 3 enrolled courses with detailed counts
 *       400:
 *         description: Missing student ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Student ID is required"
 *       500:
 *         description: Failed to fetch student courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch student courses"
 * 
 * components:
 *   schemas:
 *     StudentCourseSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Course ID
 *         title:
 *           type: string
 *           description: Course title
 *         description:
 *           type: string
 *           description: Course description
 *         enrolledAt:
 *           type: string
 *           format: date-time
 *           description: When the student enrolled in the course
 *         chapterCount:
 *           type: integer
 *           description: Number of chapters in the course
 *         lessonCount:
 *           type: integer
 *           description: Total number of lessons across all chapters
 *         assignmentCount:
 *           type: integer
 *           description: Number of assignments in the course
 * 
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
router.get('/student-courses-threeinfo/:userId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
  
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Student ID is required' });
        
    }

    const enrolledCourses = await prisma.courseEnrollment.findMany({
      where: {
        studentId: userId
      },
      orderBy: {
        enrolledAt: 'desc' // Get most recent enrollments first
      },
      take: 3, // Limit to 3 courses
      include: {
        course: {
          include: {
            _count: {
              select: {
                Chapter: true,
                Assignment: true
              }
            },
            Chapter: {
              select: {
                _count: {
                  select: {
                    lessons: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Format the response
    const formattedCourses = enrolledCourses.map(enrollment => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      enrolledAt: enrollment.enrolledAt,
      chapterCount: enrollment.course._count.Chapter,
      lessonCount: enrollment.course.Chapter.reduce(
        (sum, chapter) => sum + chapter._count.lessons, 0
      ),
      assignmentCount: enrollment.course._count.Assignment
    }))

    return res.status(200).json({formattedCourses})

  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    res.status(500).json({ error: 'Failed to fetch teacher courses' });
  }
})

module.exports =router 