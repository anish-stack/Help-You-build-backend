const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = async (req, res) => {
    try {
        const MONOGO_LINK = process.env.MONGO_LINK
        // mongoose.connect(MONOGO_LINK)
        mongoose.connect(MONOGO_LINK);
        console.log('MongoDB Connected...')
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        })
    }
}

module.exports = connectDB