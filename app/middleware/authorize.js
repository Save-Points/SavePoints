import { pool } from '../utils/dbUtils.js';

export const authorize = async (req, res, next) => {
    const { token } = req.cookies;

    if (!token) {
        return res.status(401).json({ error: 'No token provided.' });
    }

    try {
        const result = await pool.query(
            'SELECT user_id FROM auth_tokens WHERE token = $1 AND revoked = false AND expires_at > NOW()',
            [token],
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Forbidden.' });
        }

        req.user = { id: result.rows[0].user_id };
        next();
    } catch (error) {
        console.log('AUTHORIZATION FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
