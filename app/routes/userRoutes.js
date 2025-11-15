import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import cookieParser from 'cookie-parser';
import { authorize } from '../middleware/authorize.js';

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
            'SELECT username, profile_pic_url, bio, created_at FROM users WHERE id = $1',
            [userId],
        );

        if (userResult.rows.length == 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        return res.status(200).json({
            username: userResult.rows[0].username,
            profile_pic_url: userResult.rows[0].profile_pic_url,
            bio: userResult.rows[0].bio,
            created_at: userResult.rows[0].created_at
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.put('/update', authorize, async (req, res) => {
    const userId = req.user.id;
    const { profile_pic_url, bio } = req.body;

    try {
        await pool.query(
            'UPDATE users SET profile_pic_url = $1, bio = $2 WHERE id = $3',
            [profile_pic_url, bio, userId],
        );
        res.status(200).json({ message: 'Updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const result = await pool.query(
            'SELECT username, bio, profile_pic_url, created_at FROM users WHERE id = $1',
            [id],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // TODO: We also need to fetch user's Favorites and Lists here.

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
