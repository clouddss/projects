import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Ensure "uploads" folder exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed file types (Images & Videos)
const allowedFileTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "video/mp4",
  "video/mov",
  "video/quicktime",
  "video/x-msvideo",
];

// Define file filter function
const fileFilter = (req, file, cb) => {
  const extName = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedMimeTypes.includes(file.mimetype);

  if (extName && mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only images (jpeg, jpg, png, gif) and videos (mp4, mov, avi) are allowed!"));
  }
};

// Configure storage for general uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const randomSuffix = crypto.randomBytes(6).toString("hex");
    const safeFilename = file.originalname.replace(/\s+/g, "_").toLowerCase();
    cb(null, `${Date.now()}-${randomSuffix}-${safeFilename}`);
  },
});

// Configure storage for profile uploads (separate directory)
const profileUploadDir = path.join(uploadDir, "profiles");
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    const randomSuffix = crypto.randomBytes(6).toString("hex");
    const safeFilename = file.originalname.replace(/\s+/g, "_").toLowerCase();
    cb(null, `${Date.now()}-${randomSuffix}-${safeFilename}`);
  },
});

// Multer Upload Middleware for profile uploads
const uploadProfile = multer({
  storage: profileStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "avatar", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);

export default  uploadProfile;
