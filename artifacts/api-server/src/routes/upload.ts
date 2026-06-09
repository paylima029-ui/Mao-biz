import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

// Same path logic as app.ts — single source of truth via UPLOADS_DIR env var
const uploadsDir = path.resolve(
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads"),
);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Type de fichier non supporté"));
  },
});

router.post("/", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }
  const url = `/api/uploads/${req.file.filename}`;
  return res.json({ url });
});

export default router;
