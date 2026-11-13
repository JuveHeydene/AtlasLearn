import express,{ Router } from "express";
import { Request, Response } from "express";
import { fileType, PrismaClient } from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";
const prisma = new PrismaClient();

const router = express.Router();

/**
 * @swagger
 * /notification/create-notifications:
 *   post:
 *     summary: Create a new notification
 *     description: Creates a notification for a user, optionally linked to a course
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to notify
 *                 example: "507f1f77bcf86cd799439011"
 *               courseId:
 *                 type: string
 *                 nullable: true
 *                 description: Optional ID of the related course
 *                 example: "6624b5a3e71a1a9d4a8b9b7a"
 *               title:
 *                 type: string
 *                 description: Notification title
 *                 example: "New assignment available"
 *               message:
 *                 type: string
 *                 nullable: true
 *                 description: Detailed notification message
 *                 example: "Please complete the assignment by Friday"
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Notification ID
 *                 userId:
 *                   type: string
 *                   description: User ID who received the notification
 *                 courseId:
 *                   type: string
 *                   nullable: true
 *                   description: Associated course ID if provided
 *                 title:
 *                   type: string
 *                   description: Notification title
 *                 message:
 *                   type: string
 *                   nullable: true
 *                   description: Notification message
 *                 seen:
 *                   type: boolean
 *                   default: false
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 user:
 *                   type: object
 *                   properties:
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                 course:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     title:
 *                       type: string
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "userId and title are required fields"
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: User or course not found
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "User not found"
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "Course not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create notification"
 */
router.post('/create-notifications', authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { userId, courseId, title, message } = req.body;

    try {
        // Validate required fields
        if (!userId || !title) {
            return res.status(400).json({ 
                error: 'userId and title are required fields' 
            });
        }

        // Verify user exists
        const userExists = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!userExists) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify course exists if courseId is provided
        if (courseId) {
            const courseExists = await prisma.course.findUnique({
                where: { id: courseId }
            });
            if (!courseExists) {
                return res.status(404).json({ error: 'Course not found' });
            }
        }

        // Create notification with only provided fields
        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                ...(message && { message }),         // Only add if message exists
                ...(courseId && { courseId }),       // Only add if courseId exists
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                ...(courseId && {  // Only include course if courseId exists
                    course: {
                        select: {
                            title: true
                        }
                    }
                })
            }
        });

        res.status(201).json(notification);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

/**
 * @swagger
 * /notification/notifications/student/{studentId}:
 *   get:
 *     summary: Get student notifications with unseen count
 *     description: Retrieves all notifications for a student, optionally filtered by course, with unseen notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         description: ID of the student to retrieve notifications for
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *           example: "6624b5a3e71a1a9d4a8b9b7a"
 *         description: Optional course ID to filter notifications
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Notification ID
 *                       title:
 *                         type: string
 *                         description: Notification title
 *                       message:
 *                         type: string
 *                         nullable: true
 *                         description: Notification content
 *                       seen:
 *                         type: boolean
 *                         description: Whether notification has been viewed
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: When notification was created
 *                       creatorFirstName:
 *                         type: string
 *                         nullable: true
 *                         description: First name of notification creator
 *                       creatorLastName:
 *                         type: string
 *                         nullable: true
 *                         description: Last name of notification creator
 *                       courseTitle:
 *                         type: string
 *                         nullable: true
 *                         description: Title of related course if applicable
 *                       chapterTitle:
 *                         type: string
 *                         nullable: true
 *                         description: Title of related chapter if applicable
 *                       chapterOrder:
 *                         type: integer
 *                         nullable: true
 *                         description: Order of related chapter if applicable
 *                       courseId:
 *                         type: string
 *                         nullable: true
 *                         description: ID of related course if applicable
 *                       chapterId:
 *                         type: string
 *                         nullable: true
 *                         description: ID of related chapter if applicable
 *                       creatorId:
 *                         type: string
 *                         description: ID of notification creator
 *                 unseenCount:
 *                   type: integer
 *                   description: Count of unseen notifications
 *                 totalCount:
 *                   type: integer
 *                   description: Total number of notifications
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
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Student not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Student not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to retrieve notifications"
 */
router.get('/notifications/student/:studentId', authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { studentId } = req.params;
    const { courseId } = req.query; // Optional course filter

    try {
        // Validate studentId
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required' });
        }

        // Verify student exists
        const studentExists = await prisma.user.findUnique({
            where: { id: studentId }
        });
        if (!studentExists) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Build base where clause
        const baseWhere = {
            studentId: studentId,
            ...(courseId && { courseId: courseId as string }) // Add course filter if provided
        };

        // Get all notifications and unseen count in parallel
        const [notifications, unseenCount] = await Promise.all([
            // Get all notifications
            prisma.notification.findMany({
                where: baseWhere,
                include: {
                    creator: {
                        select: {
                            firstName: true,
                            lastName: true,
                            
                        }
                    },
                    course: {
                        select: {
                            title: true,
                            
                        }
                    },
                    chapter: {
                        select: {
                            title: true,
                            order:true 
                            
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            // Count unseen notifications
            prisma.notification.count({
                where: {
                    ...baseWhere,
                    seen: false
                }
            })
        ]);
        
         // Flatten the notification data
         const flattenedNotifications = notifications.map(notification => ({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            seen: notification.seen,
            createdAt: notification.createdAt,
            creatorFirstName: notification.creator?.firstName,
            creatorLastName: notification.creator?.lastName,
            courseTitle: notification.course?.title,
            chapterTitle: notification.chapter?.title,
            chapterOrder: notification.chapter?.order,
            courseId: notification.courseId,
            chapterId: notification.chapterId,
            creatorId: notification.creatorId
        }));
        res.status(200).json({
            notifications:flattenedNotifications,
            unseenCount,
            totalCount: notifications.length
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to retrieve notifications' });
    }
});


/**
 * @swagger
 * /notification/notifications/mark-as-seen/{userId}:
 *   patch:
 *     summary: Mark notifications as seen
 *     description: Updates the seen status of one or multiple notifications for a specific user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         description: ID of the user who owns the notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 oneOf:
 *                   - type: string
 *                     description: Single notification ID
 *                     example: "6624b5a3e71a1a9d4a8b9b7a"
 *                   - type: array
 *                     items:
 *                       type: string
 *                     description: Array of notification IDs
 *                     example: ["6624b5a3e71a1a9d4a8b9b7a", "6624b5a3e71a1a9d4a8b9b7b"]
 *     responses:
 *       200:
 *         description: Notifications successfully marked as seen
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Notifications marked as seen"
 *                 count:
 *                   type: integer
 *                   description: Number of notifications updated
 *                   example: 2
 *       400:
 *         description: Invalid request (missing or empty notification IDs)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "At least one notification ID is required"
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden (some notifications not found or not owned by user)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Some notifications not found or not owned by user"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to update notifications"
 */
router.patch('/notifications/mark-as-seen/:userId', authenticateToken, async (req: Request, res: Response):Promise<any> => {
    const { notificationIds } = req.body; // single ID or array of IDs
    const { userId } = req.params;

    try {
        // Validate input
        if (!notificationIds || (Array.isArray(notificationIds) && notificationIds.length === 0)) {
            return res.status(400).json({ error: 'At least one notification ID is required' });
        }

        // Convert single ID to array for uniform processing
        const idsToUpdate = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

        // Verify notifications belong to the user
        const notifications = await prisma.notification.findMany({
            where: {
                id: { in: idsToUpdate },
                studentId: userId // Ensure notifications belong to requesting user
            },
            select: { id: true }
        });

        if (notifications.length !== idsToUpdate.length) {
            return res.status(403).json({ error: 'Some notifications not found or not owned by user' });
        }

        // Update notifications
        const updatedNotifications = await prisma.notification.updateMany({
            where: {
                id: { in: idsToUpdate },
                studentId: userId // Extra safety check
            },
            data: {
                seen: true
            }
        });

        res.status(200).json({
            message: 'Notifications marked as seen',
            count: updatedNotifications.count
        });
    } catch (error) {
        console.error('Error updating notifications:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});
module.exports =router 