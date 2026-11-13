import express,{ Router } from "express";
import { signUp, signIn,VerifyUserCode,sendVerification } from '../controllers/auth.controller';
import {authenticateToken} from '../Middlewares/auth.middleware'
import {sendPasswordResetEmail,
    resetPassword,} from "../controllers/auth.controller";

const router = express.Router();

/**
 * @swagger
 * /auth/send-verification:
 *   post:
 *     summary: Send verification email to user
 *     description: Sends a verification email to the specified email address
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification email sent to user@example.com"
 *       400:
 *         description: Bad request (missing or invalid email)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to send verification email"
 */
router.post("/send-verification", sendVerification);

/**
 * @swagger
 * /auth/verifycode:
 *   post:
 *     summary: Verify user's authentication code
 *     description: Validates a verification code sent to user's email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - email
 *             properties:
 *               code:
 *                 type: string
 *                 description: Verification code received by the user
 *                 example: "123456"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Code verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification successful"
 *       400:
 *         description: Invalid verification code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid verification code."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to verify code"
 */
router.post("/verifycode", VerifyUserCode);

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with the provided information
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupInput'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request (missing or invalid fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email is required"
 *       409:
 *         description: Conflict (email already exists)
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     SignupInput:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - code
 *         - role
 *       properties:
 *         firstName:
 *           type: string
 *           example: "Rugal"
 *         lastName:
 *           type: string
 *           example: "Salpoui"
 *         email:
 *           type: string
 *           format: email
 *           example: "student@atlaslearn.local"
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: "polio"
 *         code:
 *           type: string
 *           example: "853753"
 *         role:
 *           type: string
 *           enum: [STUDENT, TEACHER, ADMIN]
 *           example: "STUDENT"
 *         profilePicture:
 *           type: string
 *           nullable: true
 *           example: "photo.png"
 * 
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *         profilePicture:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "507f1f77bcf86cd799439011"
 *         firstName: "Rugal"
 *         lastName: "Salpoui"
 *         email: "student@atlaslearn.local"
 *         role: "STUDENT"
 *         profilePicture: "photo.png"
 *         createdAt: "2023-08-01T12:00:00Z"
 *         updatedAt: "2023-08-01T12:00:00Z"
 */
router.post("/signup", signUp);

/**
 * @swagger
 * /auth/signin:
 *   post:
 *     summary: Authenticate a user
 *     description: Logs in a user with email and password credentials
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SigninInput'
 *     responses:
 *       200:
 *         description: Successful authentication
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request (missing or invalid fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email and password are required"
 *       401:
 *         description: Unauthorized (invalid credentials)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid email or password"
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     SigninInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "student@atlaslearn.local"
 *         password:
 *           type: string
 *           format: password
 *           example: "123456789"
 */
router.post("/signin", signIn);



// Password reset routes

/**
 * @swagger
 * /auth/send-password-reset-email:
 *   post:
 *     summary: Send password reset email
 *     description: Sends a password reset link to the specified email address
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetEmailInput'
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset link sent to yuri@yaho.com"
 *       400:
 *         description: Bad request (invalid or missing email)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Valid email is required"
 *       404:
 *         description: Email not found in system
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No account found with this email"
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     PasswordResetEmailInput:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's registered email address
 *           example: "yuri@yaho.com"
 */
router.post("/send-password-reset-email", sendPasswordResetEmail);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset user password
 *     description: Update user password using a valid JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordInput'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request (invalid or missing fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Token and new password are required"
 *       401:
 *         description: Unauthorized (invalid or expired token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid or expired token"
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * components:
 *   schemas:
 *     ResetPasswordInput:
 *       type: object
 *       required:
 *         - token
 *         - newPassword
 *       properties:
 *         token:
 *           type: string
 *           description: JWT authorization token
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         newPassword:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: New password
 *           example: "123456789"
 */
router.post("/reset-password", resetPassword);

module.exports =router  