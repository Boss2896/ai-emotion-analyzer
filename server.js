const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const tf = require('@tensorflow/tfjs');
const tflite = require('@tensorflow/tfjs-tflite');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// ============================================
// 1. VOICE RECOGNITION & SPEECH-TO-TEXT
// ============================================
const SpeechRecognition = require('web-speech-api').SpeechRecognition;

function recognizeVoice(audioStream) {
  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition();
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      resolve(transcript);
    };
    recognition.onerror = (event) => reject(event.error);
    recognition.start();
  });
}

// ============================================
// 2. EMOTION DETECTION (Text & Voice)
// ============================================
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

function analyzeTextEmotion(text) {
  const result = sentiment.analyze(text);
  return {
    score: result.score,
    comparative: result.comparative,
    emotion: result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'neutral'
  };
}

function analyzeVoiceEmotion(text) {
  // Analyze emotional tone from speech transcription
  const emotionKeywords = {
    joy: ['happy', 'excited', 'wonderful', 'amazing', 'great'],
    sadness: ['sad', 'unhappy', 'terrible', 'awful', 'down'],
    anger: ['angry', 'furious', 'mad', 'upset', 'irritated'],
    fear: ['scared', 'afraid', 'terrified', 'worried', 'anxious']
  };

  let detectedEmotions = {};
  const lowerText = text.toLowerCase();

  for (let emotion in emotionKeywords) {
    detectedEmotions[emotion] = emotionKeywords[emotion].some(keyword => 
      lowerText.includes(keyword)
    );
  }

  return detectedEmotions;
}

// ============================================
// 3. IMAGE EDITING
// ============================================
async function editImage(imagePath, operations) {
  let image = sharp(imagePath);

  if (operations.grayscale) {
    image = image.grayscale();
  }

  if (operations.blur) {
    image = image.blur(operations.blur);
  }

  if (operations.resize) {
    image = image.resize(operations.resize.width, operations.resize.height);
  }

  if (operations.rotate) {
    image = image.rotate(operations.rotate);
  }

  if (operations.brightness) {
    // Brightness adjustment
    image = image.modulate({ lightness: operations.brightness });
  }

  const outputPath = path.join('uploads/', `edited_${Date.now()}.png`);
  await image.toFile(outputPath);
  
  return outputPath;
}

// ============================================
// 4. TEXT PROCESSING & ANALYSIS
// ============================================
function processText(text) {
  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/);

  return {
    wordCount: words.length,
    sentenceCount: sentences.filter(s => s.trim().length > 0).length,
    averageWordLength: (text.length / words.length).toFixed(2),
    uniqueWords: new Set(words.map(w => w.toLowerCase())).size
  };
}

// ============================================
// API ENDPOINTS
// ============================================

// 1. Voice to Text & Emotion Analysis
app.post('/api/voice-analyze', async (req, res) => {
  try {
    const { audioData } = req.body;
    
    // Convert voice to text
    const transcript = await recognizeVoice(audioData);
    
    // Analyze emotion from voice
    const voiceEmotion = analyzeVoiceEmotion(transcript);
    const textEmotion = analyzeTextEmotion(transcript);

    res.json({
      success: true,
      transcript,
      voiceEmotion,
      textEmotion,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Text Emotion Analysis
app.post('/api/text-emotion', (req, res) => {
  try {
    const { text } = req.body;
    
    const emotion = analyzeTextEmotion(text);
    const analysis = processText(text);

    res.json({
      success: true,
      emotion,
      textAnalysis: analysis,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Image Editing
app.post('/api/image-edit', upload.single('image'), async (req, res) => {
  try {
    const { operations } = req.body;
    const imagePath = req.file.path;

    const editedImagePath = await editImage(imagePath, JSON.parse(operations));

    res.json({
      success: true,
      originalPath: imagePath,
      editedPath: editedImagePath,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Combined Analysis (Voice + Text + Image)
app.post('/api/full-analysis', upload.single('image'), async (req, res) => {
  try {
    const { audioData, text, imageOperations } = req.body;

    // Voice analysis
    const transcript = audioData ? await recognizeVoice(audioData) : text;
    const voiceEmotion = analyzeVoiceEmotion(transcript);
    const textEmotion = analyzeTextEmotion(transcript);

    // Text analysis
    const textAnalysis = processText(transcript);

    // Image analysis (if image provided)
    let imageResult = null;
    if (req.file && imageOperations) {
      imageResult = await editImage(req.file.path, JSON.parse(imageOperations));
    }

    res.json({
      success: true,
      transcript,
      emotionAnalysis: {
        voice: voiceEmotion,
        text: textEmotion
      },
      textAnalysis,
      imageEditResult: imageResult,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'AI Emotion Analyzer is running', timestamp: new Date() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🤖 AI Emotion Analyzer running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/voice-analyze - Analyze voice and convert to text');
  console.log('  POST /api/text-emotion - Analyze text emotion');
  console.log('  POST /api/image-edit - Edit images');
  console.log('  POST /api/full-analysis - Combined analysis of voice, text, and image');
  console.log('  GET /api/health - Health check');
});

module.exports = app;
