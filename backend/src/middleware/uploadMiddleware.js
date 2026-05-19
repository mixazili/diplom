const fs = require('fs');
const path = require('path');
const multer = require('multer');

const createUploader = ({ directoryName, allowedMimeTypes, errorMessage, filesLimit }) => {
  const uploadDirectory = path.join(process.cwd(), 'backend', 'uploads', directoryName);

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

  const fileFilter = (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error(errorMessage));
      return;
    }

    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 8 * 1024 * 1024,
      files: filesLimit
    }
  }).any();
};

const uploadVerificationDocuments = createUploader({
  directoryName: 'verification',
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  errorMessage: 'Разрешены только документы jpg, jpeg, png или pdf',
  filesLimit: 10
});

const uploadAuctionPhotos = createUploader({
  directoryName: 'auctions',
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  errorMessage: 'Разрешены только фотографии jpg, jpeg, png или webp',
  filesLimit: 50
});

module.exports = {
  uploadVerificationDocuments,
  uploadAuctionPhotos
};
