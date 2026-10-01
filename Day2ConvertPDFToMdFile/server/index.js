import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pdfToMarkdown } from './pdfToMarkdown.js';

const PORT = process.env.PORT || 5000;
const SAVE_DIR = process.env.SAVE_DIR || 'C:\\temp';

const app = express();
app.use(express.json({ limit: '20mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    cb(isPdf ? null : new Error('Only PDF files are allowed'), isPdf);
  },
});

app.post('/api/convert', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
  try {
    const markdown = await pdfToMarkdown(req.file.buffer);
    const baseName = path.parse(req.file.originalname).name;
    res.json({ markdown, fileName: `${baseName}.md` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Could not read PDF: ${err.message}` });
  }
});

app.post('/api/save', async (req, res) => {
  const { fileName, markdown } = req.body || {};
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return res.status(400).json({ error: 'Nothing to save' });
  }
  // keep only a safe file name, so nothing can be written outside SAVE_DIR
  let safeName = path.basename(String(fileName || 'document.md')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  if (!safeName || safeName === '.md') safeName = 'document.md';
  if (!safeName.toLowerCase().endsWith('.md')) safeName += '.md';

  try {
    await fs.mkdir(SAVE_DIR, { recursive: true });
    const fullPath = path.join(SAVE_DIR, safeName);
    await fs.writeFile(fullPath, markdown, 'utf8');
    res.json({ savedTo: fullPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Could not save file: ${err.message}` });
  }
});

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} — saving to ${SAVE_DIR}`);
});
