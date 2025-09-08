import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Emulate __dirname in ESM/TS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');

// Ensure upload directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer storage config: keep .pdf extension, unique filename
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    cb(null, `${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed'));
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const filename = req.file.filename;
  const publicPath = `/files/${filename}`;
  res.status(201).json({ url: publicPath, filename });
});

// Serve uploaded files statically
app.use('/files', express.static(UPLOAD_DIR, {
  setHeaders: (res) => {
    // Reasonable cache for local dev; adjust for prod
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
