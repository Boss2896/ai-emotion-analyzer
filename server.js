const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const Sentiment = require('sentiment');

const app = express();
const sentiment = new Sentiment();

app.use(express.json());
app.use(express.static('public'));
if (!require('fs').existsSync('uploads')) require('fs').mkdirSync('uploads');

app.post('/api/text-emotion', (req, res) => {
    const result = sentiment.analyze(req.body.text || '');
    res.json({ success: true, score: result.score });
});

app.listen(3000, () => {
    console.log('✅ SERVER İŞƏ DÜŞDÜ: PORT 3000');
});
