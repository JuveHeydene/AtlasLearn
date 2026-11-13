import express,{ Router } from "express";
import { Request, Response } from "express";
import upload, { toFileType } from "../Middlewares/multer";
import { uploadFile } from "../config/storage";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";

const router = express.Router();
const prisma = new PrismaClient();

// Upload Video and Store URL in MongoDB

/**
 * @swagger
 * /coursematerials/upload:
 *   post:
 *     summary: Upload course material file
 *     description: Uploads a file to the S3-compatible storage (MinIO locally) and creates a course material record with optional associations
 *     tags: [Course Materials]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: The file to upload
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - courseId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *               courseId:
 *                 type: string
 *                 description: ID of the associated course
 *               userId:
 *                 type: string
 *                 description: Optional - ID of the user who uploaded
 *               chapterId:
 *                 type: string
 *                 description: Optional - ID of the associated chapter
 *               lessonId:
 *                 type: string
 *                 description: Optional - ID of the associated lesson
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "File uploaded successfully"
 *                 courseMaterial:
 *                   $ref: '#/components/schemas/CourseMaterialWithRelations'
 *       400:
 *         description: Bad request - missing file or courseId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No file uploaded"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to upload file"
 *                 details:
 *                   type: string
 *                   description: Detailed error message in development mode
 *                   example: "Storage upload failed"
 * 
 * components:
 *   schemas:
 *     CourseMaterialWithRelations:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         fileUrl:
 *           type: string
 *           description: Public URL of the file in the storage bucket
 *         fileType:
 *           $ref: '#/components/schemas/FileType'
 *         fileName:
 *           type: string
 *           description: Original file name
 *         course:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             title:
 *               type: string
 *         user:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *         chapter:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *             title:
 *               type: string
 *         Lesson:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *             title:
 *               type: string
 * 
 *     FileType:
 *       type: string
 *       enum: [PDF, MP4, IMAGE]
 *       description: Type of the uploaded file
 * 
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
router.post("/upload",authenticateToken, upload.single("file"), async (req, res): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Validate required fields
    if (!req.body.courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    // Extract original file name
    const originalFileName = req.file.originalname;

    // Upload the file to the S3-compatible storage (MinIO locally)
    const stored = await uploadFile(req.file, "course_materials");
    const fileType = toFileType(originalFileName, req.file.mimetype);

    // Create data object
    const data: any = {
      fileUrl: stored.url,
      fileType,
      fileName:originalFileName,
      course: { connect: { id: req.body.courseId } }
    };

    // Conditionally add user if provided
    if (req.body.userId) {
      data.user = { connect: { id: req.body.userId } };
    }

    // Conditionally add chapter if provided
    if (req.body.chapterId) {
      data.chapter = { connect: { id: req.body.chapterId } };
    }

    // Conditionally add lesson if provided
    if (req.body.lessonId) {
      data.Lesson = { connect: { id: req.body.lessonId } };
    }

    // Create course material with proper select type
    const courseMaterial = await prisma.courseMaterial.create({
      data,
      include: {
        course: { select: { id: true, title: true } },
        ...(req.body.userId && { user: { select: { id: true, email: true } } }),
        ...(req.body.lessonId && { Lesson: { select: { id: true, title: true } } }),
        ...(req.body.chapterId && { chapter: { select: { id: true, title: true } } })
      }
    });

    return res.status(201).json({ 
      message: "File uploaded successfully", 
      courseMaterial 
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ 
      error: "Failed to upload file",
      ...(process.env.NODE_ENV === "development" && { 
        details: error instanceof Error ? error.message : String(error)
      })
    });
  }
});







//get coursematerials based on the lessonId
/**
 * @swagger
 * /coursematerials/lesson/{lessonId}:
 *   get:
 *     summary: Get course materials by lesson ID
 *     description: Retrieves course materials associated with a specific lesson
 *     tags:
 *       - Course Materials
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the lesson
 *     responses:
 *       200:
 *         description: List of course materials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CourseMaterial'
 *       404:
 *         description: No materials found for this lesson
 *       500:
 *         description: Server error
 */
router.get('/lesson/:lessonId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { lessonId } = req.params;

  try {
      const materials = await prisma.courseMaterial.findMany({
          where: {
              lessonId: lessonId
          },
          select: {
              id: true,
              courseId: true,
              userId: true,
              chapterId: true,
              lessonId: true,
              fileUrl: true,
              fileType: true,
              fileName:true,
              content: true,
              uploadedAt: true
          },
          orderBy: [
            { uploadedAt: 'desc' } 
          ]
      });

     

      res.status(200).json(materials);
  } catch (error) {
      console.error('Error fetching course materials:', error);
      res.status(500).json({ error: 'Failed to fetch course materials' });
  }
});


//get chapter material based on chapterId
/**
 * @swagger
 * /coursematerials/chapter/{chapterId}:
 *   get:
 *     summary: Get all materials for a specific chapter
 *     description: Retrieves all course materials associated with a chapter, sorted by upload date (newest first)
 *     tags: [Course Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the chapter to retrieve materials for
 *     responses:
 *       200:
 *         description: List of chapter materials retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChapterMaterial'
 *       500:
 *         description: Failed to fetch course materials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch course materials"
 * 
 * components:
 *   schemas:
 *     ChapterMaterial:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         courseId:
 *           type: string
 *         userId:
 *           type: string
 *           nullable: true
 *         chapterId:
 *           type: string
 *           nullable: true
 *         lessonId:
 *           type: string
 *           nullable: true
 *         fileUrl:
 *           type: string
 *           description: URL to access the material
 *         fileType:
 *           $ref: '#/components/schemas/FileType'
 *         fileName:
 *           type: string
 *           description: Original name of the file
 *         content:
 *           type: string
 *           nullable: true
 *           description: Optional text content
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *           description: When the material was uploaded
 * 
 *     FileType:
 *       type: string
 *       enum: [PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MP4, MKV, AVI, FLV, MOV, IMAGE, ZIP, RAR, UNKNOWN]
 *       description: Type of the course material file
 * 
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
router.get('/chapter/:chapterId',authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { chapterId } = req.params;

  try {
      const materials = await prisma.courseMaterial.findMany({
          where: {
            chapterId: chapterId,
          },
          select: {
              id: true,
              courseId: true,
              userId: true,
              chapterId: true,
              lessonId: true,
              fileUrl: true,
              fileType: true,
              fileName:true,
              content: true,
              uploadedAt: true
          },
          orderBy: [
            { uploadedAt: 'desc' } 
          ]
      });

     

      res.status(200).json(materials);
  } catch (error) {
      console.error('Error fetching course materials:', error);
      res.status(500).json({ error: 'Failed to fetch course materials' });
  }
});



//get course material based on courseId
/**
 * @swagger
 * /coursematerials/course/{courseId}:
 *   get:
 *     summary: Get root-level course materials
 *     description: Retrieves all materials directly associated with a course (not linked to specific chapters or lessons)
 *     tags: [Course Materials]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the course to retrieve materials for
 *     responses:
 *       200:
 *         description: List of root-level course materials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CourseMaterial'
 *       500:
 *         description: Failed to fetch course materials
 * 
 * components:
 *   schemas:
 *     CourseMaterial:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         courseId:
 *           type: string
 *         userId:
 *           type: string
 *           nullable: true
 *         chapterId:
 *           type: string
 *           nullable: true
 *         lessonId:
 *           type: string
 *           nullable: true
 *         fileUrl:
 *           type: string
 *           nullable: true
 *         fileType:
 *           $ref: '#/components/schemas/FileType'
 *         fileName:
 *           type: string
 *           nullable: true
 *         content:
 *           type: string
 *           nullable: true
 *         uploadedAt:
 *           type: string
 *           format: date-time
 * 
 *     FileType:
 *       type: string
 *       enum: [PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MP4, MKV, AVI, FLV, MOV, IMAGE, ZIP, RAR, UNKNOWN]
 *       default: PDF
 */
router.get('/course/:courseId', async (req: Request, res: Response): Promise<any> => {
  const { courseId } = req.params;

  try {
      const materials = await prisma.courseMaterial.findMany({
          where: {
            courseId: courseId,
            AND: [
              { chapterId: { isSet: false } }, // Field is not set at all
              { lessonId: { isSet: false } }   // Field is not set at all
            ]

          },
          select: {
              id: true,
              courseId: true,
              userId: true,
              chapterId: true,
              lessonId: true,
              fileUrl: true,
              fileType: true,
              fileName:true,
              content: true,
              uploadedAt: true
          },
          orderBy: [
            { uploadedAt: 'desc' } 
          ]
      });

     

      res.status(200).json(materials);
  } catch (error) {
      console.error('Error fetching course materials:', error);
      res.status(500).json({ error: 'Failed to fetch course materials' });
  }
});
module.exports =router 