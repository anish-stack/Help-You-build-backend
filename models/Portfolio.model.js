const mongoose = require('mongoose');

const PortfolioModel = new mongoose.Schema({
    TextWhichYouShow: {
        type: String
    },
    PortfolioLink: {
        url: {
            type: String
        },
        cloudinary_id: {
            type: String
        }
    },
    isGalleryUploaded: {
        type: Boolean,
        default: false
    },
    GalleryImages: [
        {

            url: {
                type: String
            },
            cloudinary_id: {
                type: String
            }
        }
    ],
    ProviderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider'
    }

}, { timestamps: true })

module.exports = mongoose.model('Portfolio', PortfolioModel);
