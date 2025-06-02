function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size limit exceeded (10000MB max)' });
  }
  next(err);
}

module.exports = { multerErrorHandler };