const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    Gender: {
        type: String,
        enum: ['Mr', 'Mrs'],
        default: 'Mr',
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,

    },
    PhoneNumber: {
        type: String,
        required: true,
    },
    Password: {
        type: String,
        required: true,
    },
    cPassword: {
        type: String,
        required: true,
    },
    
    ProfileImage: {
        type: String,
        default: 'https://ui-avatars.com/api/?background=random&name=user'
    },
    HowManyHit: {
        type: String,
    },
    otp:{
        type: String,
    },
    expiresAt:{
        type: Date,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        default: "user"
    },
    resetPasswordOtp:{
        type: String,
    },
    resetPasswordExpiresAt:{
        type: Date,
    },
    isBanned: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });


userSchema.pre('save', async function (next) {
    if (!this.isModified('Password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.Password = await bcrypt.hash(this.Password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function (candidatePassword) {   
    return await bcrypt.compare(candidatePassword, this.Password);
}

const User = mongoose.model('User', userSchema);
module.exports = User;
