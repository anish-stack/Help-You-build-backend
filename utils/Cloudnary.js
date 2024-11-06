const Cloudinary = require('cloudinary').v2;
require('dotenv').config();

Cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
    cloud_name: process.env.CLOUD_NAME,
});

const uploadSingleImage = async (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = Cloudinary.uploader.upload_stream(
            { folder: process.env.CLOUDINARY_FOLDER_NAME },
            (error, result) => {
                if (result) {
                    resolve({ public_id: result.public_id, imageUrl: result.secure_url });
                } else {
                    reject(error || new Error("Failed to upload image"));
                }
            }
        );
        stream.end(fileBuffer);
    });
};

const UploadSingleImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        const fileBuffer = req.file.buffer;
        const uploadResult = await uploadSingleImage(fileBuffer);

        res.status(200).json({
            success: true,
            data: uploadResult,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "An error occurred while uploading the image",
        });
    }
};
const UploaViaFeildNameImages = async (req, res, next) => {
    try {
        // Check if files are uploaded
        if (!req.files || !req.files.DocumentOne || !req.files.DocumentTwo) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded for DocumentOne or DocumentTwo",
            });
        }

        // Destructure files from req.files
        const { DocumentTwo, DocumentOne } = req.files;

        // Process DocumentOne files (assuming it's an array)
        const documentOnePromises = DocumentOne.map(file => uploadSingleImage(file.buffer));
        const documentOneResults = await Promise.all(documentOnePromises);

        // Process DocumentTwo files (assuming it's an array)
        const documentTwoPromises = DocumentTwo.map(file => uploadSingleImage(file.buffer));
        const documentTwoResults = await Promise.all(documentTwoPromises);

        // Combine results for both documents
        const uploadResults = {
            DocumentOne: documentOneResults,
            DocumentTwo: documentTwoResults
        };

        // Respond with success and uploaded file data
        return { uploadResults: uploadResults }
    } catch (error) {
        // Handle any errors
        res.status(500).json({
            success: false,
            message: error.message || "An error occurred while uploading images",
        });
    }
};



const UploadMultipleImages = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded",
            });
        }

        const fileBuffers = req.files.map(file => file.buffer);
        const uploadPromises = fileBuffers.map(fileBuffer => uploadSingleImage(fileBuffer));
        const uploadResults = await Promise.all(uploadPromises);

        res.status(200).json({
            success: true,
            data: uploadResults,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "An error occurred while uploading images",
        });
    }
};

module.exports = {
    UploaViaFeildNameImages,
    UploadSingleImage,
    UploadMultipleImages,
};
