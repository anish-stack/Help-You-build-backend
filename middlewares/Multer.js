const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

const handleMulterErrors = (req, res, next) => {
  if (!req.headers || !req.headers['content-type']) {
    return res.status(400).json({
      success: false,
      message: 'Missing content-type header or empty request body'
    });
  }
  next();
};


const UploadViaFieldName = (fields) => {
  console.log(fields)
  const fieldConfigs = fields.map(field => ({ name: field }));
  return upload.fields(fieldConfigs); 
};


const singleUploadImage = upload.single('image');


const multipleImages = upload.array('images', 10);



module.exports = {
  handleMulterErrors,
  singleUploadImage,
  multipleImages,
  UploadViaFieldName
};
