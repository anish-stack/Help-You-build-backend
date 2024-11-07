const User = require("../models/user.Model");
const sendEmail = require("../utils/SendEmail");
const sendToken = require("../utils/SendToken");
const generateOtp = require("../utils/GenreateOtp")

exports.registeruser = async (req, res) => {
    try {
        const { Gender, name, email, PhoneNumber, Password, cPassword } = req.body;
        const errors = [];

        if (!name) errors.push("Please enter a name");
        if (!email) errors.push("Please enter an email");
        if (!PhoneNumber) errors.push("Please enter a contact number");
        if (!Password || Password.length < 6) errors.push("Please enter a password with at least 6 characters");

        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }


        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(400).json({ success: false, message: "Email is already registered" });
            } else {


                const { otp, expiresAt } = generateOtp(6, 120000)
                existingUser.otp = otp
                existingUser.Password = Password
                existingUser.expiresAt = expiresAt

                const emailContent = {
                    email: email,
                    subject: "Verify Your Email Address",
                    message: `Hello ${name},\n\n` +
                        `Your password has been updated. Please verify your email address using the OTP below:\n\n` +
                        `OTP: ${otp}\n` +
                        `This OTP is valid for 2 minutes (expires at: ${new Date(expiresAt).toISOString()}).\n\n` +
                        `Please verify your email address by clicking the link below:\n\n`,
                };
                await sendEmail(emailContent);
                await existingUser.save()
                return res.status(200).json({ success: true, message: "A new verification email has been sent. Please check your inbox." });
            }
        }

        const { otp, expiresAt } = generateOtp(6, 120000)
        const image = `https://ui-avatars.com/api/?background=random&name=${name}`
        const newUser = new User({
            Gender,
            name,
            email,
            otp,
            expiresAt,
            ProfileImage: image,
            PhoneNumber,
            Password,
            cPassword,
        });

        const emailContent = {
            email: email,
            subject: "Welcome to Our Service - Verify Your Email",
            message: `Hello ${name},\n\n` +
                `Thank you for registering with us! To complete your registration, please verify your email address using the OTP below:\n\n` +
                `OTP: ${otp}\n` +
                `This OTP is valid for 2 minutes (expires at: ${new Date(expiresAt).toISOString()}).\n\n` +
                `After verifying your email, you'll be all set to enjoy our services!\n\n` +
                `Best regards,\nYour Service Team\n\n`,
        };
        await sendEmail(emailContent);
        await newUser.save();

        res.status(201).json({ success: true, message: "User registered successfully! Please check your email for verification." });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { type } = req.params;
        const { email, otp, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        let userOtp, otpExpiresAt, verificationMessage;

        if (type === 'email') {
            userOtp = user.otp;
            otpExpiresAt = user.expiresAt;
            verificationMessage = "Email verified successfully.";
        } else if (type === 'password') {
            userOtp = user.resetPasswordOtp;

            otpExpiresAt = user.resetPasswordExpiresAt;
            verificationMessage = "OTP verified for password reset.";
        } else {
            return res.status(400).json({ success: false, message: "Invalid verification type." });
        }

        if (userOtp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP." });
        }

        if (Date.now() > otpExpiresAt) {
            return res.status(400).json({ success: false, message: "OTP has expired." });
        }

        if (type === 'email') {
            user.isVerified = true;
            user.otp = null;
            user.expiresAt = null;
        } else if (type === 'password') {
            user.Password = password;
            user.resetPasswordOtp = null;
            user.resetPasswordExpiresAt = null;
        }

        await user.save();
        await sendToken(user, res, 201, verificationMessage);

    } catch (error) {
        console.error("Error during verification:", error);
        return res.status(500).json({ success: false, message: "An error occurred during verification." });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const { type } = req.params;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Please provide an email." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const { otp, expiresAt } = generateOtp(6, 120000); // Generate a new OTP valid for 2 minutes
        let emailContent;

        if (type === 'email') {
            if (user.isVerified) {
                return res.status(400).json({ success: false, message: "Email is already verified." });
            }
            user.otp = otp;
            user.expiresAt = expiresAt;

            emailContent = {
                email: email,
                subject: "Verify Your Email Address",
                message: `Hello ${user.name},\n\n` +
                    `Please verify your email address using the OTP below:\n\n` +
                    `OTP: ${otp}\n` +
                    `This OTP is valid for 2 minutes (expires at: ${new Date(expiresAt).toISOString()}).\n\n` +
                    `Thank you for joining us!`,
            };
        } else if (type === 'password') {
            user.resetPasswordOtp = otp;
            user.resetPasswordExpiresAt = expiresAt;

            emailContent = {
                email: email,
                subject: "Password Reset Verification OTP",
                message: `Hello ${user.name},\n\n` +
                    `You requested to reset your password. Use the OTP below to verify your request:\n\n` +
                    `OTP: ${otp}\n` +
                    `This OTP is valid for 2 minutes (expires at: ${new Date(expiresAt).toISOString()}).\n\n` +
                    `If you did not request a password reset, please ignore this email.`,
            };
        } else {
            return res.status(400).json({ success: false, message: "Invalid resend type." });
        }

        await sendEmail(emailContent); // Send the email
        await user.save(); // Save the updated OTP and expiration

        res.status(200).json({ success: true, message: "A new OTP has been sent to your email." });

    } catch (error) {
        console.error("Error during OTP resend:", error);
        res.status(500).json({ success: false, message: "An error occurred while resending OTP. Please try again later." });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { name, email, PhoneNumber, Gender } = req.body;

        const updateFields = {};

        if (name) {
            updateFields.name = name;
            updateFields.ProfileImage = `https://ui-avatars.com/api/?background=random&name=${name}`;
        }
        if (email) updateFields.email = email;
        if (PhoneNumber) updateFields.PhoneNumber = PhoneNumber;
        if (Gender) updateFields.Gender = Gender;

        const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
            new: true,
            runValidators: true
        });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({ success: false, message: "An error occurred while updating the profile" });
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please provide both your email and password." });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with that email." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "The password you entered is incorrect. Please try again." });
        }

        if (!user.isVerified) {
            const { otp, expiresAt } = generateOtp(6, 120000);
            user.otp = otp;
            user.expiresAt = expiresAt;

            const emailContent = {
                email: email,
                subject: "Verify Your Email Address",
                message: `Hello,\n\n` +
                    `It seems your email address is not verified yet. we need you to verify your email address. Please use the OTP below:\n\n` +
                    `OTP: ${otp}\n` +
                    `This OTP is valid for 2 minutes (expires at: ${new Date(expiresAt).toISOString()}).\n\n` +
                    `Thank you for being with us! Please verify your email address and enjoy our services.\n`,
            };

            await sendEmail(emailContent);
            await user.save();
            return res.status(200).json({ success: true, message: "We've sent you a verification email. Please check your inbox!" });
        }

        if (user.isBanned) {
            return res.status(403).json({ success: false, message: "Your account has been banned. Please contact our support team." });
        }

        await sendToken(user, res, 200, "Login successful! Welcome back!");
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "An error occurred during login. Please try again later." });
    }
};


exports.logout = (req, res) => {
    try {

        res.cookie("token", "", { expires: new Date(0), httpOnly: true });
        res.status(200).json({ success: true, message: "Logout successful. You have been logged out." });
    } catch (error) {
        console.error("Error during logout:", error);
        res.status(500).json({ success: false, message: "An error occurred during logout. Please try again later." });
    }
};


exports.forgotPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Please provide your email address." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with that email address." });
        }

        const { otp, expiresAt } = generateOtp(6, 120000);
        user.resetPasswordOtp = otp;
        user.resetPasswordExpiresAt = expiresAt;

        const emailContent = {
            email: email,
            subject: "Password Reset Request",
            message: `Hello,\n\n` +
                `We received a request to reset the password for your account. Please use the OTP below to proceed with your password reset:\n\n` +
                `OTP: ${otp}\n` +
                `This OTP is valid for 2 minutes (expires at: ${new Date(expiresAt).toISOString()}).\n\n` +
                `To complete the reset, please visit the following link:\n` +
                `${process.env.FRONTEND_URL}/reset-password/${user._id}?token=${otp}&email=${email}&password=${newPassword}\n\n` +
                `If you did not request this, please ignore this email, and your password will remain unchanged.\n`,
        };

        await sendEmail(emailContent);
        await user.save();

        return res.status(200).json({
            success: true,
            message: "A password reset email has been sent. Please check your inbox for further instructions."
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({ success: false, message: "An error occurred during the password reset process. Please try again later." });
    }
};



//==============Admin Works ==================//
exports.getAllUsers = async (req, res) => {
    try {
        const { isBanned, isVerified, PhoneNumber, email, Gender } = req.query;

        const filter = {};
        if (isBanned !== undefined) filter.isBanned = isBanned === 'true';
        if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
        if (PhoneNumber) filter.PhoneNumber = PhoneNumber;
        if (email) filter.email = email;
        if (Gender) filter.Gender = Gender;

        const users = await User.find(filter).select('-Password');

        res.status(200).json({ success: true, data: users })
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ success: false, message: "An error occurred while retrieving users." });
    }
};

exports.getSingleUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select('-Password');;

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        res.status(500).json({ success: false, message: "An error occurred while retrieving the user." });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, message: "User account deleted successfully" });
    } catch (error) {
        console.error("Error deleting account:", error);
        res.status(500).json({ success: false, message: "An error occurred while deleting the account" });
    }
};

exports.banUserToggle = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.isBanned = !user.isBanned; // Toggle the isBanned status
        await user.save();

        const status = user.isBanned ? "banned" : "unbanned";
        res.status(200).json({ success: true, message: `User has been ${status} successfully` });
    } catch (error) {
        console.error("Error toggling ban status:", error);
        res.status(500).json({ success: false, message: "An error occurred while toggling ban status" });
    }
};
