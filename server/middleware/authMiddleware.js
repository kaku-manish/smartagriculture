const jwt = require('jsonwebtoken');
const SECRET_KEY = 'paddy_secret_key'; // In a real production app, use process.env.JWT_SECRET

/**
 * Authentication Middleware
 * Usage: auth('admin') or auth('farmer')
 */
const auth = (requiredRole) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            try {
                const decoded = jwt.verify(token, SECRET_KEY);
                req.user = decoded;
            } catch (err) {
                console.warn('Invalid token provided, but continuing due to bypass mode');
            }
        }

        // DEVELOPMENT BYPASS:
        // Populate req.user from a special header if token is missing
        // This helps during transition phase.
        if (!req.user && req.headers['x-user-id']) {
            req.user = { id: parseInt(req.headers['x-user-id']), role: requiredRole };
        }

        // Temporary bypass to allow app to function while tokens are being integrated
        return next();
    };
};

module.exports = auth;
