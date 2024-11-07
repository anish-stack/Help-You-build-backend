const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ProfileData = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,

    },
    age: {
        type: Number,
    },
    ProfileImage: {
        url: {
            type: String,
        },
        cloudinary_id: {
            type: String,
        }
    },
    gender: {
        type: String,
        enum: ['Mr', 'Mrs'],
        default: 'Mr'
    },
    nationality: {
        type: String
    },
    occupation: {
        type: String
    },
    education: {
        type: String
    },
    experience: {
        type: String
    },
    Bio: {
        type: String
    },
    DocumentOne: {
        type: String
    },
    DocumentTwo: {
        type: String
    },
    isDocumentVerified: {
        type: Boolean,
        default: false
    },
    DocumentVerifiedDate: {
        type: Date
    },
    DocumentRejectReson: {
        type: String
    },
    DocumentRejectDate: {
        type: Date
    },
})



const ProviderSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["Architect", "Interior", "Vastu"],
        required: true
    },
    Bio: {
        type: String
    },
    phone_number: {
        type: String,
        required: true
    },
    address: {
        type: String
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    MemberType: {
        type: String,
        enum: ['Free', 'Premium'],
        default: 'Free'
    },
    password: {
        type: String,
        required: true
    },
    profileData: ProfileData,
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }],
    rating: {
        type: Number,
        min: 0,
        default: 0,
        max: 5
    },
    role: {
        type: String,
        default: 'provider'
    },
    isProfileComplete: {
        type: Boolean,
        default: false
    },
    portfolio: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Portfolio'
    }
}, { timestamps: true });

ProviderSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

ProviderSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
}

module.exports = mongoose.model('Provider', ProviderSchema);
