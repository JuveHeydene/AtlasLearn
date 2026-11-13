import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient,ProgressStatus } from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";
const prisma = new PrismaClient();

const router = express.Router();

/**
 * @swagger
 * /chapterprogress/create-chapter-progress:
 *   post:
 *     summary: Create a new chapter progress record
 *     description: Initializes progress tracking for a user on a specific chapter
 *     tags: [Progress Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - chapterId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user
 *                 example: "507f1f77bcf86cd799439011"
 *               chapterId:
 *                 type: string
 *                 description: ID of the chapter
 *                 example: "507f1f77bcf86cd799439012"
 *     responses:
 *       201:
 *         description: Chapter progress created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChapterProgress'
 *       400:
 *         description: Progress already exists or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Progress already exists for this user and chapter"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create chapter progress"
 *
 * components:
 *   schemas:
 *     ChapterProgress:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         chapterId:
 *           type: string
 *         status:
 *           $ref: '#/components/schemas/ProgressStatus'
 *         progress:
 *           type: number
 *           description: Completion percentage (0-100)
 *           example: 0
 *         startedAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         timeSpent:
 *           type: integer
 *           description: Time spent in seconds
 *           example: 0
 *         lastAccessedAt:
 *           type: string
 *           format: date-time
 *
 *     ProgressStatus:
 *       type: string
 *       enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *       default: IN_PROGRESS
 *       description: The progress status of the chapter
 */
router.post('/create-chapter-progress',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { userId, chapterId } = req.body;

    try {
        // Check if progress already exists
        const existingProgress = await prisma.chapterProgress.findUnique({
            where: {
                userId_chapterId: {
                    userId,
                    chapterId
                }
            }
        });

        if (existingProgress) {
            return res.status(400).json({ error: 'Progress already exists for this user and chapter' });
        }

        // Create new chapter progress
        const chapterProgress = await prisma.chapterProgress.create({
            data: {
                userId,
                chapterId,
                status: ProgressStatus.IN_PROGRESS,
                startedAt: new Date(),
                progress: 0
            }
        });

        res.status(201).json(chapterProgress);
    } catch (error) {
        console.error('Error creating chapter progress:', error);
        res.status(500).json({ error: 'Failed to create chapter progress' });
    }
});

module.exports =router 