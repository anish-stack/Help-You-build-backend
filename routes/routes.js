const express = require('express');
const { registeruser, getAllUsers, getSingleUserById, updateProfile, login, logout, deleteAccount, banUserToggle, verifyEmail, resendOtp, forgotPassword } = require('../controllers/user.Controller');
const { protect } = require('../middlewares/Protect');
const { RegisterProvider, AddProfileDetails, addPortfolio, GetAllProvider } = require('../controllers/provider.controller');
const { UploadViaFieldName, handleMulterErrors } = require('../middlewares/Multer');

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
router.post('/register-provider', RegisterProvider);
router.post('/add-profile/:provider', handleMulterErrors, UploadViaFieldName(['DocumentOne', 'DocumentTwo']), AddProfileDetails);
router.post('/add-portfolio', handleMulterErrors, UploadViaFieldName(['PortfolioLink', 'GalleryImages']), addPortfolio);
router.get('/get-providers', GetAllProvider);




//admin routes
router.get('/users', protect, getAllUsers);
router.get('/user/:id', protect, getSingleUserById);
router.delete('/user/:userId', protect, deleteAccount);
router.put('/user/:userId/ban', protect, banUserToggle);

module.exports = router;
