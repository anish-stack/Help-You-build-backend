const generateOtp = (length, expireTime) => {
    if (length < 1 || length > 10) {
        throw new Error("Length must be between 1 and 10");
    }

    const otp = Math.floor(Math.pow(10, length - 1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1))).toString();
    const expiresAt = Date.now() + expireTime;

    return {
        otp,
        expiresAt
    };
};

module.exports = generateOtp;