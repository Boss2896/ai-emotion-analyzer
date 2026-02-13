const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Sentiment = require('sentiment');

// Serveri başlat
const app = express();
const sentiment = new Sentiment();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Yükləmələr üçün qovluq nizamı
const upload = multer({ dest: 'uploads/' });

// --- EMOSİYA ANALİZİ (MƏTN) ---
function analyzeTextEmotion(text) {
  const result = sentiment.analyze(text || '');
  return {
    score: result.score,
    comparative: result.comparative,
    emotion: result.score > 0 ? 'müsbət' : result.score < 0 ? 'mənfi' : 'neytral'
  };
}

// --- ŞƏKİL REDAKTƏSİ ---
async function editImage(imagePath, operations) {
  let image = sharp(imagePath);
  if (operations.grayscale) image = image.grayscale();
  if (operations.blur) image = image.blur(operations.blur);
  
  const outputPath = path.join('uploads/', edited_${Date.now()}.png);
  await image.toFile(outputPath);
  return outputPath;
}

// --- API-LAR ---

// 1. Mətn və Emosiya Analizi
app.post('/api/text-emotion', (req, res) => {
  const { text } = req.body;
  const emotion = analyzeTextEmotion(text);
  res.json({ success: true, emotion, timestamp: new Date() });
});

// 2. Şəkil Redaktəsi
app.post('/api/image-edit', upload.single('image'), async (req, res) => {
  try {
    const ops = req.body.operations ? JSON.parse(req.body.operations) : {};
    const editedPath = await editImage(req.file.path, ops);
    res.json({ success: true, editedPath, timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serverin sağlamlıq yoxlanışı
app.get('/api/health', (req, res) => {
  res.json({ status: 'AI Server Aktivdir', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(🤖 AI Emotion Analyzer işə düşdü: http://localhost:${PORT});
});
