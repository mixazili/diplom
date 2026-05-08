const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.join(process.cwd(), 'backend', 'uploads', 'verification');

const ensureUploadDirectory = () => {
  fs.mkdirSync(uploadDirectory, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDirectory();
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Zа-яА-Я0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  }
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error('Разрешены только документы jpg, jpeg, png или pdf'));
    return;
  }

  cb(null, true);
};

const uploadVerificationDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 10
  }
}).any();

module.exports = {
  uploadVerificationDocuments
};
