import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient} from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";

const prisma = new PrismaClient();
const router = express.Router();



//create an assignment submission
/**
 * @swagger
 * /assignmentsubs/assignments/{assignmentId}/submissions:
 *   post:
 *     summary: Submit an assignment
 *     tags: [AssignmentSubmissions]
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubmissionInput'
 *     responses:
 *       201:
 *         description: Submission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmissionWithDetails'
 *       400:
 *         description: Missing required fields or invalid data
 *       404:
 *         description: Assignment or student not found
 *       409:
 *         description: Student already submitted this assignment
 *       500:
 *         description: Internal server error
 */
router.post('/assignments/:assignmentId/submissions',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { assignmentId } = req.params;
    const { userId, fileUrl,filetype,fileName } = req.body;
  
    try {
      // Validate required fields
      if (!userId) {
        return res.status(400).json({ error: 'studentId is required' });
      }
  
      // Verify assignment exists
      const assignmentExists = await prisma.assignment.findUnique({
        where: { id: assignmentId }
      });
      if (!assignmentExists) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
  
      // Verify student exists
      const studentExists = await prisma.user.findUnique({
        where: { id: userId }
      });
      if (!studentExists) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      // Create submission
      const submission = await prisma.assignmentSubmission.create({
        data: {
          assignmentId,
          studentId:userId,
          fileUrl: fileUrl || null,
          fileName:fileName ||null,
          filetype:filetype ||"UNKNOWN",
          status:"SUBMITTED"
        },
        include: {
          assignment: {
            select: {
              title: true,
              dueDate: true
            }
          },
          student: {
            select: {
              firstName: true,
              lastName:true,
              email: true
            }
          }
        }
      });
  
      res.status(201).json(submission);
    } catch (error) {
      if ((error as { code: string }).code === 'P2002') {
        return res.status(409).json({ 
          error: 'Student already submitted this assignment' 
        });
      }
      console.error('Error creating submission:', error);
      res.status(500).json({ error: 'Failed to create submission' });
    }
  });



  //get all assignments submitted 
/**
 * @swagger
 * /assignmentsubs/assignments/{assignmentId}/submissions:
 *   get:
 *     summary: Get all submissions for an assignment
 *     tags: [AssignmentSubmissions]
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
 *     responses:
 *       200:
 *         description: List of submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubmissionWithDetails'
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Internal server error
 */
router.get('/assignments/:assignmentId/submissions',authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { assignmentId } = req.params;
  
    try {
      // Verify assignment exists
      const assignmentExists = await prisma.assignment.findUnique({
        where: { id: assignmentId }
      });
      if (!assignmentExists) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
  
      // Get submissions with student details
      const submissions = await prisma.assignmentSubmission.findMany({
        where: { assignmentId },
        orderBy: { submittedAt: 'desc' },
        include: {
          student: {
            select: {
              firstName: true,
              lastName:true,
              email: true,
              id: true
            }
          },
          assignment:{
            select:{
              title:true,
              description:true 
            }
          }
        }
      });
  
      res.status(200).json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  });


  //get a student submission

/**
 * @swagger
 * /assignmentsubs/assignments/{assignmentId}/submissions/{studentId}:
 *   get:
 *     summary: Get a specific student's submission for an assignment
 *     description: Retrieves submission details including student information and assignment details
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the student
 *     responses:
 *       200:
 *         description: Submission details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssignmentSubmissionWithDetails'
 *       203:
 *         description: No submission exists for this student and assignment
 *       404:
 *         description: Assignment or student not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 * 
 * components:
 *   schemas:
 *     AssignmentSubmissionWithDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         assignmentId:
 *           type: string
 *         studentId:
 *           type: string
 *         fileUrl:
 *           type: string
 *           nullable: true
 *         fileName:
 *           type: string
 *           nullable: true
 *         filetype:
 *           type: string
 *           nullable: true
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         gradedAt:
 *           type: string
 *           format: date-time
 *         grade:
 *           type: number
 *           nullable: true
 *         status:
 *           $ref: '#/components/schemas/AssignmentStatus'
 *         feedback:
 *           type: string
 *           nullable: true
 *         student:
 *           $ref: '#/components/schemas/SubmissionStudent'
 *         assignment:
 *           $ref: '#/components/schemas/SubmissionAssignment'
 * 
 *     SubmissionStudent:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *         id:
 *           type: string
 * 
 *     SubmissionAssignment:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date-time
 *         maxScore:
 *           type: number
 * 
 *     AssignmentStatus:
 *       type: string
 *       enum: [GRADED, SUBMITTED, NOTSUBMITTED]
 *       description: Status of the assignment submission
 */  
  router.get('/assignments/:assignmentId/submissions/:studentId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { assignmentId, studentId } = req.params;

    try {
        // Verify assignment exists
        const assignmentExists = await prisma.assignment.findUnique({
            where: { id: assignmentId } 
        });
        if (!assignmentExists) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        // Verify student exists
        const studentExists = await prisma.user.findUnique({
            where: { id: studentId }
        });
        if (!studentExists) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Get the specific submission
        const submission = await prisma.assignmentSubmission.findUnique({
            where: {
                assignmentId_studentId: {
                    assignmentId: assignmentId,
                    studentId: studentId
                }
            },
            include: {
                student: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        id: true
                    }
                },
                assignment: {
                    select: {
                        title: true,
                        description: true,
                        dueDate: true,
                        maxScore:true
                    }
                }
            }
        });
        if(!submission){
          return res.status(203).json("no submition now")
        } 

        res.status(201).json(submission);
    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
});


//update a submission

// Update submission route for the student 

/**
 * @swagger
 * /assignmentsubs/assignments/{assignmentId}/submissions/{studentId}:
 *   put:
 *     summary: Update a student's assignment submission
 *     description: Updates submission details including file information and status
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileUrl
 *               - fileName
 *               - filetype
 *             properties:
 *               fileUrl:
 *                 type: string
 *                 description: URL of the submitted file
 *               fileName:
 *                 type: string
 *                 description: Name of the submitted file
 *               filetype:
 *                 type: string
 *                 description: Type of the submitted file
 *               status:
 *                 type: string
 *                 enum: [GRADED, SUBMITTED, NOTSUBMITTED]
 *                 default: SUBMITTED
 *                 description: Status of the submission
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdatedSubmission'
 *       400:
 *         description: Missing required file information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to update submission
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 * 
 * components:
 *   schemas:
 *     UpdatedSubmission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         assignmentId:
 *           type: string
 *         studentId:
 *           type: string
 *         fileUrl:
 *           type: string
 *         fileName:
 *           type: string
 *         filetype:
 *           type: string
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         status:
 *           $ref: '#/components/schemas/AssignmentStatus'
 *         assignment:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 * 
 *     AssignmentStatus:
 *       type: string
 *       enum: [GRADED, SUBMITTED, NOTSUBMITTED]
 *       description: Status of the assignment submission
 * 
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
router.put('/assignments/:assignmentId/submissions/:studentId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { assignmentId, studentId } = req.params;
  const { fileUrl, fileName, filetype, status } = req.body;
 console.log (fileUrl,fileName,filetype)
  try {
    // Validate input
    if (!fileUrl || !fileName || !filetype) {
      return res.status(400).json({ error: 'Missing file information' });
    }

    const submission = await prisma.assignmentSubmission.update({
      where: {
        assignmentId_studentId: { assignmentId, studentId }
      },
      data: {
        fileUrl,
        fileName,
        filetype,
        status: status || "SUBMITTED",
        submittedAt: new Date()
      },
      include: {
        assignment: {
          select: { title: true }
        }
      }
    });

    res.status(200).json(submission);
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});



//Update route grade for teacher

/**
 * @swagger
 * /assignmentsubs/assignments/{assignmentId}/submissions/{studentId}/grade:
 *   put:
 *     summary: Grade a student's assignment submission
 *     description: Updates a submission with grade, feedback, and marks it as GRADED
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grade
 *             properties:
 *               grade:
 *                 type: number
 *                 description: Numeric grade for the assignment
 *                 example: 85.5
 *               feedback:
 *                 type: string
 *                 description: Optional feedback for the student
 *                 example: "Good work, but needs more references."
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GradedSubmission'
 *       400:
 *         description: Invalid grade input
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ErrorGradeRequired'
 *                 - $ref: '#/components/schemas/ErrorGradeExceedsMax'
 *       404:
 *         description: Submission not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNotFound'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorServer'
 * 
 * components:
 *   schemas:
 *     GradedSubmission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         assignmentId:
 *           type: string
 *         studentId:
 *           type: string
 *         grade:
 *           type: number
 *         feedback:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [GRADED]
 *         gradedAt:
 *           type: string
 *           format: date-time
 *         assignment:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             maxScore:
 *               type: number
 *         student:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             email:
 *               type: string
 * 
 *     ErrorGradeRequired:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Grade is required"
 * 
 *     ErrorGradeExceedsMax:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Grade cannot exceed maximum score of 100"
 * 
 *     ErrorNotFound:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Submission not found"
 * 
 *     ErrorServer:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Failed to grade submission"
 * 
 *     AssignmentStatus:
 *       type: string
 *       enum: [GRADED, SUBMITTED, NOTSUBMITTED]
 *       description: Status of the assignment submission
 * 
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
router.put('/assignments/:assignmentId/submissions/:studentId/grade',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { assignmentId, studentId } = req.params;
  const { grade, feedback } = req.body;

  try {
    // Validate input
    if (grade === undefined || grade === null) {
      return res.status(400).json({ error: 'Grade is required' });
    }

    // Verify the submission exists
    const existingSubmission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: { assignmentId, studentId }
      },
      include: {
        assignment: {
          select: { maxScore: true }
        }
      }
    });

    if (!existingSubmission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Validate grade is within assignment's max score
    if (grade > existingSubmission.assignment.maxScore) {
      return res.status(400).json({ 
        error: `Grade cannot exceed maximum score of ${existingSubmission.assignment.maxScore}` 
      });
    }

    // Update the submission with grading information
    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: {
        assignmentId_studentId: { assignmentId, studentId }
      },
      data: {
        grade: Number(grade),
        feedback: feedback || null,
        status: "GRADED",
        gradedAt: new Date()  // Adding a gradedAt timestamp
      },
      include: {
        assignment: {
          select: {
            title: true,
            maxScore: true
          }
        },
        student: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.status(200).json(updatedSubmission);
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});
  module.exports =router 