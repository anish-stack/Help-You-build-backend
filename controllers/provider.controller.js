const PortfolioModel = require("../models/Portfolio.model");
const providersModel = require("../models/providers.model");
const { UploaViaFeildNameImages } = require("../utils/Cloudnary");
const sendEmail = require("../utils/SendEmail");
const sendToken = require("../utils/SendToken");
const bcrypt = require('bcrypt');
const Cloudinary = require('cloudinary').v2;
require('dotenv').config();

Cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
    cloud_name: process.env.CLOUD_NAME,
});

exports.CreateProvider = async (req, res) => {
    try {

        const { adhaarCard, panCard, qualificationProof, photo } = req.files || {};
        if (!adhaarCard || !panCard || !qualificationProof || !photo) {
            return res.status(400).json({
                success: false,
                message: 'All required documents (Adhaar, Pan Card, Qualification Proof) must be uploaded.'
            });
        }
        const { type, name, email, password,DOB, age, language, mobileNumber, gstDetails, coaNumber, expertiseSpecialization, location } = req.body;
        const existingMobile = await providersModel.findOne({ mobileNumber });
        const existingEmail = await providersModel.findOne({ email });


        if (existingEmail) {
            return res.status(403).json({
                message: 'Eamil is already exists with another account'
            })
        }
        if (existingMobile) {
            return res.status(403).json({
                success: false,
                message: 'Mobile Number already exists with another account'
            })
        }



        // Upload images to Cloudinary
        const uploadedFiles = {};
        if (adhaarCard) {
            uploadedFiles.adhaarCard = await uploadToCloudinary(adhaarCard[0].buffer);
        }
        if (panCard) {
            uploadedFiles.panCard = await uploadToCloudinary(panCard[0].buffer);
        }
        if (qualificationProof) {
            uploadedFiles.qualificationProof = await uploadToCloudinary(qualificationProof[0].buffer);
        }
        if (photo) {
            uploadedFiles.photo = await uploadToCloudinary(photo[0].buffer);
        }
        console.log(uploadedFiles)
        const newProvider = new providersModel({
            DOB,
            type,
            name,
            email,
            password: password,
            age,
            language: language.split(','),
            mobileNumber,
            gstDetails,
            coaNumber,
            expertiseSpecialization: expertiseSpecialization.split(','),
            location,
            photo: uploadedFiles.photo,
            adhaarCard: uploadedFiles.adhaarCard,
            panCard: uploadedFiles.panCard,
            qualificationProof: uploadedFiles.qualificationProof
        });

        // Save the provider
        await newProvider.save();

        // Send welcome email
        const emailOptions = {
            email: email,
            subject: "Welcome to HelpUBuild",
            message: "Hello, Welcome to HelpUBuild! We are excited to have you on board. Please find your login details below.",
        }
        await sendEmail(emailOptions);

        // Send token for authentication
        sendToken(newProvider, res, 201, "Account Created successfully");

    } catch (error) {
        console.error("Error creating provider:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while creating the provider. Please try again later.",
            error: error.message
        });
    }
};

exports.GetMyProfile = async (req, res) => {
    try {
        const userId = req.user.id._id;
        console.log(req.user.id)
        if (!userId) {
            return res.status(401).json({ message: 'Please login To Access Your Dashboard ' });
        }
        const provider = await providersModel.findById(userId).populate('portfolio');
        console.log(provider)
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }
        return res.status(200).json({
            message: 'Profile fetched successfully',
            provider: provider
        });
    } catch (error) {
        console.error(error);
        // Handle any errors that occur
        return res.status(500).json({
            message: 'Something went wrong while fetching the profile',
            error: error.message || 'Internal server error'
        });
    }
};



exports.addPortfolio = async (req, res) => {
    try {
        const ProviderId = req.user.id._id
        const { TextWhichYouShow, type } = req.query;



        // Check if the provider exists
        const checkProviderId = await providersModel.findById(ProviderId);
        if (!checkProviderId) {
            return res.status(404).json({
                success: false,
                message: "Provider not found. Please check the ID and try again."
            });
        }

        let PortfolioLink = {};
        let GalleryImages = [];
        let isGalleryUploaded = false;


        let existingPortfolio = await PortfolioModel.findOne({ ProviderId });


        if (type === 'Portfolio') {
            if (req.files && req.files.PortfolioLink) {
                const fileBuffer = req.files.PortfolioLink[0].buffer;


                const uploadResult = await uploadToCloudinary(fileBuffer);
                PortfolioLink = {
                    url: uploadResult.imageUrl,
                    cloudinary_id: uploadResult.public_id
                };

                if (existingPortfolio) {

                    existingPortfolio.PortfolioLink = PortfolioLink;
                }
            } else {
                return res.status(400).json({
                    success: false,
                    message: "No file uploaded for PortfolioLink."
                });
            }
        }
        else if (type === 'Gallery') {
            if (req.files && req.files.GalleryImages) {
                for (let i = 0; i < req.files.GalleryImages.length; i++) {
                    const fileBuffer = req.files.GalleryImages[i].buffer;


                    const uploadResult = await uploadToCloudinary(fileBuffer);
                    GalleryImages.push({
                        url: uploadResult.imageUrl,
                        cloudinary_id: uploadResult.public_id
                    });
                }

                if (GalleryImages.length > 0) {
                    isGalleryUploaded = true;
                }

                if (existingPortfolio) {
                    // Update the existing portfolio if it exists
                    existingPortfolio.GalleryImages = GalleryImages;
                    existingPortfolio.isGalleryUploaded = isGalleryUploaded;
                }
            } else {
                return res.status(400).json({
                    success: false,
                    message: "No files uploaded for GalleryImages."
                });
            }
        }
        else {
            return res.status(400).json({
                success: false,
                message: "Invalid type provided. Must be 'Portfolio' or 'Gallery'."
            });
        }

        // If no existing portfolio, create a new one
        if (!existingPortfolio) {
            existingPortfolio = new PortfolioModel({
                TextWhichYouShow,
                PortfolioLink,
                GalleryImages,
                isGalleryUploaded,
                ProviderId
            });
        }

        // Save the portfolio (either new or updated)
        await existingPortfolio.save();

        // Associate the portfolio with the provider
        checkProviderId.portfolio = existingPortfolio._id;
        await checkProviderId.save();

        // Send a success response
        return res.status(201).json({
            success: true,
            message: "Portfolio updated successfully",
            data: existingPortfolio
        });

    } catch (error) {
        console.error("Error adding portfolio:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "An error occurred while adding or updating the portfolio."
        });
    }
};





// Utility function to upload an image to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
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
