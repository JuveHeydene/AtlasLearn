import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { calculateAndUpdateQuizScores } from '../Services/quiz.service';
import upload from "../Middlewares/multer";
import { uploadFile } from "../config/storage";
import { authenticateToken } from "../Middlewares/auth.middleware";
const prisma = new PrismaClient();

const router = express.Router();

/**
 * @swagger
 * /question/create-questions:
 *   post:
 *     summary: Create a new question
 *     description: Creates a question of type MCQ, TRUE_FALSE, or SHORT_ANSWER
 *     tags: [Questions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/MCQQuestionInput'
 *               - $ref: '#/components/schemas/TrueFalseQuestionInput'
 *               - $ref: '#/components/schemas/ShortAnswerQuestionInput'
 *           examples:
 *             mcqExample:
 *               value:
 *                 quizId: "65a1b2c3d4e5f6a7b8c9d0e1"
 *                 text: "Quelle est la capitale de la France ?"
 *                 questionType: "MCQ"
 *                 difficulty: "EASY"
 *                 options:
 *                   - text: "Paris"
 *                     isCorrect: true
 *                   - text: "Londres"
 *                     isCorrect: false
 *                   - text: "Berlin"
 *                     isCorrect: false
 *                 correctAnswers: ["Paris"]
 *             trueFalseExample:
 *               value:
 *                 quizId: "65a1b2c3d4e5f6a7b8c9d0e1"
 *                 text: "La Terre est plate."
 *                 questionType: "TRUE_FALSE"
 *                 difficulty: "EASY"
 *                 correctAnswers: false
 *             shortAnswerExample:
 *               value:
 *                 quizId: "65a1b2c3d4e5f6a7b8c9d0e1"
 *                 text: "Qui a écrit 'Les Misérables' ?"
 *                 questionType: "SHORT_ANSWER"
 *                 difficulty: "EASY"
 *                 correctAnswers: "Victor Hugo"
 *     responses:
 *       201:
 *         description: Question created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     MCQQuestionInput:
 *       type: object
 *       required:
 *         - quizId
 *         - text
 *         - questionType
 *         - difficulty
 *         - options
 *         - correctAnswers
 *       properties:
 *         quizId:
 *           type: string
 *         text:
 *           type: string
 *         questionType:
 *           type: string
 *           enum: [MCQ]
 *         difficulty:
 *           type: string
 *           enum: [EASY, INTERMEDIATE, ADVANCE]
 *         options:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuestionOption'
 *         correctAnswers:
 *           type: array
 *           items:
 *             type: string
 * 
 *     TrueFalseQuestionInput:
 *       type: object
 *       required:
 *         - quizId
 *         - text
 *         - questionType
 *         - difficulty
 *         - correctAnswers
 *       properties:
 *         quizId:
 *           type: string
 *         text:
 *           type: string
 *         questionType:
 *           type: string
 *           enum: [TRUE_FALSE]
 *         difficulty:
 *           type: string
 *           enum: [EASY, INTERMEDIATE, ADVANCE]
 *         correctAnswers:
 *           type: boolean
 * 
 *     ShortAnswerQuestionInput:
 *       type: object
 *       required:
 *         - quizId
 *         - text
 *         - questionType
 *         - difficulty
 *         - correctAnswers
 *       properties:
 *         quizId:
 *           type: string
 *         text:
 *           type: string
 *         questionType:
 *           type: string
 *           enum: [SHORT_ANSWER]
 *         difficulty:
 *           type: string
 *           enum: [EASY, INTERMEDIATE, ADVANCE]
 *         correctAnswers:
 *           type: string
 * 
 *     QuestionOption:
 *       type: object
 *       required:
 *         - text
 *         - isCorrect
 *       properties:
 *         text:
 *           type: string
 *         isCorrect:
 *           type: boolean
 * 
 *     Question:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         quizId:
 *           type: string
 *         text:
 *           type: string
 *         questionType:
 *           type: string
 *         difficulty:
 *           type: string
 *         options:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuestionOption'
 *         correctAnswers:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
router.post('/create-questions',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { quizId, text, questionType, difficulty, options, correctAnswers,fileUrl,fileName } = req.body;

  try {
    // Validate required fields
    if (!quizId || !text || !questionType || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Additional validation based on question type
    if (questionType === 'MCQ' && (!options || !correctAnswers)) {
      return res.status(400).json({ error: 'Missing options or correctAnswers for MCQ question' });
    }
    if (questionType === 'TRUE_FALSE' && correctAnswers === undefined) {
      return res.status(400).json({ error: 'Missing correctAnswers for TRUE_FALSE question' });
    }
    if (questionType === 'SHORT_ANSWER' && !correctAnswers) {
      return res.status(400).json({ error: 'Missing correctAnswers for SHORT_ANSWER question' });
    }

    // Step 1: Create the question
    const question = await prisma.question.create({
      data: {
        quizId,
        text,
        questionType,
        difficulty,
        fileName:fileName||null,
        fileUrl:fileUrl || null,
        // Only create options for MCQ questions
        options: questionType === 'MCQ' ? {
          create: options.map((option: { text: string; isCorrect: boolean }) => ({
            text: option.text,
            isCorrect: option.isCorrect,
          }),
      )} : undefined,
      },
      include: {
        options: true, // Include the created options in the response (for MCQ)
      },
    });

    // Step 2: Create the CorrectAnswer records based on question type
    if (questionType === 'MCQ') {
      // For MCQ questions, map correctAnswers (text) to optionId
      const correctOptionIds = question.options
        .filter((option) => correctAnswers.includes(option.text)) // Match correctAnswers text with option text
        .map((option) => option.id); // Extract the optionId

      await prisma.correctAnswer.createMany({
        data: correctOptionIds.map((optionId) => ({
          questionId: question.id,
          optionId, // Use the mapped optionId
        })),
      });
    } else if (questionType === 'TRUE_FALSE') {
      // For TRUE_FALSE questions, store the boolean answer (isTrue)
      await prisma.correctAnswer.create({
        data: {
          questionId: question.id,
          isTrue: correctAnswers, // correctAnswers is a boolean (true or false)
        },
      });
    } else if (questionType === 'SHORT_ANSWER') {
      // For SHORT_ANSWER questions, store the correct answer text
      await prisma.correctAnswer.create({
        data: {
          questionId: question.id,
          answerText: correctAnswers, // correctAnswers is a string (the correct answer)
        },
      });
    }

    // Step 3: Return the question with its options and correct answers
    const fullQuestion = await prisma.question.findUnique({
      where: { id: question.id },
      include: {
        options: true,
        correct: {
          include: {
            option: true, // Include the correct option details (for MCQ)
          },
        },
      },
    });

    res.status(201).json(fullQuestion);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
}); 

/**
 * @swagger
 * /question/delete-questions/{questionId}:
 *   delete:
 *     summary: Delete a question and all related data
 *     description: |
 *       Deletes a question and all its related data including:
 *       - Attempt answers
 *       - Correct answers
 *       - Answer options
 *     tags: [Questions]
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the question to delete
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Question deleted successfully"
 *                 deletedQuestion:
 *                   $ref: '#/components/schemas/Question'
 *       400:
 *         description: Bad request (missing question ID)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Question ID is required"
 *       404:
 *         description: Question not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Question not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to delete question"
 * 
 * @swagger
 * components:
 *   schemas:
 *     Question:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         quizId:
 *           type: string
 *         text:
 *           type: string
 *         questionType:
 *           type: string
 *           enum: [MCQ, TRUE_FALSE, SHORT_ANSWER]
 *         difficulty:
 *           type: string
 *           enum: [EASY, INTERMEDIATE, ADVANCE]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "65a1b2c3d4e5f6a7b8c9d0e1"
 *         quizId: "65a1b2c3d4e5f6a7b8c9d0e2"
 *         text: "Sample question text"
 *         questionType: "MCQ"
 *         difficulty: "EASY"
 *         createdAt: "2023-01-01T00:00:00Z"
 *         updatedAt: "2023-01-01T00:00:00Z"
 */
router.delete('/delete-questions/:questionId',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { questionId } = req.params;
  
    try {
      // Validate questionId
      if (!questionId) {
        return res.status(400).json({ error: 'Question ID is required' });
      }
  
      // Step 1: Delete related AttemptAnswer records
      await prisma.attemptAnswer.deleteMany({
        where: { questionId },
      });
  
      // Step 2: Delete related CorrectAnswer records
      await prisma.correctAnswer.deleteMany({
        where: { questionId },
      });
  
      // Step 3: Delete related AnswerOption records
      await prisma.answerOption.deleteMany({
        where: { questionId },
      });
  
      // Step 4: Delete the question
      const deletedQuestion = await prisma.question.delete({
        where: { id: questionId },
      });
  
      // Return success message
      res.status(200).json({ message: 'Question deleted successfully', deletedQuestion });
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  });  


/**
 * @swagger
 * /question/questions/bulk/:quizIds:
 *   post:
 *     summary: Create multiple questions of different types at once
 *     tags: [Questions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               oneOf:
 *                 - $ref: '#/components/schemas/MCQQuestionInput'
 *                 - $ref: '#/components/schemas/TrueFalseQuestionInput'
 *                 - $ref: '#/components/schemas/ShortAnswerQuestionInput'
 *             example:
 *               - quizId: "65a1b2c3d4e5f6a7b8c9d0e1"
 *                 text: "Quelle est la capitale de la France ?"
 *                 questionType: "MCQ"
 *                 difficulty: "EASY"
 *                 options:
 *                   - text: "Paris"
 *                     isCorrect: true
 *                   - text: "Londres"
 *                     isCorrect: false
 *                   - text: "Berlin"
 *                     isCorrect: false
 *                 correctAnswers: ["Paris"]
 *               - quizId: "65a1b2c3d4e5f6a7b8c9d0e1"
 *                 text: "La Terre est plate."
 *                 questionType: "TRUE_FALSE"
 *                 difficulty: "EASY"
 *                 correctAnswers: false
 *               - quizId: "65a1b2c3d4e5f6a7b8c9d0e1"
 *                 text: "Qui a écrit 'Les Misérables' ?"
 *                 questionType: "SHORT_ANSWER"
 *                 difficulty: "EASY"
 *                 correctAnswers: "Victor Hugo"
 *     responses:
 *       201:
 *         description: Questions created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Question'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     MCQQuestionInput:
 *       type: object
 *       required:
 *         - quizId
 *         - text
 *         - questionType
 *         - difficulty
 *         - options
 *         - correctAnswers
 *       properties:
 *         quizId:
 *           type: string
 *         text:
 *           type: string
 *         questionType:
 *           type: string
 *           enum: [MCQ]
 *         difficulty:
 *           type: string
 *           enum: [EASY, INTERMEDIATE, ADVANCE]
 *         options:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuestionOption'
 *         correctAnswers:
 *           type: array
 *           items:
 *             type: string
 *       example:
 *         quizId: "65a1b2c3d4e5f6a7b8c9d0e1"
 *         text: "Quelle est la capitale de la France ?"
 *         questionType: "MCQ"
 *         difficulty: "EASY"
 *         options:
 *           - text: "Paris"
 *             isCorrect: true
 *           - text: "Londres"
 *             isCorrect: false
 *           - text: "Berlin"
 *             isCorrect: false
 *         correctAnswers: ["Paris"]
 * 
 *     TrueFalseQuestionInput:
 *       type: object
 *       required:
 *         - quizId
 *         - text
 *         - questionType
 *         - difficulty
 *         - correctAnswers
 *       properties:
 *         quizId:
 *           type: string
 *         text:
 *           type: string
 *         questionType:
 *           type: string
 *           enum: [TRUE_FALSE]
 *         difficulty:
 *           type: string
 *           enum: [EASY, INTERMEDIATE, ADVANCE]
 *         correctAnswers:
 *           type: boolean
 *       example:
 *         quizId: "65a1b2c3d4e5f6a7b8c9d0e1"
 *         text: "La Terre est plate."
 *         questionType: "TRUE_FALSE"
 *         difficulty: "EASY"
 *         correctAnswers: false
 * 
 *     ShortAnswerQuestionInput:
 *       type: object
 *       required:
 *         - quizId
 *         - text
 *         - questionType
 *         - difficulty
 *         - correctAnswers
 *       properties:
 *         quizId:
 *           type: string
 *         text:
 *           type: string
 *         questionType:
 *           type: string
 *           enum: [SHORT_ANSWER]
 *         difficulty:
 *           type: string
 *           enum: [EASY, INTERMEDIATE, ADVANCE]
 *         correctAnswers:
 *           type: string
 *       example:
 *         quizId: "65a1b2c3d4e5f6a7b8c9d0e1"
 *         text: "Qui a écrit 'Les Misérables' ?"
 *         questionType: "SHORT_ANSWER"
 *         difficulty: "EASY"
 *         correctAnswers: "Victor Hugo"
 * 
 *     QuestionOption:
 *       type: object
 *       required:
 *         - text
 *         - isCorrect
 *       properties:
 *         text:
 *           type: string
 *         isCorrect:
 *           type: boolean
 * 
 *     Question:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         quizId:
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
 *             $ref: '#/components/schemas/AnswerOption'
 *         correct:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CorrectAnswer'
 * 
 *     AnswerOption:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         text:
 *           type: string
 *         isCorrect:
 *           type: boolean
 * 
 *     CorrectAnswer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         optionId:
 *           type: string
 *         isTrue:
 *           type: boolean
 *         answerText:
 *           type: string
 */
router.post('/questions/bulk/:quizIds',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { quizIds } = req.params;
  const questionsData = req.body;

  if (!Array.isArray(questionsData)) {
    return res.status(400).json({ error: 'Request body must be an array of questions' });
  }

  try {
    const createdQuestions = [];
    
    for (const questionData of questionsData) {
      const { quizId, text, questionType, difficulty, options, correctAnswers } = questionData;

      // Validate required fields for each question
      if (!quizId || !text || !questionType || !difficulty) {
        console.error(`Missing required fields for question: ${text}`);
        continue; // Skip this question but continue with others
      }

      // Type-specific validation
      if (questionType === 'MCQ' && (!options || !correctAnswers)) {
        console.error(`Missing options or correctAnswers for MCQ question: ${text}`);
        continue;
      }
      if (questionType === 'TRUE_FALSE' && correctAnswers === undefined) {
        console.error(`Missing correctAnswers for TRUE_FALSE question: ${text}`);
        continue;
      }
      if (questionType === 'SHORT_ANSWER' && !correctAnswers) {
        console.error(`Missing correctAnswers for SHORT_ANSWER question: ${text}`);
        continue;
      }

      try {
        // Create question (same logic as single creation)
        const question = await prisma.question.create({
          data: {
            quizId,
            text,
            questionType,
            difficulty,
            options: questionType === 'MCQ' ? {
              create: options.map((option: { text: string; isCorrect: boolean }) => ({
                text: option.text,
                isCorrect: option.isCorrect,
              })),
            } : undefined,
          },
          include: {
            options: questionType === 'MCQ',
          },
        });

        // Create correct answer(s)
        if (questionType === 'MCQ') {
          const correctOptionIds = question.options
            .filter(option => correctAnswers.includes(option.text))
            .map(option => option.id);

          if (correctOptionIds.length > 0) {
            await prisma.correctAnswer.createMany({
              data: correctOptionIds.map(optionId => ({
                questionId: question.id,
                optionId,
              })),
            });
          }
        } else if (questionType === 'TRUE_FALSE') {
          await prisma.correctAnswer.create({
            data: {
              questionId: question.id,
              isTrue: correctAnswers,
            },
          });
        } else if (questionType === 'SHORT_ANSWER') {
          await prisma.correctAnswer.create({
            data: {
              questionId: question.id,
              answerText: correctAnswers,
            },
          });
        }

        // Fetch complete question data
        const fullQuestion = await prisma.question.findUnique({
          where: { id: question.id },
          include: {
            options: true,
            correct: {
              include: {
                option: true,
              },
            },
          },
        });

        createdQuestions.push(fullQuestion);
      } catch (error) {
        console.error(`Error creating question "${text}":`, error);
        // Continue with next question even if this one fails
      }
    }

    if (createdQuestions.length === 0) {
      return res.status(400).json({ error: 'No questions were created successfully' });
    }
    
    const { totalScore, passingScore } = await calculateAndUpdateQuizScores(questionsData,quizIds);
    res.status(201).json({
      message: `Successfully created ${createdQuestions.length}/${questionsData.length} questions`,
      createdQuestions,
      failedCount: questionsData.length - createdQuestions.length
    });
  } catch (error) {
    console.error('Error in bulk question creation:', error);
    res.status(500).json({ error: 'Failed to process bulk question creation' });
  }
});


//upload route for creations of questions:
/**
 * @swagger
 * /question/upload-questions:
 *   post:
 *     summary: Upload an image for questions
 *     description: Uploads an image file to the S3-compatible storage (MinIO locally) for use with questions
 *     tags: [Questions]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (supports common image formats)
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "File uploaded successfully"
 *                 file:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       description: Public URL of the uploaded image
 *                       example: "http://localhost:9000/atlaslearn/question_images/1700000000000-a1b2c3.jpg"
 *                     key:
 *                       type: string
 *                       description: Object key in the storage bucket
 *                     name:
 *                       type: string
 *                     mimetype:
 *                       type: string
 *                       example: "image/jpeg"
 *                     size:
 *                       type: integer
 *                       description: File size in bytes
 *                 originalFileName:
 *                   type: string
 *                   description: Original name of the uploaded file
 *                   example: "question_image.jpg"
 *       400:
 *         description: No file was uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No file uploaded"
 *       500:
 *         description: Failed to upload file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to upload file"
 *                 details:
 *                   type: string
 *                   description: Detailed error message (only in development environment)
 *                   example: "File type application/x-msdownload is not allowed"
 */
router.post("/upload-questions",authenticateToken, upload.single("file"), async (req, res): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }


    // Extract original file name
    const originalFileName = req.file.originalname;

    // Upload the image to the S3-compatible storage (MinIO locally)
    const file = await uploadFile(req.file, "question_images");


    return res.status(201).json({ 
      message: "File uploaded successfully", 
      file,
      originalFileName
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ 
      error: "Failed to upload file",
      ...(process.env.NODE_ENV === "development" && { 
        details: error instanceof Error ? error.message : String(error)
      })
    });
  }
});


module.exports =router 