import express from "express";
import { Request, Response } from "express";
import { authenticateToken } from "../Middlewares/auth.middleware"; 
import {  checkRole } from "../Middlewares/checkRoles"; 
import { Role } from "../enum/Role"; 
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

const router = express.Router();

// Route accessible only to ADMIN


router.get("/admin-only", authenticateToken, checkRole([Role.ADMIN]), (req, res) => {
  res.json({ message: "Welcome, admin!" });
});

// Route accessible only to TEACHER
router.get("/teacher-only", authenticateToken, checkRole([Role.TEACHER]), (req, res) => {
  res.json({ message: "Welcome, teacher!" });
});

// Route accessible only to STUDENT
router.get("/student-only", authenticateToken, checkRole([Role.STUDENT]), (req, res) => {
  res.json({ message: "Welcome, student!" });
});

/**
 * @swagger
 * /users/Allteachers:
 *   get:
 *     summary: Get all teachers in the system
 *     description: Retrieves a list of all users with TEACHER role
 *     tags: [Users]
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
 *                     description: Unique identifier for the teacher
 *                     example: "507f1f77bcf86cd799439011"
 *                   firstName:
 *                     type: string
 *                     description: Teacher's first name
 *                     example: "John"
 *                   lastName:
 *                     type: string
 *                     description: Teacher's last name
 *                     example: "Doe"
 *                   email:
 *                     type: string
 *                     description: Teacher's email address
 *                     example: "john.doe@example.com"
 *                   role:
 *                     type: string
 *                     enum: [TEACHER]
 *                     description: User role (always TEACHER for this endpoint)
 *                   profilePicture:
 *                     type: string
 *                     nullable: true
 *                     description: URL to teacher's profile picture
 *                   status:
 *                     type: string
 *                     description: Online status of the teacher
 *                     example: "offline"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: When the teacher account was created
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     description: When the teacher account was last updated
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get('/Allteachers', async (req:Request, res:Response):Promise<any> => {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
      },
    });
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /users/get-user/{userId}:
 *   get:
 *     summary: Get user details by ID
 *     description: Retrieves basic information about a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         description: ID of the user to retrieve
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Unique user identifier
 *                     firstName:
 *                       type: string
 *                       description: User's first name
 *                     lastName:
 *                       type: string
 *                       description: User's last name
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: User's email address
 *                     role:
 *                       type: string
 *                       enum: [STUDENT, TEACHER, ADMIN]
 *                       description: User's role in the system
 *                     profilePicture:
 *                       type: string
 *                       nullable: true
 *                       description: URL to user's profile picture
 *                     status:
 *                       type: string
 *                       enum: [online, offline]
 *                       description: User's current status
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Account creation timestamp
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Last update timestamp
 *       400:
 *         description: Invalid user ID format
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to retrieve user"
 */
router.get('/get-user/:userId', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.params

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profilePicture: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.status(200).json({ user })
  } catch (error) {
    console.error('Error retrieving user:', error)
    res.status(500).json({ error: 'Failed to retrieve user' })
  }
})

module.exports =router