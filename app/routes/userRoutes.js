import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import cookieParser from 'cookie-parser';
import { authorize } from '../middleware/authorize.js'

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

router.get('/current', authorize, async (req, res) => {
    const userId = req.user.id;

    try {
        const userResult = await pool.query(
            'SELECT username, profile_pic_url FROM users WHERE id = $1',
            [userId],
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
