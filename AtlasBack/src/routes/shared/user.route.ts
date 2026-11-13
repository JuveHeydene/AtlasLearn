import {createUserController,updateUserRoleController,deleteUserController} from "../../controllers/admin/user.controller"
import express,{ Router } from "express";
import { authenticateToken } from "../../Middlewares/auth.middleware"; 
import {  checkRole } from "../../Middlewares/checkRoles"; 
import {getAllUsersController, getAllUsersControllerwithoutfilter} from "../../controllers/shared/user.controller"

const router = express.Router();


/////Shared ROUTE
/**
 * @swagger
 * /user/shared-getallUser:
 *   post:
 *     summary: Get filtered and paginated list of users
 *     description: Retrieves users based on filters with pagination support
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filters:
 *                 type: object
 *                 properties:
 *                   startsWith:
 *                     type: string
 *                     description: Filter users whose names start with this string
 *                     example: "Joh"
 *                   contains:
 *                     type: string
 *                     description: Filter users whose names contain this string
 *                     example: "ohn"
 *                   role:
 *                     type: string
 *                     enum: [STUDENT, TEACHER, ADMIN]
 *                     description: Filter users by role
 *                     example: "TEACHER"
 *               pagination:
 *                 type: object
 *                 properties:
 *                   page:
 *                     type: integer
 *                     minimum: 1
 *                     default: 1
 *                     description: Page number for pagination
 *                   limit:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 100
 *                     default: 10
 *                     description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved filtered users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of users matching filters
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                     limit:
 *                       type: integer
 *                       description: Number of items per page
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 *       400:
 *         description: Invalid request parameters
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
 *                 message:
 *                   type: string
 *                   example: "Detailed error description"
 *
 *
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         firstName:
 *           type: string
 *           example: "John"
 *         lastName:
 *           type: string
 *           example: "Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@example.com"
 *         role:
 *           type: string
 *           enum: [STUDENT, TEACHER, ADMIN]
 *           example: "TEACHER"
 *         profilePicture:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/profile.jpg"
 *         status:
 *           type: string
 *           example: "online"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-02T00:00:00Z"
 */
router.post("/shared-getallUser", getAllUsersController);

/**
 * @swagger
 * /user/shared-getallUsernofilter:
 *   post:
 *     summary: Get all users (No filters applied)
 *     description: Retrieves a list of all users in the system. This endpoint does not apply any filters.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Internal server error while fetching users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 *                 message:
 *                   type: string
 *                   example: "Database connection failed"
 */
router.post("/shared-getallUsernofilter", getAllUsersControllerwithoutfilter);




//////ADMIN ROUTE SECTION 


// route to create user by admin 
/**
 * @swagger
 * /user/admin-createUser:
 *   post:
 *     summary: Create a new user (Admin only)
 *     description: Creates a new user account with the provided details
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - role
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *                 description: User's last name
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePassword123!"
 *                 description: User's password (will be hashed)
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [STUDENT, TEACHER, ADMIN]
 *                 example: "TEACHER"
 *                 description: User's role in the system
 *               profilePicture:
 *                 type: string
 *                 nullable: true
 *                 example: "https://example.com/profile.jpg"
 *                 description: URL to user's profile picture
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User created successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Missing required fields"
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "Email already in use."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error."
 *
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         firstName:
 *           type: string
 *           example: "John"
 *         lastName:
 *           type: string
 *           example: "Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@example.com"
 *         role:
 *           type: string
 *           enum: [STUDENT, TEACHER, ADMIN]
 *           example: "TEACHER"
 *         profilePicture:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/profile.jpg"
 *         status:
 *           type: string
 *           example: "offline"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00Z"
 */
router.post("/admin-createUser", createUserController); 

//route to update user role by admin
/**
 * @swagger
 * /user/admin-updateUserrole/{id}:
 *   put:
 *     summary: Update a user's role (Admin only)
 *     description: Updates the role of a user by their ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [STUDENT, TEACHER, ADMIN]
 *                 example: "ADMIN"
 *                 description: The new role to assign to the user
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User role updated successfully."
 *       400:
 *         description: Invalid role value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid role value."
 *       500:
 *         description: Failed to update user role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to update user role."
 */
router.put("/admin-updateUserrole/:id", updateUserRoleController); 

//route to delete a user by admin 
/**
 * @swagger
 * /user/admin-deleteUser/{id}:
 *   delete:
 *     summary: Delete a user by ID (Admin only)
 *     description: Permanently deletes a user from the system using their ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully."
 *       500:
 *         description: Failed to delete user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to delete user."
 */
router.delete("/admin-deleteUser/:id", deleteUserController); 


///////TEACHER ROUTE SECTION

///////STUDENT ROUTE SECTION


module.exports=router   