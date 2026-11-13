import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../Middlewares/auth.middleware";
import upload, { toFileType } from "../Middlewares/multer";
import { uploadFile } from "../config/storage";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload one or more files (assignments, submissions…)
 *     description: Stores the files in the S3-compatible storage (MinIO locally) and returns their public URLs.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Files uploaded; `files` lists url, key, name, mimetype and size of each one
 *       400:
 *         description: No file uploaded
 */
router.post("/upload", authenticateToken, upload.array("file"), async (req, res): Promise<any> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) return res.status(400).json({ message: "no files uploaded" });

    const stored = await Promise.all(files.map((f) => uploadFile(f, "uploads")));
    return res.status(200).json({ message: "Files uploaded successfully", files: stored });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "internal server error", error: error.message });
  }
});

/**
 * @swagger
 * /files/upload-materials:
 *   post:
 *     summary: Upload files and attach them to a course as course materials
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [courseId]
 *             properties:
 *               file:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               courseId: { type: string }
 *               chapterId: { type: string }
 *               lessonId: { type: string }
 *               userId: { type: string }
 *     responses:
 *       201:
 *         description: Files uploaded and course materials created
 */
router.post("/upload-materials", authenticateToken, upload.array("file"), async (req, res): Promise<any> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) return res.status(400).json({ message: "no files uploaded" });
    if (!req.body.courseId) return res.status(400).json({ error: "courseId is required" });

    const { courseId, userId, chapterId, lessonId } = req.body;
    const courseMaterials = await Promise.all(
      files.map(async (f) => {
        const stored = await uploadFile(f, "course_materials");
        const data: any = {
          fileUrl: stored.url,
          fileName: stored.name,
          fileType: toFileType(f.originalname, f.mimetype),
          course: { connect: { id: courseId } },
          ...(userId && { user: { connect: { id: userId } } }),
          ...(chapterId && { chapter: { connect: { id: chapterId } } }),
          ...(lessonId && { Lesson: { connect: { id: lessonId } } }),
        };
        return prisma.courseMaterial.create({ data });
      }),
    );
    return res.status(201).json({ message: "Files uploaded successfully", courseMaterials });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "internal server error", error: error.message });
  }
});

module.exports = router;
