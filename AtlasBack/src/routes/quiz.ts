import express,{ Router } from "express";
import { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { calculateAndUpdateQuizScores } from '../Services/quiz.service';
import { authenticateToken } from "../Middlewares/auth.middleware";
import { toBoolean } from "../utils/functions";
const prisma = new PrismaClient();

const router = express.Router();



//create a quiz

/**
 * @swagger
 * /quiz/create-quizzes:
 *   post:
 *     summary: Create a new quiz
 *     description: Creates a new quiz with the specified parameters
 *     tags: [Quizzes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuizInput'
 *           example:
 *             title: "Programming Basics Quiz"
 *             courseId: "67dbd6952e179dc53bc8fb39"
 *             createdBy: "67dbd6952e179dc53b18fb38"
 *             chapterId: "67dbd6952e179dc53bc8fb40"
 *             duration: 600
 *             status: "DRAFT"
 *             quizcategorie: "FIXED"
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       400:
 *         description: Bad request (missing or invalid fields)
 *       500:
 *         description: Internal server error
 * 
 * components:
 *   schemas:
 *     CreateQuizInput:
 *       type: object
 *       required:
 *         - title
 *         - courseId
 *         - createdBy
 *       properties:
 *         title:
 *           type: string
 *         courseId:
 *           type: string
 *         createdBy:
 *           type: string
 *         chapterId:
 *           type: string
 *           nullable: true
 *         duration:
 *           type: integer
 *           default: 600
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, CLOSED]
 *           default: "DRAFT"
 *         quizcategorie:
 *           type: string
 *           enum: [FIXED, MIXED]
 *           default: "FIXED"
 *     Quiz:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         duration:
 *           type: integer
 *         courseId:
 *           type: string
 *         chapterId:
 *           type: string
 *           nullable: true
 *         createdBy:
 *           type: string
 *         status:
 *           type: string
 *         quizcategorie:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
router.post('/create-quizzes',authenticateToken, async (req: Request, res: Response):Promise<any> => {
  const { title, courseId, createdBy,description, duration, status, quizcategorie, chapterId } = req.body;

  try {
    // Validate required fields
    if (!title  || !createdBy) {
      return res.status(400).json({ error: 'Title and createdBy are required' });
    } 

    // Verify course exists if courseId is provided 
    if(courseId){
      const courseExists = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true }
      });
  
      if (!courseExists) {
        return res.status(404).json({ error: 'Course not found' });
      }
    }
   

    // Create quiz data
    const quizData = {
      title,
      duration: duration || 600, //secondes
      status: status || 'DRAFT',
      quizcategorie: quizcategorie || 'FIXED',
      description:description||'Training Quiz',
      course: { connect: { id: courseId } },
      creator: { connect: { id: createdBy } },
      ...(courseId && { course: { connect: { id: courseId } }}),
      ...(chapterId && { chapter: { connect: { id: chapterId } }})
    };

    const quiz = await prisma.quiz.create({
      data: quizData,
      include: {
        course: { select: { id: true, title: true } },
        creator: { select: { id: true, email: true, firstName:true, lastName:true } },
        ...(chapterId && { chapter: { select: { id: true, title: true }} })
      }
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ 
      error: 'Failed to create quiz',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : String(error)
      }
 )});
  }
});

  //fetch quizes with questions and  options
/**
 * @swagger
 * /quiz/fetch-quizzes/{quizId}:
 *   get:
 *     summary: Fetch a quiz by ID
 *     description: Retrieves detailed information about a specific quiz
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the quiz to fetch
 *         example: "67dd0cd93e61ac8c7e46027e"
 *     responses:
 *       200:
 *         description: Quiz retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizWithDetails'
 *       400:
 *         description: Invalid quiz ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Quiz ID is required"
 *       404:
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Quiz not found"
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     QuizWithDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         duration:
 *           type: integer
 *         courseId:
 *           type: string
 *         createdBy:
 *           type: string
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, CLOSED]
 *         quizcategorie:
 *           type: string
 *           enum: [FIXED, MIXED]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         questions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Question'
 *       example:
 *         id: "67dd0cd93e61ac8c7e46027e"
 *         title: "Programming Basics Quiz"
 *         duration: 600
 *         courseId: "67dbd6952e179dc53bc8fb39"
 *         createdBy: "67dbd6952e179dc53b18fb38"
 *         status: "PUBLISHED"
 *         quizcategorie: "FIXED"
 *         createdAt: "2023-12-01T10:00:00Z"
 *         updatedAt: "2023-12-01T10:00:00Z"
 *         questions:
 *           - id: "67dd53c38341cdddcc4c8bb6"
 *             text: "What is the capital of France?"
 *             questionType: "MCQ"
 *             difficulty: "EASY"
 *             options:
 *               - text: "Paris"
 *                 isCorrect: true
 *               - text: "London"
 *                 isCorrect: false
 * 
 *     Question:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         text:
 *           type: string
 *         questionType:
 *           type: string
 *           enum: [MCQ, TRUE_FALSE, SHORT_ANSWER]
 *         difficulty:
 *           type: string
 *           enum: [EASY, INTERMEDIATE, ADVANCE]
 *         options:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuestionOption'
 * 
 *     QuestionOption:
 *       type: object
 *       properties:
 *         text:
 *           type: string
 *         isCorrect:
 *           type: boolean
 */  
router.get('/fetch-quizzes/:quizId',authenticateToken, async (req: Request, res: Response):Promise<any> => {
  const { quizId } = req.params;

  try {
    // Validate quizId
    if (!quizId) {
      return res.status(400).json({ error: 'Quiz ID is required' });
    }

    // Fetch the quiz with its questions and options
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true, // Include all options for each question
          },
        },
      },
    });

    // If the quiz is not found, return a 404 error
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const questData=quiz.questions.map((question) => ({
      quizId:quiz.id,
      id: question.id,
      text: question.text,
      questionType: question.questionType,
      difficulty: question.difficulty,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    }));
     //this call updates the quiz scores it does it directly onsode the function.
    const { totalScore, passingScore } = await calculateAndUpdateQuizScores(questData,quiz.id);
    // Format the response
    const formattedQuiz = {
      id: quiz.id,
      title: quiz.title,
      courseId: quiz.courseId,
      createdBy: quiz.createdBy,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      status: quiz.status,
      viewAnswers:quiz.viewAnswers,
      totalScore:quiz.totalScore,
      passingScore:quiz.passingScore,
      quizcategorie: quiz.quizcategorie,
      duration: quiz.duration,
      questions: quiz.questions.map((question) => ({
        id: question.id,
        text: question.text,
        questionType: question.questionType,
        fileName:question.fileName,
        fileUrl:question.fileUrl,
        difficulty: question.difficulty,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      })),
    };

    // Return the formatted quiz
    res.status(200).json(formattedQuiz);
  } catch (error) {
    console.error('Error retrieving quiz:', error);
    res.status(500).json({ error: 'Failed to retrieve quiz' });
  }
});

  //fetch quizes only 

/**
 * @swagger
 * /quiz/fetch/quizzesonly/{quizId}:
 *   get:
 *     summary: Fetch basic quiz information (without questions)
 *     description: Retrieves basic information about a specific quiz excluding questions
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           example: "67dd0cd93e61ac8c7e46027e"
 *         description: ID of the quiz to fetch
 *     responses:
 *       200:
 *         description: Quiz retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizBasic'
 *       400:
 *         description: Invalid quiz ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Quiz ID is required"
 *       404:
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Quiz not found"
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     QuizBasic:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         duration:
 *           type: integer
 *         courseId:
 *           type: string
 *         createdBy:
 *           type: string
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, CLOSED]
 *         quizcategorie:
 *           type: string
 *           enum: [FIXED, MIXED]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "67dd0cd93e61ac8c7e46027e"
 *         title: "Programming Basics Quiz"
 *         duration: 600
 *         courseId: "67dbd6952e179dc53bc8fb39"
 *         createdBy: "67dbd6952e179dc53b18fb38"
 *         status: "PUBLISHED"
 *         quizcategorie: "FIXED"
 *         createdAt: "2023-12-01T10:00:00Z"
 *         updatedAt: "2023-12-01T10:00:00Z"
 */  
router.get('/fetch/quizzesonly/:quizId',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { quizId } = req.params;
  
    try {
      // Validate quizId
      if (!quizId) {
        return res.status(400).json({ error: 'Quiz ID is required' });
      }
  
      // Fetch the quiz
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
      });
  
      
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }
  
      res.status(200).json(quiz);
    } catch (error) {
      console.error('Error retrieving quiz:', error);
      res.status(500).json({ error: 'Failed to retrieve quiz' });
    }
  });
//Delete a quiz

/**
 * @swagger
 * /quiz/delete-quizzes/{quizId}:
 *   delete:
 *     summary: Delete a quiz and all related data
 *     description: Permanently deletes a quiz and all its associated questions, answers, and attempts
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           example: "67dd0cd93e61ac8c7e46027e"
 *         description: The ID of the quiz to delete
 *     responses:
 *       200:
 *         description: Quiz deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Quiz deleted successfully"
 *                 deletedQuiz:
 *                   $ref: '#/components/schemas/QuizBasic'
 *       400:
 *         description: Bad request (missing quiz ID)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Quiz ID is required"
 *       404:
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Quiz not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to delete quiz"
 */
router.delete('/delete-quizzes/:quizId',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { quizId } = req.params;
  
    try {
      // Validate quizId
      if (!quizId) {
        return res.status(400).json({ error: 'Quiz ID is required' });
      }
  
      // Delete the quiz and all related records (cascading delete)
      const deletedQuiz = await prisma.quiz.delete({
        where: { id: quizId },
      });
  
      // Return success message
      res.status(200).json({ message: 'Quiz deleted successfully', deletedQuiz });
    } catch (error) {
      console.error('Error deleting quiz:', error);
      res.status(500).json({ error: 'Failed to delete quiz' });
    }
  });


 //Route to update quizzes 
/**
 * @swagger
 * /quiz/update-quizzes/{quizId}:
 *   patch:
 *     summary: Update quiz details
 *     description: Updates specific fields of an existing quiz
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           example: "67dd0cd93e61ac8c7e46027e"
 *         description: The ID of the quiz to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateQuizInput'
 *           example:
 *             title: "Updated Programming Quiz"
 *             status: "PUBLISHED"
 *             duration: 900
 *             quizcategorie: "MIXED"
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizBasic'
 *       400:
 *         description: Bad request (missing or invalid fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Quiz ID is required"
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     UpdateQuizInput:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Updated quiz title
 *           example: "Advanced Programming Quiz"
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, CLOSED]
 *           example: "PUBLISHED"
 *         duration:
 *           type: integer
 *           description: Updated duration in seconds
 *           example: 900
 *         quizcategorie:
 *           type: string
 *           enum: [FIXED, MIXED]
 *           example: "MIXED"
 * 
 *     QuizBasic:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         duration:
 *           type: integer
 *         courseId:
 *           type: string
 *         createdBy:
 *           type: string
 *         status:
 *           type: string
 *         quizcategorie:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "67dd0cd93e61ac8c7e46027e"
 *         title: "Updated Programming Quiz"
 *         duration: 900
 *         courseId: "67dbd6952e179dc53bc8fb39"
 *         createdBy: "67dbd6952e179dc53b18fb38"
 *         status: "PUBLISHED"
 *         quizcategorie: "MIXED"
 *         createdAt: "2023-12-01T10:00:00Z"
 *         updatedAt: "2023-12-15T14:30:00Z"
 */ 
router.patch('/update-quizzes/:quizId',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { quizId } = req.params;
    const { title, status, duration, quizcategorie } = req.body;
  
    try {
      // Validate quizId
      if (!quizId) {
        return res.status(400).json({ error: 'Quiz ID is required' });
      }
  
      // Update the quiz
      const updatedQuiz = await prisma.quiz.update({
        where: { id: quizId },
        data: {
          title,
          status,
          duration,
          quizcategorie,
        },
      });
  
      // Return the updated quiz
      res.status(200).json(updatedQuiz);
    } catch (error) {
      console.error('Error updating quiz:', error);
      res.status(500).json({ error: 'Failed to update quiz' });
    }
  });



  //dynamique update route 
  /**
 * @swagger
 * /quiz/update-quizzes-dynamically/{quizId}:
 *   patch:
 *     summary: Partially update quiz properties
 *     description: Dynamically updates specified fields of a quiz (supports partial updates)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the quiz to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: New title for the quiz
 *                 example: "Updated Quiz Title"
 *               status:
 *                 $ref: '#/components/schemas/QuizStatus'
 *               duration:
 *                 type: integer
 *                 description: Duration in seconds
 *                 example: 900
 *               quizcategorie:
 *                 $ref: '#/components/schemas/QuizType'
 *             anyOf:
 *               - required: [title]
 *               - required: [status]
 *               - required: [duration]
 *               - required: [quizcategorie]
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ErrorQuizIdRequired'
 *                 - $ref: '#/components/schemas/ErrorNoFieldsProvided'
 *       404:
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorQuizNotFound'
 *       500:
 *         description: Failed to update quiz
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorServer'
 * 
 * components:
 *   schemas:
 *     Quiz:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         duration:
 *           type: integer
 *         totalScore:
 *           type: number
 *         passingScore:
 *           type: number
 *         status:
 *           $ref: '#/components/schemas/QuizStatus'
 *         quizcategorie:
 *           $ref: '#/components/schemas/QuizType'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     QuizStatus:
 *       type: string
 *       enum: [DRAFT, PUBLISHED, CLOSED]
 *       description: Status of the quiz
 * 
 *     QuizType:
 *       type: string
 *       enum: [MIXED, FIXED]
 *       description: Type of the quiz
 * 
 *     ErrorQuizIdRequired:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Quiz ID is required"
 * 
 *     ErrorNoFieldsProvided:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "No valid fields provided for update"
 * 
 *     ErrorQuizNotFound:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Quiz not found"
 * 
 *     ErrorServer:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Failed to update quiz"
 *         message:
 *           type: string
 *           example: "Prisma error details"
 * 
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
  router.patch('/update-quizzes-dynamically/:quizId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { quizId } = req.params;
    const { title, status, duration, quizcategorie,viewAnswers } = req.body;
    try {
      // Validate quizId
      if (!quizId) {
        return res.status(400).json({ error: 'Quiz ID is required' });
      }

      // Create dynamic update data object
      const updateData: Record<string, any> = {};
      
      if (title !== undefined) updateData.title = title;
      if (status !== undefined) updateData.status = status;
      if (viewAnswers !== undefined) updateData.viewAnswers = toBoolean(viewAnswers);
      if (duration !== undefined) updateData.duration = duration;
      if (quizcategorie !== undefined) updateData.quizcategorie = quizcategorie;

      // If no valid fields were provided
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
      }

      // Update the quiz with only the provided fields
      const updatedQuiz = await prisma.quiz.update({
        where: { id: quizId },
        data: updateData,
      });
  
      // Return the updated quiz
      res.status(200).json(updatedQuiz);
    } catch (error) {
      console.error('Error updating quiz:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Quiz not found' });
        }
      }
      
      res.status(500).json({ 
        error: 'Failed to update quiz',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } 
});

 //get all quizzes in a course 
/**
 * @swagger
 * /quiz/quizzes/by-course/{courseId}:
 *   get:
 *     summary: Get all quizzes for a specific course
 *     description: Retrieves a list of quizzes belonging to the specified course (only quiz data, no related models)
 *     tags:
 *       - Quizzes
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course to fetch quizzes for
 *     responses:
 *       200:
 *         description: A list of quizzes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QuizBasic'
 *       400:
 *         description: Missing course ID
 *       404:
 *         description: No quizzes found for this course
 *       500:
 *         description: Server error
 *
 * components:
 *   schemas:
 *     QuizBasic:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The quiz ID
 *           example: 507f1f77bcf86cd799439011
 *         title:
 *           type: string
 *           description: The quiz title
 *           example: "Midterm Exam"
 *         duration:
 *           type: integer
 *           description: Duration in seconds
 *           example: 600
 *         totalScore:
 *           type: number
 *           format: float
 *           description: Maximum possible score
 *           example: 100
 *         passingScore:
 *           type: number
 *           format: float
 *           description: Minimum passing score
 *           example: 50
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, CLOSED]
 *           description: Quiz status
 *           example: PUBLISHED
 *         quizcategorie:
 *           type: string
 *           enum: [MIXED, FIXED]
 *           description: Quiz category type
 *           example: FIXED
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2023-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2023-01-01T00:00:00.000Z"
 *         chapterId:
 *           type: string
 *           nullable: true
 *           description: Optional chapter ID
 *           example: 507f1f77bcf86cd799439012
 */
router.get('/quizzes/by-course/:courseId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { courseId } = req.params;
  
    try {
      if (!courseId) {
        res.status(400).json({ error: 'Course ID is required' });
        return;
      }
  
      const quizzes = await prisma.quiz.findMany({
        where: {
          courseId: courseId
        },
        select: {
          id: true,
          title: true,
          duration: true,
          status: true,
          quizcategorie: true,
          createdAt: true,
          updatedAt: true,
          totalScore:true as true
        },
        orderBy: {
          createdAt: 'desc' // Optional: sorts by newest first
        }
      });
  
     
  
      res.status(200).json(quizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      res.status(500).json({ 
        error: 'Failed to fetch quizzes',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error)
        }
    )});
    }
  });


  //get quizzes by course for the student only quizzes that are published 
  /**
 * @swagger
 * /quiz/quizzes-publish/by-course/{courseId}:
 *   get:
 *     summary: Get all published quizzes for a course
 *     description: Returns a list of published quizzes for the specified course, ordered by creation date (newest first)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course to fetch quizzes from
 *     responses:
 *       200:
 *         description: List of published quizzes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PublishedQuiz'
 *       400:
 *         description: Bad request - Course ID is required
 *       500:
 *         description: Failed to fetch quizzes
 * 
 * components:
 *   schemas:
 *     PublishedQuiz:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier of the quiz
 *         title:
 *           type: string
 *           description: Title of the quiz
 *         duration:
 *           type: integer
 *           description: Duration of the quiz in seconds
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, CLOSED]
 *           description: Current status of the quiz
 *           example: PUBLISHED
 *         quizcategorie:
 *           $ref: '#/components/schemas/QuizType'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the quiz was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the quiz was last updated
 *         totalScore:
 *           type: number
 *           description: Maximum possible score for the quiz
 *       example:
 *         id: "507f1f77bcf86cd799439011"
 *         title: "Midterm Exam"
 *         duration: 1800
 *         status: "PUBLISHED"
 *         quizcategorie: "FIXED"
 *         createdAt: "2023-01-15T09:30:00Z"
 *         updatedAt: "2023-01-15T09:30:00Z"
 *         totalScore: 100
 * 
 *     QuizType:
 *       type: string
 *       enum: [MIXED, FIXED]
 *       default: FIXED
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
  router.get('/quizzes-publish/by-course/:courseId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { courseId } = req.params;
  
    try {
      if (!courseId) {
        res.status(400).json({ error: 'Course ID is required' });
        return;
      }
  
      const quizzes = await prisma.quiz.findMany({
        where: {
          courseId: courseId,
          status:"PUBLISHED"
        },
        select: {
          id: true,
          title: true,
          duration: true,
          status: true,
          quizcategorie: true,
          createdAt: true,
          updatedAt: true,
          totalScore:true as true
        },
        orderBy: {
          createdAt: 'desc' // Optional: sorts by newest first
        }
      });
  
     
  
      res.status(200).json(quizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      res.status(500).json({ 
        error: 'Failed to fetch quizzes',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error)
        }
    )});
    }
  });

//calculation of ranking per quiz 
/**
 * @swagger
 * /quiz/quizzes-ranking/:quizId':
 *   get:
 *     summary: Get quiz ranking with tie-breakers
 *     description: Returns ranked list with scores, time taken, submission time, and alphabetical order as tie-breakers
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the quiz
 *     responses:
 *       200:
 *         description: Ranking list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QuizRankingEntry'
 * @swagger
 * components:
 *   schemas:
 *     QuizRankingEntry:
 *       type: object
 *       properties:
 *         rank:
 *           type: integer
 *         studentId:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *         score:
 *           type: number
 *         timeTaken:
 *           type: integer
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         courseTitle:
 *           type: string
 *         totalScore:
 *           type: number
 */
router.get('/quizzes-ranking/:quizId',authenticateToken, async (req: Request, res: Response):Promise<any> => {
  const { quizId } = req.params;

  try {
    // 1. Verify quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: { select: { title: true } }
  }});

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // 2. Get all attempts with user data
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        { submittedAt: 'desc' } // Initial ordering for latest attempts
      ]
    });

    // 3. Process attempts
    const latestAttemptsMap = new Map<string, typeof attempts[number]>();
    
    // Keep only the latest attempt per student
    attempts.forEach(attempt => {
      if (!latestAttemptsMap.has(attempt.studentId)) {
        latestAttemptsMap.set(attempt.studentId, attempt);
      }
    });

    // 4. Sort according to ranking criteria
    const sortedAttempts = Array.from(latestAttemptsMap.values()).sort((a, b) => {
      // First criteria: Score (descending)
      if (b.score !== a.score) return b.score - a.score;

      // Second criteria: Time taken (ascending)
      if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;

      // Third criteria: Submission time (ascending)
      if (a.submittedAt.getTime() !== b.submittedAt.getTime()) {
        return a.submittedAt.getTime() - b.submittedAt.getTime();
      }

      // Final tie-breaker: Name (alphabetical)
      const nameCompare = a.student.lastName.localeCompare(b.student.lastName);
      return nameCompare !== 0 
        ? nameCompare 
        : a.student.firstName.localeCompare(b.student.firstName);
    });

    // 5. Format response with ranks
    const ranking = sortedAttempts.map((attempt, index) => ({
      rank: index + 1,
      studentId: attempt.student.id,
      firstName: attempt.student.firstName,
      lastName: attempt.student.lastName,
      email: attempt.student.email,
      score: attempt.score,
      timeTaken: attempt.timeTaken,
      attemptNumber :attempt.attemptNumber,
      submittedAt: attempt.submittedAt,
      courseTitle: quiz.course?.title,
      totalScore: quiz.totalScore
    }));

    res.status(200).json(ranking);
  } catch (error) {
    console.error('Ranking error:', error);
    res.status(500).json({
      error: 'Failed to generate ranking',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : String(error)
      })
    });
  }
});

/**
 * @swagger
 * /quiz/submitcorrected-quiz:
 *   post:
 *     summary: Submit a corrected quiz
 *     description: Creates a new quiz submission record with user details and score
 *     tags: [Quiz Submissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitQuizInput'
 *           example:
 *             firstName: "Paul"
 *             lastName: "Atangana"
 *             userId: "67e6ac0719e89961b3bc0b98"
 *             score: 85
 *     responses:
 *       201:
 *         description: Quiz submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitQuiz'
 *       400:
 *         description: Bad request - missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "firstName, lastName, userId and score are required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to submit quiz"
 *
 * @swagger
 * components:
 *   schemas:
 *     SubmitQuizInput:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - userId
 *         - score
 *       properties:
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: "paul"
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: "Atangana"
 *         userId:
 *           type: string
 *           description: ID of the user who took the quiz
 *           example: "67e6ac0719e89961b3bc0b98"
 *         score:
 *           type: integer
 *           description: The score obtained in the quiz
 *           example: 85
 * 
 *     SubmitQuiz:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated submission ID
 *           example: "67e6ac0719e89961b3bc0b98"
 *         userId:
 *           type: string
 *           description: ID of the user who took the quiz
 *           example: "67e6ac0719e89961b3bc0b98"
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: "Paolo"
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: "Atangana"
 *         score:
 *           type: integer
 *           description: The score obtained in the quiz
 *           example: 85
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Submission creation timestamp
 *           example: "2023-05-20T14:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2023-05-20T14:30:00Z"
 */
router.post('/submitcorrected-quiz',authenticateToken, async (req: Request, res: Response):Promise<any> => {
  try {
    const { firstName, lastName, score,userId } = req.body;

    // Validate input
    if (!firstName || !lastName || typeof score !== 'number' ||!userId) {
      return res.status(400).json({ error: 'firstName, lastName,userId and score are required' });
    }

    const submission = await prisma.submitQuiz.create({
      data: {
        firstName,
        lastName,
        userId,
        score,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});


/**
 * @swagger
 * /quiz/getsubmitcorrected-quiz/all:
 *   get:
 *     summary: Retrieve all quiz submissions
 *     description: Get a complete list of all quiz submissions without any sorting or filtering
 *     tags: [Quiz Submissions]
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubmitQuiz'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch submissions"
 * @swagger
 * components:
 *   schemas:
 *     SubmitQuiz:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "67e6ac0719e89961b3bc0b98"
 *         userId:
 *           type: string
 *           example: "67e6ac0719e89961b3bc0b98"
 *         firstName:
 *           type: string
 *           example: "Pul"
 *         lastName:
 *           type: string
 *           example: "rexogo"
 *         score:
 *           type: integer
 *           example: 85
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-05-20T14:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-05-20T14:30:00Z"
 */
router.get('/getsubmitcorrected-quiz/all',authenticateToken, async (req: Request, res: Response):Promise<any> => {
  try {
    const submissions = await prisma.submitQuiz.findMany();
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});



/**
 * @swagger
 * /quiz/submitcorrected-quiz/update-score:
 *   patch:
 *     summary: Update or create quiz submission
 *     description: Updates existing user's score by adding to it or creates new submission if not exists
 *     tags: [Quiz Submissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitQuizInput'
 *           example:
 *             firstName: "Johnny"
 *             lastName: "paul"
 *             userId: "507f191e810c19729de860ea"
 *             score: 10
 *     responses:
 *       200:
 *         description: Score updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitQuiz'
 *       201:
 *         description: New submission created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitQuiz'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 * @swagger
 * components:
 *   schemas:
 *     SubmitQuizInput:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - userId
 *         - score
 *       properties:
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: "Johnny"
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: "Paul"
 *         userId:
 *           type: string
 *           description: ID of the user who took the quiz
 *           example: "507f191e810c19729de860ea"
 *         score:
 *           type: integer
 *           description: The score to add to existing or create new with
 *           example: 10
 * 
 *     SubmitQuiz:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated submission ID
 *           example: "507f1f77bcf86cd799439011"
 *         userId:
 *           type: string
 *           description: ID of the user who took the quiz
 *           example: "507f191e810c19729de860ea"
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: "Johnny"
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: "Paul"
 *         score:
 *           type: integer
 *           description: The total score obtained in the quiz
 *           example: 85
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Submission creation timestamp
 *           example: "2023-05-20T14:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2023-05-20T14:30:00Z"
 */
router.patch('/submitcorrected-quiz/update-score',authenticateToken, async (req: Request, res: Response):Promise<any> => {
  try {
    const { firstName, lastName, score, userId } = req.body;

    // Validate input
    if (!firstName || !lastName || typeof score !== 'number' || !userId) {
      return res.status(400).json({ 
        error: 'firstName, lastName, userId and score (as number) are required' 
      });
    }

    // Check for existing submission
    const existingSubmission = await prisma.submitQuiz.findFirst({
      where: { userId }
    });

    if (!existingSubmission) {
      // Create new submission if doesn't exist
      const submission = await prisma.submitQuiz.create({
        data: {
          firstName,
          lastName,
          userId,
          score,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      return res.status(201).json(submission);
    }

    // Update existing submission
    const updatedSubmission = await prisma.submitQuiz.update({
      where: { id: existingSubmission.id },
      data: {
        score: { increment: score },
        updatedAt: new Date()
      }
    });

    return res.status(200).json(updatedSubmission);
  } catch (error) {
    console.error('Error in update-score:', error);
    return res.status(500).json({ 
      error: 'Failed to process score update',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : String(error)
      })
    });
  }
});



//route for results with advance information 
/**
 * @swagger
 * /quiz-attempts/{attemptId}/results:
 *   get:
 *     summary: Get detailed quiz attempt results
 *     description: Returns comprehensive results for a quiz attempt including questions, answers, scoring, and statistics
 *     tags: [Quiz Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the quiz attempt to retrieve results for
 *     responses:
 *       200:
 *         description: Detailed quiz attempt results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizResults'
 *       400:
 *         description: Missing attempt ID
 *       404:
 *         description: Quiz attempt not found
 *       500:
 *         description: Failed to fetch quiz results
 * 
 * components:
 *   schemas:
 *     QuizResults:
 *       type: object
 *       properties:
 *         quizInfo:
 *           $ref: '#/components/schemas/QuizInfo'
 *         attemptInfo:
 *           $ref: '#/components/schemas/AttemptInfo'
 *         studentInfo:
 *           $ref: '#/components/schemas/StudentInfo'
 *         questions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuestionResult'
 *         statistics:
 *           $ref: '#/components/schemas/QuizStatistics'
 * 
 *     QuizInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         passingScore:
 *           type: number
 *         totalQuestions:
 *           type: integer
 *         duration:
 *           type: integer
 *           description: Duration in seconds
 * 
 *     AttemptInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         score:
 *           type: number
 *         scorePercentage:
 *           type: integer
 *           description: Rounded percentage score
 *         timeTaken:
 *           type: integer
 *           description: Time taken in seconds
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         attemptNumber:
 *           type: integer
 * 
 *     StudentInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *           description: Full name of student
 * 
 *     QuestionResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         text:
 *           type: string
 *         type:
 *           $ref: '#/components/schemas/QuestionType'
 *         difficulty:
 *           $ref: '#/components/schemas/Questiondifficulty'
 *         userAnswer:
 *           $ref: '#/components/schemas/UserAnswer'
 *         correctAnswer:
 *           $ref: '#/components/schemas/CorrectAnswer'
 *         options:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuestionOption'
 * 
 *     UserAnswer:
 *       type: object
 *       properties:
 *         chosenOptions:
 *           type: array
 *           items:
 *             type: string
 *         dualOption:
 *           type: boolean
 *           nullable: true
 *         answerText:
 *           type: string
 *           nullable: true
 *         isCorrect:
 *           type: boolean
 * 
 *     CorrectAnswer:
 *       type: object
 *       properties:
 *         optionIds:
 *           type: array
 *           items:
 *             type: string
 *         isTrue:
 *           type: boolean
 *           nullable: true
 *         answerText:
 *           type: string
 *           nullable: true
 * 
 *     QuestionOption:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         text:
 *           type: string
 *         isCorrect:
 *           type: boolean
 * 
 *     QuizStatistics:
 *       type: object
 *       properties:
 *         correctAnswers:
 *           type: integer
 *         incorrectAnswers:
 *           type: integer
 *         accuracy:
 *           type: integer
 *           description: Accuracy percentage
 *         byDifficulty:
 *           $ref: '#/components/schemas/DifficultyStats'
 *         byType:
 *           $ref: '#/components/schemas/QuestionTypeStats'
 * 
 *     DifficultyStats:
 *       type: object
 *       properties:
 *         easy:
 *           $ref: '#/components/schemas/StatCount'
 *         intermediate:
 *           $ref: '#/components/schemas/StatCount'
 *         advance:
 *           $ref: '#/components/schemas/StatCount'
 * 
 *     QuestionTypeStats:
 *       type: object
 *       properties:
 *         MCQ:
 *           $ref: '#/components/schemas/StatCount'
 *         TRUE_FALSE:
 *           $ref: '#/components/schemas/StatCount'
 *         SHORT_ANSWER:
 *           $ref: '#/components/schemas/StatCount'
 * 
 *     StatCount:
 *       type: object
 *       properties:
 *         correct:
 *           type: integer
 *         total:
 *           type: integer
 * 
 *     QuestionType:
 *       type: string
 *       enum: [MCQ, TRUE_FALSE, SHORT_ANSWER]
 * 
 *     Questiondifficulty:
 *       type: string
 *       enum: [EASY, INTERMEDIATE, ADVANCE]
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
  router.get('/quiz-attempts/:attemptId/results',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { attemptId } = req.params;
  
    try {
      // Validate required fields
      if (!attemptId) {
        return res.status(400).json({ error: 'Missing attempt ID' });
      }
  
      // Fetch the quiz attempt with all related data
      const quizAttempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        include: {
          quiz: {
            include: {
              questions: {
                include: {
                  options: true,
                  correct: {
                    include: {
                      option: true
                    }
                  }
                }
              }
            }
          },
          answers: {
            include: {
              question: {
                include: {
                  options: true,
                  correct: {
                    include: {
                      option: true
                    }
                  }
                }
              }
            }
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
  
      if (!quizAttempt) {
        return res.status(404).json({ error: 'Quiz attempt not found' });
      }
  
      // Format the questions with user answers and correctness
      const formattedQuestions = quizAttempt.quiz.questions.map(question => {
        const userAnswer = quizAttempt.answers.find(a => a.questionId === question.id);
        
        // Get correct option IDs for MCQ questions
        const correctOptionIds = question.correct.map(c => c.optionId);
        
        // For TRUE_FALSE questions, get the correct boolean value
        const correctBooleanValue = question.correct[0]?.isTrue;
        
        return {
          id: question.id,
          text: question.text,
          type: question.questionType,
          difficulty: question.difficulty,
          //points: getPointsForDifficulty(question.difficulty),
          userAnswer: {
            chosenOptions: userAnswer?.chosenOptions || [],
            dualOption: userAnswer?.dualOption || null,
            answerText: userAnswer?.answerText || null,
            isCorrect: userAnswer?.isCorrect || false
          },
          correctAnswer: {
            optionIds: correctOptionIds,
            isTrue: correctBooleanValue,
            answerText: question.questionType === 'SHORT_ANSWER' 
              ? question.correct[0]?.answerText 
              : null
          },
          options: question.options.map(option => ({
            id: option.id,
            text: option.text,
            isCorrect: correctOptionIds.includes(option.id)
          }))
        };
      });
  
      // Calculate statistics
      const totalQuestions = quizAttempt.quiz.questions.length;
      const correctAnswers = quizAttempt.answers.filter(a => a.isCorrect).length;
      const scorePercentage = (quizAttempt.score / (totalQuestions * 3)) * 100; // Assuming max 3 points per question
  
      // Prepare the response
      const response = {
        quizInfo: {
          id: quizAttempt.quiz.id,
          title: quizAttempt.quiz.title,
          description: quizAttempt.quiz.description,
          passingScore: quizAttempt.quiz.passingScore,
          totalQuestions,
          duration: quizAttempt.quiz.duration
        },
        attemptInfo: {
          id: quizAttempt.id,
          score: quizAttempt.score,
          scorePercentage: Math.round(scorePercentage),
          timeTaken: quizAttempt.timeTaken,
          submittedAt: quizAttempt.submittedAt,
          attemptNumber: quizAttempt.attemptNumber
        },
        studentInfo: {
          id: quizAttempt.student.id,
          name: `${quizAttempt.student.firstName} ${quizAttempt.student.lastName}`
        },
        questions: formattedQuestions,
        statistics: {
          correctAnswers,
          incorrectAnswers: totalQuestions - correctAnswers,
          accuracy: Math.round((correctAnswers / totalQuestions) * 100),
          byDifficulty: {
            easy: {
              correct: formattedQuestions
                .filter(q => q.difficulty === 'EASY' && q.userAnswer.isCorrect)
                .length,
              total: formattedQuestions
                .filter(q => q.difficulty === 'EASY')
                .length
            },
            intermediate: {
              correct: formattedQuestions
                .filter(q => q.difficulty === 'INTERMEDIATE' && q.userAnswer.isCorrect)
                .length,
              total: formattedQuestions
                .filter(q => q.difficulty === 'INTERMEDIATE')
                .length
            },
            advance: {
              correct: formattedQuestions
                .filter(q => q.difficulty === 'ADVANCE' && q.userAnswer.isCorrect)
                .length,
              total: formattedQuestions
                .filter(q => q.difficulty === 'ADVANCE')
                .length
            }
          },
          byType: {
            MCQ: {
              correct: formattedQuestions
                .filter(q => q.type === 'MCQ' && q.userAnswer.isCorrect)
                .length,
              total: formattedQuestions
                .filter(q => q.type === 'MCQ')
                .length
            },
            TRUE_FALSE: {
              correct: formattedQuestions
                .filter(q => q.type === 'TRUE_FALSE' && q.userAnswer.isCorrect)
                .length,
              total: formattedQuestions
                .filter(q => q.type === 'TRUE_FALSE')
                .length
            },
            SHORT_ANSWER: {
              correct: formattedQuestions
                .filter(q => q.type === 'SHORT_ANSWER' && q.userAnswer.isCorrect)
                .length,
              total: formattedQuestions
                .filter(q => q.type === 'SHORT_ANSWER')
                .length
            }
          }
        }
      };
  
      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      res.status(500).json({ error: 'Failed to fetch quiz results' });
    }
  });

module.exports =router 