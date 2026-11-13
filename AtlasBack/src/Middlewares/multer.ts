import multer from "multer";

// Files are kept in memory, then sent to the S3-compatible storage (see config/storage.ts).
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/vnd.rar",
  "application/x-rar-compressed",
];

const isAllowed = (mimetype: string) =>
  ALLOWED_MIME_TYPES.includes(mimetype) ||
  mimetype.startsWith("image/") ||
  mimetype.startsWith("video/") ||
  mimetype.startsWith("audio/");

const maxSizeMb = Number(process.env.MAX_UPLOAD_MB ?? 500);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowed(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} is not allowed`));
  },
});

/** Map a file to the Prisma `fileType` enum. */
export function toFileType(originalname: string, mimetype: string): string {
  if (mimetype.startsWith("image/")) return "IMAGE";
  if (mimetype.startsWith("video/") || mimetype.startsWith("audio/")) return "MP4";
  const ext = originalname.split(".").pop()?.toUpperCase() ?? "";
  const known = ["PDF", "DOC", "DOCX", "PPT", "PPTX", "XLS", "XLSX", "TXT", "MKV", "AVI", "FLV", "MOV", "ZIP", "RAR"];
  return known.includes(ext) ? ext : "UNKNOWN";
}

export default upload;
