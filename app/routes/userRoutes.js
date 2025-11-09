import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import cookieParser from 'cookie-parser';

let router = Router();
router.use(cookieParser());

router.get('/search', async (req, res) => {
    const searchTerm = req.query.term;

    let query;
    let values;

    if (searchTerm) {
        query = `SELECT id, username, profile_pic_url FROM users WHERE username ILIKE $1 LIMIT 50`;
        values = [`${searchTerm}%`];
    } else {
        query = `SELECT id, username, profile_pic_url FROM users LIMIT 50`;
        values = [];
    }

    try {
        await pool.query(query, values).then((result) => {
            res.status(200).json({
                rows: result.rows,
            });
        });
    } catch (error) {
        console.log('SELECT FAILED', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/current', async (req, res) => {
    const { token } = req.cookies;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
        const tokenResult = await pool.query(
            'SELECT user_id FROM auth_tokens WHERE token = $1 AND revoked = false AND expires_at > NOW()',
            [token],
        );

        if (tokenResult.rows.length == 0) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const userResult = await pool.query(
            'SELECT username, profile_pic_url FROM users WHERE id = $1',
            [tokenResult.rows[0].user_id],
        );

        if (userResult.rows.length == 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        return res.status(200).json({
            username: userResult.rows[0].username,
            profile_pic_url: userResult.rows[0].profile_pic_url,
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
