const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.body.token || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '').replace(/^"|"$/g, '') : '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Please Login to Access this',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);

      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

  } catch (error) {
    // Handle any unexpected errors
    console.error('Internal Server Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};
