const express = require('express');
const multer = require('multer');
const path = require('path');
const { supabase, isSupabaseConfigured } = require('../services/database');

const router = express.Router();

// In-memory storage for multipart uploads (file goes to Supabase, we don't keep on disk)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max for video
  fileFilter: (req, file, cb) => {
    const allowedVideo = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const allowedImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowed = [...allowedVideo, ...allowedImage];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: video (mp4, mov, etc.) or image (jpeg, png, gif, webp).`));
    }
  },
});

const CHAT_MEDIA_BUCKET = 'chat-media';

/**
 * POST /api/upload/chat-media
 * Upload a video or image for chat messages. Returns a permanent public URL to store in the message.
 * Body: multipart/form-data with field "file" (video or image file).
 */
router.post('/chat-media', upload.single('file'), async (req, res) => {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return res.status(503).json({
        error: 'Storage not configured',
        message: 'File upload is not available. Supabase storage must be configured.',
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        error: 'No file',
        message: 'Please upload a file using the "file" field.',
      });
    }

    const ext = path.extname(req.file.originalname) || (req.file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${ext}`;
    const filePath = `videos/${safeName}`;

    const { data, error } = await supabase.storage
      .from(CHAT_MEDIA_BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      if (error.message && error.message.includes('Bucket not found')) {
        const { error: createErr } = await supabase.storage.createBucket(CHAT_MEDIA_BUCKET, { public: true });
        if (createErr) {
          console.warn('Could not auto-create bucket:', createErr.message);
          return res.status(503).json({
            error: 'Storage bucket not ready',
            message: 'Create a public bucket named "chat-media" in Supabase Dashboard > Storage.',
          });
        }
        const { data: retryData, error: retryError } = await supabase.storage
          .from(CHAT_MEDIA_BUCKET)
          .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (retryError) {
          console.error('Supabase storage upload error after bucket create:', retryError);
          return res.status(500).json({ error: 'Upload failed', message: retryError.message });
        }
        const { data: urlData } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(retryData.path);
        return res.json({ url: urlData.publicUrl });
      }
      console.error('Supabase storage upload error:', error);
      return res.status(500).json({
        error: 'Upload failed',
        message: error.message || 'Failed to upload file.',
      });
    }

    const { data: urlData } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(data.path);
    const publicUrl = urlData.publicUrl;

    return res.json({ url: publicUrl });
  } catch (err) {
    console.error('Upload route error:', err);
    return res.status(500).json({
      error: 'Upload failed',
      message: err.message || 'An error occurred while uploading.',
    });
  }
});

module.exports = router;
