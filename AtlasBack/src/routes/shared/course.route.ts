import express,{ Router } from "express";

import { deleteCourseController,getAllCoursesController } from "../../controllers/shared/course.controller";

const router = express.Router();


///////SHARED ROUTE

// route to delete course by admin And teacher
/**
 * @swagger
 * /courses/shared-delete-course/{id}:
 *   delete:
 *     summary: Delete a course by ID
 *     description: Permanently deletes a course from the system using its ID.
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the course to delete
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Course deleted successfully."
 *       500:
 *         description: Failed to delete course
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to delete course."
 */

router.delete("/shared-delete-course/:id", deleteCourseController);

//route to get all courses by any user
/**
 * @swagger
 * /courses/shared-list-course:
 *   get:
 *     summary: Get all courses
 *     description: Retrieves a list of all available courses in the system.
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       500:
 *         description: Failed to fetch courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch courses."
 *
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "abc123"
 *         title:
 *           type: string
 *           example: "Introduction to Programming"
 *         description:
 *           type: string
 *           example: "A beginner course in programming concepts"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-02T00:00:00Z"
 */

router.get("/shared-list-course", getAllCoursesController);



///////ADMIN ROUTE SECTION

///////TEACHER ROUTE SECTION

///////STUDENT ROUTE SECTION


module.exports=router 