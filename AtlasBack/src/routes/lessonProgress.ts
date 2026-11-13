import express,{ Router } from "express";
import { Request, Response } from "express";
import { PrismaClient,ProgressStatus } from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";
const prisma = new PrismaClient();

const router = express.Router();

/**
 * @swagger
 * /lessonprogress/create-lesson-progress:
 *   post:
 *     summary: Create a new lesson progress record
 *     description: Initializes progress tracking for a user on a specific lesson
 *     tags: [Progress Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - lessonId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user
 *                 example: "507f1f77bcf86cd799439011"
 *               lessonId:
 *                 type: string
 *                 description: ID of the lesson
 *                 example: "507f1f77bcf86cd799439012"
 *     responses:
 *       201:
 *         description: Lesson progress created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonProgress'
 *       400:
 *         description: Progress already exists or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Progress already exists for this user and lesson"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create lesson progress"
 *
 * components:
 *   schemas:
 *     LessonProgress:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         lessonId:
 *           type: string
 *         status:
 *           $ref: '#/components/schemas/ProgressStatus'
 *         isCompleted:
 *           type: boolean
 *           default: false
 *         startedAt:
 *           type: string
 *           format: date-time
 *         timeSpent:
 *           type: integer
 *           description: Time spent in seconds
 *           default: 0
 *         lastPlaybackPosition:
 *           type: integer
 *           nullable: true
 *           description: Last playback position for video lessons (in seconds)
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
 *       default: IN_PROGRESS
 *       description: The progress status of the lesson
 */
router.post('/create-lesson-progress',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { userId, lessonId } = req.body;

    try {
        // Check if progress already exists
        const existingProgress = await prisma.lessonProgress.findUnique({
            where: {
                userId_lessonId: {
                    userId,
                    lessonId
                }
            }
        });

        if (existingProgress) {
            return res.status(400).json({ error: 'Progress already exists for this user and lesson' });
        }

        // Create new lesson progress
        const lessonProgress = await prisma.lessonProgress.create({
            data: {
                userId,
                lessonId,
                status: ProgressStatus.IN_PROGRESS,
                isCompleted: false,
                startedAt:new Date(),
                timeSpent: 0
            }
        });

        res.status(201).json(lessonProgress);
    } catch (error) {
        console.error('Error creating lesson progress:', error);
        res.status(500).json({ error: 'Failed to create lesson progress' });
    }
});



//route to update the progresses made by a user
/**
 * @swagger
 * /lessonprogress/lesson-progress-update/{lessonId}:
 *   put:
 *     summary: Update lesson progress and cascade updates to chapter/course progress
 *     description: |
 *       Marks a lesson as completed and automatically updates:
 *       - Chapter progress (percentage of completed lessons in chapter)
 *       - Course progress (percentage of completed lessons in course)
 *       Calculates time spent at each level (lesson, chapter, course)
 *     tags: [Progress Tracking]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the lesson to mark as completed
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - chapterId
 *               - courseId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user
 *               chapterId:
 *                 type: string
 *                 description: ID of the containing chapter
 *               courseId:
 *                 type: string
 *                 description: ID of the containing course
 *             example:
 *               userId: "507f1f77bcf86cd799439011"
 *               chapterId: "507f1f77bcf86cd799439012"
 *               courseId: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Progress updated at lesson, chapter, and course levels
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProgressUpdateResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 *       404:
 *         description: Lesson progress not found
 *       500:
 *         description: Failed to update progress
 * 
 * components:
 *   schemas:
 *     ProgressUpdateResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Lesson progress updated successfully"
 *         progress:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             status:
 *               $ref: '#/components/schemas/ProgressStatus'
 *             isCompleted:
 *               type: boolean
 *             timeSpent:
 *               type: integer
 *               description: Time spent on lesson in seconds
 *             lastPlaybackPosition:
 *               type: integer
 *               nullable: true
 *             lesson:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                 duration:
 *                   type: integer
 *                   nullable: true
 *             completedAt:
 *               type: string
 *               format: date-time
 * 
 *     ProgressStatus:
 *       type: string
 *       enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *       default: NOT_STARTED
 */ 
router.put('/lesson-progress-update/:lessonId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { lessonId } = req.params;
    const {userId,chapterId,courseId} = req.body; 

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized - User not authenticated' });
    }

    try {
        
        const existingProgress = await prisma.lessonProgress.findFirst({
            where: {
                userId,
                lessonId
            }
        });

        if (!existingProgress) {
            return res.status(404).json({ error: 'Lesson progress not found' });
        }

        // Calculate time spent in seconds
        const now = new Date();
        const startedAt = existingProgress.startedAt || now; 
        const timeSpentlesson = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

     
        const updatedProgress = await prisma.lessonProgress.update({
            where: {
                id: existingProgress.id
            },
            data: {
                status: 'COMPLETED' as ProgressStatus,
                isCompleted: true,
                completedAt: now,
                timeSpent: timeSpentlesson,
                lastAccessedAt: now
            },
            include: {
                lesson: {
                    select: {
                        title: true,
                        duration: true
                    }
                }
            }
        });


         // NEW: Calculate and update chapter progress
        // 1. Count completed lessons in this chapter for this user
        const completedLessonsCount = await prisma.lessonProgress.count({
            where: {
                userId,
                isCompleted: true,
                lesson: { chapterId: chapterId }// Only count lessons belonging to this chapter
            }
        });

        // 2. Count total lessons in this chapter
        const totalLessonsCount = await prisma.lesson.count({
            where: { chapterId: chapterId } 
        });

        // 3. Calculate new progress percentage
        const chapterProgressPercentage = totalLessonsCount > 0 
            ? Math.round((completedLessonsCount / totalLessonsCount) * 100) 
            : 0;


        // 4. calculate Time spent for chapter completion

        const existingChapterProgress = await prisma.chapterProgress.findUnique({
            where: {
                userId_chapterId: {
                    userId,
                    chapterId
                }
            }
        });
    
        let timeSpentchapter = 0;
        if (chapterProgressPercentage === 100 && existingChapterProgress?.startedAt) {
            timeSpentchapter = Math.floor((now.getTime() - existingChapterProgress.startedAt.getTime()) / 1000);
        }



        // 4. Update chapter progress
        await prisma.chapterProgress.upsert({
            where: {
                userId_chapterId: {
                    userId,
                    chapterId: chapterId
                }
            },
            update: {
                progress: chapterProgressPercentage,
                status: chapterProgressPercentage === 100 ? 'COMPLETED' : 'IN_PROGRESS',
                lastAccessedAt: now,
                timeSpent:timeSpentchapter
            },
            create: {
                userId,
                chapterId: chapterId,
                progress: chapterProgressPercentage,
                status: chapterProgressPercentage === 100 ? 'COMPLETED' : 'IN_PROGRESS',
                lastAccessedAt: now
            }
        });




        //NEW UPDATE OF THE COURSE MODEL


        // 1. Count completed lessons in this course for this user
    const completedLessonsCountcourse = await prisma.lessonProgress.count({
        where: {
            userId,
            isCompleted: true,
            lesson: { 
                chapter: { courseId } // Nested relation: lesson → chapter → course
            }
        }
    });

    // 2. Count total lessons in this course
    const totalLessonsCountcourse = await prisma.lesson.count({
        where: { 
            chapter: { courseId } // Lessons belonging to chapters in this course
        }
    });

    // 3. Calculate course progress percentage
    const courseProgressPercentage = totalLessonsCountcourse > 0 
        ? Math.round((completedLessonsCountcourse / totalLessonsCountcourse) * 100)
        : 0;

    //calculate time spent for course completion
     
    const existingCourseProgress = await prisma.courseProgress.findUnique({
        where: {
            userId_courseId: {
                userId,
                courseId
            }
        }
    });

    let timeSpentcourse = 0;
        if (courseProgressPercentage === 100 && existingCourseProgress?.startedAt) {
            timeSpentcourse = Math.floor((now.getTime() - existingCourseProgress.startedAt.getTime()) / 1000);
        }


   

    // 4. Update course progress
    await prisma.courseProgress.upsert({
        where: {
            userId_courseId: {
                userId,
                courseId
            }
        },
        update: {
            progress: courseProgressPercentage,
            status: courseProgressPercentage === 100 ? 'COMPLETED' : 'IN_PROGRESS',
            lastAccessedAt: new Date(),
            timeSpent:timeSpentcourse
        },
        create: {
            userId,
            courseId,
            progress: courseProgressPercentage,
            status: courseProgressPercentage === 100 ? 'COMPLETED' : 'IN_PROGRESS',
            lastAccessedAt: new Date()
        }
    });



        res.status(200).json({
            message: 'Lesson progress updated successfully',
            progress: {
                id: updatedProgress.id,
                status: updatedProgress.status,
                isCompleted: updatedProgress.isCompleted,
                timeSpent: updatedProgress.timeSpent,
                lastPlaybackPosition: updatedProgress.lastPlaybackPosition,
                lesson: {
                    title: updatedProgress.lesson.title,
                    duration: updatedProgress.lesson.duration
                },
                completedAt: updatedProgress.completedAt
            }
        });

    } catch (error) {
        console.error('Error updating lesson progress:', error);
        res.status(500).json({ error: 'Failed to update lesson progress' });
    }
});





//route to update the progresses made by a user every time a lesson is created 
/**
 * @swagger
 * /lessonprogress/lessoncreation-progress-update/{lessonId}:
 *   put:
 *     summary: Update course and chapter progress based on lesson completion
 *     description: |
 *       Updates progress tracking at multiple levels:
 *       - Calculates chapter progress based on completed lessons in chapter
 *       - Calculates course progress based on completed lessons in course
 *       - Updates time spent calculations when chapters/courses are completed
 *     tags: [Progress Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the lesson being tracked
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - chapterId
 *               - courseId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user making progress
 *               chapterId:
 *                 type: string
 *                 description: ID of the chapter containing the lesson
 *               courseId:
 *                 type: string
 *                 description: ID of the course containing the chapter
 *             example:
 *               userId: "507f1f77bcf86cd799439011"
 *               chapterId: "507f1f77bcf86cd799439012"
 *               courseId: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Progress successfully updated at chapter and course levels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lesson progress updated successfully"
 *       401:
 *         description: Unauthorized - User not authenticated
 *       404:
 *         description: Lesson progress not found
 *       500:
 *         description: Failed to update progress
 * 
 * components:
 *   schemas:
 *     ProgressStatus:
 *       type: string
 *       enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *       default: NOT_STARTED
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.put('/lessoncreation-progress-update/:lessonId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
    const { lessonId } = req.params;
    const {userId,chapterId,courseId} = req.body; 

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized - User not authenticated' });
    }

    try {
        
        const existingProgress = await prisma.lessonProgress.findFirst({
            where: {
                userId,
                lessonId
            }
        });

        if (!existingProgress) {
            return res.status(404).json({ error: 'Lesson progress not found' });
        }

        // Calculate time spent in seconds
        const now = new Date();
        
        

     
        

         // NEW: Calculate and update chapter progress
        // 1. Count completed lessons in this chapter for this user
        const completedLessonsCount = await prisma.lessonProgress.count({
            where: {
                userId,
                isCompleted: true,
                lesson: { chapterId: chapterId }// Only count lessons belonging to this chapter
            }
        });

        // 2. Count total lessons in this chapter
        const totalLessonsCount = await prisma.lesson.count({
            where: { chapterId: chapterId } 
        });

        // 3. Calculate new progress percentage
        const chapterProgressPercentage = totalLessonsCount > 0 
            ? Math.round((completedLessonsCount / totalLessonsCount) * 100) 
            : 0;


        // 4. calculate Time spent for chapter completion

        const existingChapterProgress = await prisma.chapterProgress.findUnique({
            where: {
                userId_chapterId: {
                    userId,
                    chapterId
                }
            }
        });
    
        let timeSpentchapter = 0;
        if (chapterProgressPercentage === 100 && existingChapterProgress?.startedAt) {
            timeSpentchapter = Math.floor((now.getTime() - existingChapterProgress.startedAt.getTime()) / 1000);
        }



        // 4. Update chapter progress
        await prisma.chapterProgress.upsert({
            where: {
                userId_chapterId: {
                    userId,
                    chapterId: chapterId
                }
            },
            update: {
                progress: chapterProgressPercentage,
                status: chapterProgressPercentage === 100 ? 'COMPLETED' : 'IN_PROGRESS',
                lastAccessedAt: now,
                timeSpent:timeSpentchapter
            },
            create: {
                userId,
                chapterId: chapterId,
                progress: chapterProgressPercentage,
                status: chapterProgressPercentage === 100 ? 'COMPLETED' : 'IN_PROGRESS',
                lastAccessedAt: now
            }
        });




        //NEW UPDATE OF THE COURSE MODEL


        // 1. Count completed lessons in this course for this user
    const completedLessonsCountcourse = await prisma.lessonProgress.count({
        where: {
            userId,
            isCompleted: true,
            lesson: { 
                chapter: { courseId } // Nested relation: lesson → chapter → course
            }
        }
    });

    // 2. Count total lessons in this course
    const totalLessonsCountcourse = await prisma.lesson.count({
        where: { 
            chapter: { courseId } // Lessons belonging to chapters in this course
        }
    });

    // 3. Calculate course progress percentage
    const courseProgressPercentage = totalLessonsCountcourse > 0 
        ? Math.round((completedLessonsCountcourse / totalLessonsCountcourse) * 100)
        : 0;

    //calculate time spent for course completion
     
    const existingCourseProgress = await prisma.courseProgress.findUnique({
        where: {
            userId_courseId: {
                userId,
                courseId
            }
        }
    });

    let timeSpentcourse = 0;
        if (courseProgressPercentage === 100 && existingCourseProgress?.startedAt) {
            timeSpentcourse = Math.floor((now.getTime() - existingCourseProgress.startedAt.getTime()) / 1000);
        }


   

    // 4. Update course progress
    await prisma.courseProgress.upsert({
        where: {
            userId_courseId: {
                userId,
                courseId
            }
        },
        update: {
            progress: courseProgressPercentage,
            status: courseProgressPercentage === 100 ? 'COMPLETED' : 'IN_PROGRESS',
            lastAccessedAt: new Date(),
            timeSpent:timeSpentcourse
        },
        create: {
            userId,
            courseId,
            progress: courseProgressPercentage,
            status: courseProgressPercentage === 100 ? 'COMPLETED' : 'IN_PROGRESS',
            lastAccessedAt: new Date()
        }
    });



        res.status(200).json({
            message: 'Lesson progress updated successfully',
            
        });

    } catch (error) {
        console.error('Error updating lesson progress:', error);
        res.status(500).json({ error: 'Failed to update lesson progress' });
    }
});



module.exports =router 