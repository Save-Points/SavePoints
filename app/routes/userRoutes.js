import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import cookieParser from 'cookie-parser';
import { authorize } from '../middleware/authorize.js';

let router = Router();
router.use(cookieParser());

router.get('/search', async (req, res) => {
    const searchTerm = req.query.term;
    const offset = req.query.offset;

    let searchQuery = `
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
        LIMIT 20
    `

    searchQuery += searchTerm ? 'OFFSET $2' : 'OFFSET $1';
    const searchValues = searchTerm ? [`%${searchTerm}%`, offset] : [offset];


    let countQuery = `
        SELECT 
            COUNT(*) AS count
        FROM users u 
        ${searchTerm ? 'WHERE u.username ILIKE $1' : ''}
    `

    const countValues = searchTerm ? [`%${searchTerm}%`] : [];

    try {
        const userRes = await pool.query(searchQuery, searchValues);
        const countRes = await pool.query(countQuery, countValues);

        return res.status(200).json({
            rows: userRes.rows,
            count: parseInt(countRes.rows[0].count, 10),
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
            `SELECT 
                u.id,
                u.username,
                u.bio,
                u.profile_pic_url,
                u.created_at,
                COALESCE(SUM(CASE WHEN rv.vote = 'upvote' THEN 1 ELSE 0 END), 0)::int AS total_review_upvotes,
                COALESCE(SUM(CASE WHEN rv.vote = 'downvote' THEN 1 ELSE 0 END), 0)::int AS total_review_downvotes,
                COALESCE(SUM(CASE WHEN rpv.vote = 'upvote' THEN 1 ELSE 0 END), 0)::int AS total_reply_upvotes,
                COALESCE(SUM(CASE WHEN rpv.vote = 'downvote' THEN 1 ELSE 0 END), 0)::int AS total_reply_downvotes
            FROM users u
            LEFT JOIN reviews r ON r.user_id = u.id
            LEFT JOIN review_votes rv ON rv.review_id = r.id
            LEFT JOIN review_replies rr ON rr.user_id = u.id
            LEFT JOIN reply_votes rpv ON rpv.reply_id = rr.id
            WHERE LOWER(u.username) = LOWER($1)
            GROUP BY u.id;`,
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

// Gets reviews created by a specific user across all games
router.get('/:userId/reviews', async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user id.' });
    }

    try {
        const { rows } = await pool.query(
            `
            SELECT r.id AS review_id, r.game_id, r.review_text, r.created_at, r.updated_at, r.deleted_at, ug.rating AS user_rating
            FROM reviews r
            LEFT JOIN user_games ug
                ON ug.user_id = r.user_id
               AND ug.game_id = r.game_id
            WHERE r.user_id = $1
              AND r.deleted_at IS NULL
            ORDER BY r.created_at DESC;
            `,
            [userId],
        );

        return res.json(rows);
    } catch (error) {
        console.error('Error loading user reviews:', error.message);
        return res.status(500).json({ error: 'Failed to load user reviews.' });
    }
});

export default router;
