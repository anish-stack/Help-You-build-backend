const express = require('express');
const { registeruser, getAllUsers, getSingleUserById, updateProfile, login, logout, deleteAccount, banUserToggle, verifyEmail, resendOtp, forgotPassword } = require('../controllers/user.Controller');
const { protect } = require('../middlewares/Protect');
const { CreateProvider, GetMyProfile, addPortfolio } = require('../controllers/provider.controller');
const { UploadViaFieldName, handleMulterErrors } = require('../middlewares/Multer');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const router = express.Router();


//User registration related routes
router.post('/register', registeruser);
router.put('/user/update-profile', protect, updateProfile);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/verify/:type', verifyEmail);
router.post('/resend-otp/:type', resendOtp);
router.post('/forgot-password', forgotPassword);

//providers registration related routes
router.post(
    '/register-provider',
    (req, res, next) => {
        upload.fields([
            { name: 'adhaarCard', maxCount: 2 },
            { name: 'panCard', maxCount: 1 },
            { name: 'qualificationProof', maxCount: 1 },
            { name: 'photo', maxCount: 1 }

        ])(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: 'File upload error',
                    error: err.message
                });
            }
            next();
        });
    },
    CreateProvider
);

router.get('/GetMyProfile',protect,GetMyProfile)
router.post('/addPortfolio',protect, (req, res, next) => {
    upload.fields([
        { name: 'PortfolioLink', maxCount: 1 },
        { name: 'GalleryImages', maxCount: 10 },
  

    ])(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: 'File upload error',
                error: err.message
            });
        }
        next();
    });
},addPortfolio)







//admin routes
router.get('/users', protect, getAllUsers);
router.get('/user/:id', protect, getSingleUserById);
router.delete('/user/:userId', protect, deleteAccount);
router.put('/user/:userId/ban', protect, banUserToggle);

module.exports = router;
