import jwt from 'jsonwebtoken';
export const generateAccessToken = (user) => {
    return jwt.sign(user, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
};
export const generateRefreshToken = (user) => {
    return jwt.sign(user, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
export const verifyToken = (token, secret) => {
    return jwt.verify(token, secret);
};
export const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    }
    catch (error) {
        return null;
    }
};
