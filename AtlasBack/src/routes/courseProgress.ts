import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient,ProgressStatus } from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";
const prisma = new PrismaClient();

const router = express.Router();


/**
 * @swagger
 * /courseprogress/create-course-progress:
 *   post:
 *     summary: Create a new course progress record
 *     description: Initializes progress tracking for a user in a course (status=IN_PROGRESS, progress=0)
 *     tags: [Course Progress]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - courseId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user
 *               courseId:
 *                 type: string
 *                 description: ID of the course
 *             example:
 *               userId: "507f1f77bcf86cd799439011"
 *               courseId: "507f1f77bcf86cd799439012"
 *     responses:
 *       201:
 *         description: Course progress created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseProgress'
 *       400:
 *         description: Progress already exists for this user and course
 *       500:
 *         description: Failed to create course progress
 * 
 * components:
 *   schemas:
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
 *         timeSpent:
 *           type: integer
 *         startedAt:
 *           type: string
 *           format: date-time
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
 *       default: NOT_STARTED
 */
router.post('/create-course-progress',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { userId, courseId } = req.body;

    try {
        // Check if progress already exists
        const existingProgress = await prisma.courseProgress.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId
                }
            }
        });

        if (existingProgress) {
            return res.status(400).json({ error: 'Progress already exists for this user and course' });
        }

        // Create new course progress
        const courseProgress = await prisma.courseProgress.create({
            data: {
                userId,
                courseId,
                status: ProgressStatus.IN_PROGRESS,
                progress: 0,
                startedAt: new Date()
            }
        });

        res.status(201).json(courseProgress);
    } catch (error) {
        console.error('Error creating course progress:', error);
        res.status(500).json({ error: 'Failed to create course progress' });
    }
});

module.exports =router 