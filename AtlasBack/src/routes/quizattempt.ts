import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient, QuestionType } from "@prisma/client";
import { text } from "stream/consumers";
import { authenticateToken } from "../Middlewares/auth.middleware";
const prisma = new PrismaClient();

const router = express.Router();


//Route to create a quiz attempt 

/**
 * @swagger
 * /quizattemp/createquiz-attempts:
 *   post:
 *     summary: Create a new quiz attempt
 *     description: Creates a new quiz attempt record for a student
 *     tags: [Quiz Attempts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuizAttemptInput'
 *           example:
 *             quizId: "67dd0cd93e61ac8c7e46027e"
 *             studentId: "67c5a7cba5ee175152ac6baf"
 *     responses:
 *       201:
 *         description: Quiz attempt created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizAttempt'
 *       400:
 *         description: Bad request (missing or invalid fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Both quizId and studentId are required"
 *       404:
 *         description: Quiz or student not found
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     CreateQuizAttemptInput:
 *       type: object
 *       required:
 *         - quizId
 *         - studentId
 *       properties:
 *         quizId:
 *           type: string
 *           description: ID of the quiz being attempted
 *           example: "67dd0cd93e61ac8c7e46027e"
 *         studentId:
 *           type: string
 *           description: ID of the student attempting the quiz
 *           example: "67c5a7cba5ee175152ac6baf"
 * 
 *     QuizAttempt:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         quizId:
 *           type: string
 *         studentId:
 *           type: string
 *         score:
 *           type: number
 *           format: float
 *           default: 0
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         timeTaken:
 *           type: integer
 *           description: Time taken in seconds
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "67dd53c38341cdddcc4c8bb6"
 *         quizId: "67dd0cd93e61ac8c7e46027e"
 *         studentId: "67c5a7cba5ee175152ac6baf"
 *         score: 0
 *         submittedAt: null
 *         timeTaken: null
 *         createdAt: "2023-12-01T10:00:00Z"
 *         updatedAt: "2023-12-01T10:00:00Z"
 */
router.post('/createquiz-attempts',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { quizId, studentId, chapterId } = req.body;

  try {
    // Validate required fields
    if (!quizId || !studentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the current highest attempt number for this student/quiz
    const lastAttempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId,
        studentId
      },
      orderBy: {
        attemptNumber: 'desc'
      },
      select: {
        attemptNumber: true
      }
    });

    const nextAttemptNumber = (lastAttempt?.attemptNumber || 0) + 1;

    // Create the quiz attempt
    const quizAttempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        chapterId: chapterId || null, // Optional field
        score: 0, // Default score
        timeTaken: 0, // Default time
        attemptNumber: nextAttemptNumber
      },
      include: {
        quiz: true,
        student: true,
        chapter: true
      }
    });

    // Return the created quiz attempt
    res.status(201).json(quizAttempt);
  } catch (error) {
    console.error('Error creating quiz attempt:', error);
    res.status(500).json({ 
      error: 'Failed to create quiz attempt', 
    });
  }
});


//route to submit the users answers in the AttemptAnswer Model all answers are actually submitted at once 
/**
 * @swagger
 * /quizattemp/quiz-attempts/{attemptId}/submit-answers:
 *   post:
 *     summary: Submit answers for a quiz attempt
 *     description: Records answers for different types of questions in a quiz attempt
 *     tags: [Quiz Attempts]
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           example: "67dd53c38341cdddcc4c8bb6"
 *         description: ID of the quiz attempt
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitAnswersInput'
 *           example:
 *             answers:
 *               - questionId: "67e19012e2e475d9f56a2973"
 *                 dualOption: true
 *               - questionId: "67e1900be2e475d9f56a296c"
 *                 chosenOptions: ["67e1900be2e475d9f56a296e"]
 *               - questionId: "67e1900fe2e475d9f56a2971"
 *                 dualOption: true
 *               - questionId: "67e19015e2e475d9f56a2975"
 *                 chosenOptions: ["67e19015e2e475d9f56a2977"]
 *     responses:
 *       200:
 *         description: Answers submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Answers submitted successfully"
 *                 updatedAttempt:
 *                   $ref: '#/components/schemas/QuizAttemptWithAnswers'
 *       400:
 *         description: Bad request (invalid input)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Attempt ID and answers array are required"
 *       404:
 *         description: Quiz attempt or questions not found
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     SubmitAnswersInput:
 *       type: object
 *       required:
 *         - answers
 *       properties:
 *         answers:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/TrueFalseAnswerInput'
 *               - $ref: '#/components/schemas/MCQAnswerInput'
 * 
 *     TrueFalseAnswerInput:
 *       type: object
 *       required:
 *         - questionId
 *         - dualOption
 *       properties:
 *         questionId:
 *           type: string
 *           example: "67e19012e2e475d9f56a2973"
 *         dualOption:
 *           type: boolean
 *           description: Answer for true/false questions
 *           example: true
 * 
 *     MCQAnswerInput:
 *       type: object
 *       required:
 *         - questionId
 *         - chosenOptions
 *       properties:
 *         questionId:
 *           type: string
 *           example: "67e1900be2e475d9f56a296c"
 *         chosenOptions:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of selected option IDs
 *           example: ["67e1900be2e475d9f56a296e"]
 * 
 *     QuizAttemptWithAnswers:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         quizId:
 *           type: string
 *         studentId:
 *           type: string
 *         answers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AttemptAnswer'
 *         score:
 *           type: number
 *         submittedAt:
 *           type: string
 *           format: date-time
 * 
 *     AttemptAnswer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         questionId:
 *           type: string
 *         dualOption:
 *           type: boolean
 *           nullable: true
 *         chosenOptions:
 *           type: array
 *           items:
 *             type: string
 *           nullable: true
 *         isCorrect:
 *           type: boolean
 *           nullable: true
 */
router.post('/quiz-attempts/:attemptId/submit-answers',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { attemptId } = req.params;
    const { answers } = req.body; // `answers` is an array of user answers
  
    try {
      // Validate required fields
      if (!attemptId || !answers) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      // Store the user's answers
      const userAnswers = await prisma.attemptAnswer.createMany({
        data: answers.map((answer: { questionId: string; answerText?: string; chosenOptions?: string[]; dualOption?: boolean }) => ({
          attemptId,
          questionId: answer.questionId,
          answerText: answer.answerText || null, // For SHORT_ANSWER questions
          chosenOptions: answer.chosenOptions || [], // For MCQ questions (array of chosen options)
          dualOption: answer.dualOption || null, // For TRUE_FALSE questions
        })),
      });
  
      
      res.status(201).json({ message: 'Answers submitted successfully', userAnswers });
    } catch (error) {
      console.error('Error submitting answers:', error);
      res.status(500).json({ error: 'Failed to submit answers' });
    }
  });


  //route to calculate the users score 
  /**
 * @swagger
 * /quizattemp/quiz-attempts/{attemptId}/calculate-score:
 *   post:
 *     summary: Calculate and save quiz attempt score
 *     description: Calculates the score for a completed quiz attempt based on submitted answers and time taken
 *     tags: [Quiz Attempts]
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           example: "67dd53c38341cdddcc4c8bb6"
 *         description: ID of the quiz attempt to calculate score for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalculateScoreInput'
 *           example:
 *             timeTaken: "400"
 *     responses:
 *       200:
 *         description: Score calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizAttemptWithScore'
 *       400:
 *         description: Bad request (missing or invalid fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Attempt ID and timeTaken are required"
 *       404:
 *         description: Quiz attempt not found
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     CalculateScoreInput:
 *       type: object
 *       required:
 *         - timeTaken
 *       properties:
 *         timeTaken:
 *           type: integer
 *           description: Time taken to complete the quiz in seconds
 *           example: 400
 * 
 *     QuizAttemptWithScore:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         quizId:
 *           type: string
 *         studentId:
 *           type: string
 *         score:
 *           type: number
 *           format: float
 *           description: Calculated score
 *           example: 85.5
 *         timeTaken:
 *           type: integer
 *           description: Time taken in seconds
 *           example: 400
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         answers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ScoredAnswer'
 * 
 *     ScoredAnswer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         questionId:
 *           type: string
 *         isCorrect:
 *           type: boolean
 *         scoreContribution:
 *           type: number
 *           format: float
 */
  router.post('/quiz-attempts/:attemptId/calculate-score',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { attemptId } = req.params;
    const { timeTaken } = req.body; // Time taken to complete the test (in seconds)
    const timeTakenInt = parseInt(timeTaken, 10); 
  
    try {
      // Validate required fields
      if (!attemptId || !timeTaken) { 
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      // Fetch the quiz attempt and its answers
      const quizAttempt = await prisma.quizAttempt.findUnique({ 
        where: { id: attemptId },
        include: {
          answers: {
            include: {
              question: {
                include: {
                  correct: {
                    include: {
                      option: true, // Include the correct option details
                    },
                  },
                },
              },
            },
          },
        },
      });
  
      if (!quizAttempt) {
        return res.status(404).json({ error: 'Quiz attempt not found' });
      }
  
      // Calculate the score
      let score = 0;
      for (const answer of quizAttempt.answers) {
        const { question, chosenOptions, dualOption, answerText } = answer;
        const { correct, difficulty } = question;
  
        // Check if the answer is correct based on the question type
        let isCorrect = false;
        if (question.questionType === 'MCQ') {
          // For MCQ questions, check if the chosen options exactly match the correct answers
          const correctOptionIds = correct.map((c) => c.optionId); // Get correct optionIds
          isCorrect =
            chosenOptions.length === correctOptionIds.length &&
            chosenOptions.every((option) => correctOptionIds.includes(option));
        } else if (question.questionType === 'TRUE_FALSE') {
          // For TRUE_FALSE questions, check if the dualOption matches the correct answer
          isCorrect = correct.some((c) => c.isTrue === dualOption);
        } else if (question.questionType === 'SHORT_ANSWER') {
          // For SHORT_ANSWER questions, manual grading is required
          // For now, mark as incorrect 
          isCorrect = false;
        }
  
        // Update the AttemptAnswer record with the correctness
        await prisma.attemptAnswer.update({
          where: { id: answer.id },
          data: { isCorrect },
        });
  
        // Calculate the score based on the difficulty
        if (isCorrect) {
          switch (difficulty) {
            case 'EASY':
              score += 1;
              break;
            case 'INTERMEDIATE':
              score += 2;
              break;
            case 'ADVANCE':
              score += 3;
              break;
          }
        } else {
          switch (difficulty) {
            case 'EASY':
              score -= 1;
              break;
            case 'INTERMEDIATE':
              score -= 2;
              break;
            case 'ADVANCE':
              score -= 3;
              break;
          }
        }
      }
  
      // Update the QuizAttempt with the score and time taken
      const updatedAttempt = await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          score,
          timeTaken: timeTakenInt, // Use the parsed integer value
        },
      });
  
      // Return the updated attempt
      res.status(200).json(updatedAttempt);
    } catch (error) {
      console.error('Error calculating score:', error);
      res.status(500).json({ error: 'Failed to calculate score' });
    }
  });


//route for results

/**
 * @swagger
 * /quizattemp/quiz-attempts/{attemptId}/results:
 *   get:
 *     summary: Get detailed results for a quiz attempt
 *     description: Returns comprehensive results including question-by-question analysis, scores, and timing
 *     tags: [Quiz Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the quiz attempt
 *     responses:
 *       200:
 *         description: Quiz results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizResults'
 *       400:
 *         description: Missing attempt ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing attempt ID"
 *       404:
 *         description: Quiz attempt not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Quiz attempt not found"
 *       500:
 *         description: Failed to fetch quiz results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch quiz results"
 * 
 * components:
 *   schemas:
 *     QuizResults:
 *       type: object
 *       properties:
 *         quizId:
 *           type: string
 *           description: ID of the quiz
 *         quizTitle:
 *           type: string
 *           description: Title of the quiz
 *         totalQuestions:
 *           type: integer
 *           description: Total number of questions in the quiz
 *         numberOfQuestionPassed:
 *           type: integer
 *           description: Number of correctly answered questions
 *         numberOfQuestionFailed:
 *           type: integer
 *           description: Number of incorrectly answered questions
 *         score:
 *           type: number
 *           description: User's score
 *         totalScore:
 *           type: number
 *           description: Maximum possible score
 *         passingScore:
 *           type: number
 *           description: Minimum score required to pass
 *         timeTaken:
 *           type: integer
 *           description: Time taken to complete (in seconds)
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: When the quiz was submitted
 *         questions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuestionResult'
 * 
 *     QuestionResult:
 *       type: object
 *       properties:
 *         questionId:
 *           type: string
 *           description: ID of the question
 *         text:
 *           type: string
 *           description: Question text
 *         fileName:
 *           type: string
 *           nullable: true
 *           description: Associated file name if any
 *         fileUrl:
 *           type: string
 *           nullable: true
 *           description: URL to associated file if any
 *         type:
 *           $ref: '#/components/schemas/QuestionType'
 *         userAnswer:
 *           type: string
 *           description: ID of the option selected by user
 *         correctAnswer:
 *           type: string
 *           description: ID of the correct option
 *         point:
 *           type: number
 *           description: Points awarded based on question difficulty
 *         options:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AnswerOption'
 * 
 *     AnswerOption:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Option ID
 *         text:
 *           type: string
 *           description: Option text
 * 
 *     QuestionType:
 *       type: string
 *       enum: [MCQ, TRUE_FALSE, SHORT_ANSWER]
 *       description: Type of question
 * 
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
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
      
      const totalQuestions = quizAttempt.quiz.questions.length;
      const getnumberOfQuestionPassed=()=>{
        let numberquestion=0;
        quizAttempt.answers.map((answer)=>{
          if (answer.chosenOptions[0]==answer.question.correct[0].optionId){
            numberquestion=numberquestion+1;
          }
        })
        return numberquestion
      }
      const numberOfQuestionPassed=getnumberOfQuestionPassed();
      //prepare response to return :
      const response={
        quizId:quizAttempt.quiz.id,
        quizTitle:quizAttempt.quiz.title,
        totalQuestions:totalQuestions,
        numberOfQuestionPassed:numberOfQuestionPassed,
        numberOfQuestionFailed:totalQuestions-numberOfQuestionPassed,
        score:quizAttempt.score,
        totalScore:quizAttempt.quiz.totalScore,
        passingScore:quizAttempt.quiz.passingScore,
        timeTaken:quizAttempt.timeTaken,
        submittedAt:quizAttempt.submittedAt,
        questions:quizAttempt.answers.map((answer)=>{//we are mapping over the answer but we are getting question info
          return{
            questionId:answer.question.id,
            text:answer.question.text,
            fileName:answer.question.fileName,
            fileUrl:answer.question.fileUrl,
            type:answer.question.questionType,
            userAnswer:answer.chosenOptions[0],
            correctAnswer:answer.question.correct[0].optionId,
            point:getPointsForDifficulty(answer.question.difficulty),
            options:answer.question.options.map((option:any)=>({
              id:option.id,
              text:option.text
              
            }))
          }
         

        })
      }
      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      res.status(500).json({ error: 'Failed to fetch quiz results' });
    }
  });
  
  // Helper function to determine points based on difficulty
  function getPointsForDifficulty(difficulty: string): number {
    switch (difficulty) {
      case 'EASY':
        return 1;
      case 'INTERMEDIATE':
        return 2;
      case 'ADVANCE':
        return 3;
      default:
        return 1;
    }
  } 


  module.exports =router 