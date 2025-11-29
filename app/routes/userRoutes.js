import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import cookieParser from 'cookie-parser';
import { authorize } from '../middleware/authorize.js';

let router = Router();
router.use(cookieParser());

router.get('/search', async (req, res) => {
    const searchTerm = req.query.term;

    let query = `
        SELECT
            u.id, 
            u.username, 
            u.profile_pic_url, 
            u.bio,
            COUNT(ug.user_id) AS game_count
        FROM users u
        LEFT JOIN user_games ug ON ug.user_id = u.id
        ${searchTerm ? 'WHERE u.username ILIKE $1' : ''}
        GROUP BY u.id
        LIMIT 50;
    `
    let values;

    if (searchTerm) {
        values = [`${searchTerm}%`];
    } else {
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
            'SELECT id, username, profile_pic_url, bio, created_at FROM users WHERE id = $1',
            [userId],
        );

        if (userResult.rows.length == 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        return res.status(200).json(userResult.rows[0]);
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

router.get('/view/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, username, bio, profile_pic_url, created_at FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(`GET /view/${username} failed:`, error);
        res.status(500).json({ error: 'Internal server error.' });
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
