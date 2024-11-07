const PortfolioModel = require("../models/Portfolio.model");
const providersModel = require("../models/providers.model");
const {  UploaViaFeildNameImages } = require("../utils/Cloudnary");
const sendEmail = require("../utils/SendEmail");
const sendToken = require("../utils/SendToken");
const Cloudinary = require('cloudinary').v2;
require('dotenv').config();

Cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
    cloud_name: process.env.CLOUD_NAME,
});

exports.RegisterProvider = async (req, res) => {
    try {
        const { Regtype } = req.query
        const { first_name, last_name, type, phone_number, password, MemberType } = req.body;
        const errors = [];

        if (!first_name) errors.push("Please provide your first name.");
        if (!last_name) errors.push("Please provide your last name.");
        if (!type || !["Architect", "Interior", "Vastu"].includes(type)) {
            errors.push("Please select a valid provider type: 'Architect', 'Interior', or 'Vastu'.");
        }
        if (!phone_number) errors.push("Please enter your phone number.");
        if (!password) errors.push("Please create a password.");

        if (errors.length > 0) {
            return res.status(400).json({ message: "Registration failed. Please correct the following:", errors });
        }


        const existingProvider = await providersModel.findOne({ phone_number });
        if (existingProvider) {
            return res.status(400).json({ message: "A provider with this phone number is already registered. Please use a different phone number." });
        }

        // Create new provider
        const newProvider = new providersModel({
            first_name,
            last_name,
            type,
            phone_number,
            password,
            MemberType: MemberType || 'Free',
        });

        // Save the provider to the database
        await newProvider.save();
        if (Regtype === "admin") {
            res.status(201).json({ message: "Registration successful! Welcome aboard.", data: newProvider });
        } else {
            await sendToken(newProvider, res, 201, "Registration Sccessfull Now complete your Basic details")
        }


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Oops! Something went wrong on our end. Please try again later." });
    }
};

exports.AddProfileDetails = async (req, res) => {
    try {
        const providerId = req.params.provider;

        if (!providerId) {
            return res.status(400).json({ message: "Provider ID is required." });
        }

        const checkProviderValid = await providersModel.findById(providerId);
        if (!checkProviderValid) {
            return res.status(404).json({ message: "Provider not found. Please check the ID and try again." });
        }
        if (checkProviderValid.profileData) {
            return res.status(400).json({ message: "Profile details already added for this provider." });
        }
        const { DocumentOne, DocumentTwo } = req.files
        // console.log(req.files)
        if (!DocumentOne.length === 0 || DocumentTwo.length === 0) {
            return res.status(400).json({ message: "Please upload both Document One and Document Two." });
        }



        const { email, age, gender, nationality, occupation, education, experience, Bio } = req.body;
        const errors = [];

        if (!age || Number(age) <= 18) {
            errors.push("Please provide a valid age (18 or older).");
        }
        if (!email) errors.push("Please specify your email.");

        if (!gender) errors.push("Please specify your gender.");
        if (!nationality) errors.push("Please enter your nationality.");
        if (!occupation) errors.push("Please provide your occupation.");
        if (!education) errors.push("Please specify your educational background.");
        if (!experience) errors.push("Please provide your years of experience.");
        if (!Bio) errors.push("Please add a brief bio.");

        if (errors.length > 0) {
            return res.status(400).json({ message: "Profile update failed. Please correct the following:", errors });
        }
        let formattedResults;
        if (DocumentOne && DocumentTwo) {
            try {
                const uploadFirst = await UploaViaFeildNameImages(req, res);

                if (uploadFirst.uploadResults.DocumentOne && uploadFirst.uploadResults.DocumentTwo) {
                    formattedResults = {
                        DocumentOne: uploadFirst?.uploadResults?.DocumentOne.map(result => ({
                            public_id: result.public_id,
                            secure_url: result.imageUrl
                        })),
                        DocumentTwo: uploadFirst?.uploadResults?.DocumentTwo.map(result => ({
                            public_id: result.public_id,
                            secure_url: result.imageUrl
                        }))
                    };

                    // console.log(formattedResults);
                } else {
                    return res.status(400).json({
                        success: false,
                        message: "Documents are missing in the upload response"
                    });
                }

            } catch (error) {
                console.error("Error uploading files:", error);
                return res.status(500).json({
                    success: false,
                    message: error.message || "An error occurred while uploading images"
                });
            }
        }



        checkProviderValid.profileData = {
            age,
            gender,
            email,
            nationality,
            occupation,
            education,
            experience,
            Bio,
            DocumentOne: formattedResults?.DocumentOne[0].secure_url,
            DocumentTwo: formattedResults?.DocumentOne[0].secure_url
        }
        await checkProviderValid.save();

        const emailOptions = {
            email: checkProviderValid.profileData.email,
            subject: `Thank you ${gender}.${checkProviderValid.first_name + checkProviderValid.last_name} for registering as a ${checkProviderValid.type}!!`,
            message: `
                <html>
                    <body style="font-family: Arial, sans-serif; background-color: #ECDFCC; margin: 0; padding: 20px;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px;">
                            <h2 style="color: #181C14; text-align: center;">Welcome to our platform, ${gender} ${checkProviderValid.first_name}!</h2>
                            <p style="font-size: 16px; color: #3C3D37;">Thank you for registering as a <strong>${checkProviderValid.type}</strong>. We are excited to have you as part of our community.</p>
                            <p style="font-size: 16px; color: #3C3D37;">Please feel free to explore our features and reach out if you need any assistance.</p>
                            <p style="font-size: 16px; color: #3C3D37;">If you have any questions, don't hesitate to contact us.</p>
                            <p style="font-size: 16px; color: #3C3D37;">Your profile will be visible to other users after document verification. Please note that this process may take up to 24 hours.</p>
                            <div style="text-align: center; margin-top: 30px;">
                                <a href=${process.env.FRONTEND_URL} style="background-color: #697565; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-size: 16px;">Visit Our Website</a>
                            </div>
                        </div>
                        <footer style="text-align: center; font-size: 14px; color: #3C3D37; margin-top: 20px;">
                            <p>Thank you for choosing our services. We look forward to serving you!</p>
                        </footer>
                    </body>
                </html>
            `
        };
        await sendEmail(emailOptions);


        res.status(200).json({ message: "Profile details updated successfully.", provider: checkProviderValid });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while updating profile details. Please try again later." });
    }
};

exports.addPortfolio = async (req, res) => {
    try {
        const { TextWhichYouShow, type, ProviderId } = req.body;

        if (!TextWhichYouShow || !ProviderId || !type) {
            return res.status(400).json({
                success: false,
                message: "TextWhichYouShow, type, and ProviderId are required."
            });
        }

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
        let isGalleryUploaded = false; // Initially set to false

        // Check if a portfolio already exists for this provider
        let existingPortfolio = await PortfolioModel.findOne({ ProviderId });

        // Handle Portfolio type
        if (type === 'Portfolio') {
            if (req.files && req.files.PortfolioLink) {
                const fileBuffer = req.files.PortfolioLink[0].buffer;

                // Upload to Cloudinary and return a promise
                const uploadResult = await uploadToCloudinary(fileBuffer); // assuming it's a PDF or adjust type
                PortfolioLink = {
                    url: uploadResult.imageUrl,  // Changed to 'fileUrl' as per updated function
                    cloudinary_id: uploadResult.public_id
                };

                if (existingPortfolio) {
                    // Update the existing portfolio if it exists
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

                    // Upload to Cloudinary and add to GalleryImages array
                    const uploadResult = await uploadToCloudinary(fileBuffer);
                    GalleryImages.push({
                        url: uploadResult.imageUrl,  // Changed to 'fileUrl' as per updated function
                        cloudinary_id: uploadResult.public_id
                    });
                }

                // Mark gallery as uploaded if there are images
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
                isGalleryUploaded, // Add the flag here
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


exports.updateProfileDetails = async (req, res) => {
    try {
        const providerId = req.user.id._id;

        // Check if providerId exists
        if (!providerId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized to access this endpoint."
            });
        }

        // Fetch the current provider details from the database
        const existingProvider = await providersModel.findById(providerId);

        if (!existingProvider) {
            return res.status(404).json({
                success: false,
                message: "Provider not found."
            });
        }

        // Prepare the fields to be updated with only the changed fields
        const updatedFields = {};
        Object.keys(req.body).forEach(field => {
            if (req.body[field] !== existingProvider[field]) {
                updatedFields[field] = req.body[field];
            }
        });

        // If no fields are actually updated, return a message
        if (Object.keys(updatedFields).length === 0) {
            return res.status(200).json({
                success: true,
                message: "No changes detected."
            });
        }

        // Update only the changed fields in the database
        const updatedProvider = await providersModel.findByIdAndUpdate(providerId, updatedFields, { new: true });

        // Return success response with updated provider details
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            data: updatedProvider
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating the profile."
        });
    }
};


exports.GetAllProvider = async (req, res) => {
    try {
        const { type } = req.query;
        console.log(req.query)
        // Build the query dynamically
        const query = type ? { type } : {};

        // Fetch providers with the optional type filter and populate their portfolio
        const providers = await providersModel.find(query).populate('portfolio');

        if (providers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No providers found."
            });
        }

        // Return the fetched providers
        res.status(200).json({
            success: true,
            message: 'Providers fetched successfully',
            data: providers
        });
    } catch (error) {
        console.error("Error fetching providers:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "An error occurred while fetching providers."
        });
    }
};

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