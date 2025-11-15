import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/:gameId', authorize, async (req, res) => {
    const userId = req.user.id;
    const gameId = parseInt(req.params.gameId);
    const { rating, review_text } = req.body;

    if (!rating || rating < 1 || rating > 10) {
        return res.status(400).json({ error: 'Rating must be 1–10.' });
    }

    try {
        const result = await pool.query(
            `
            INSERT INTO reviews (user_id, game_id, rating, review_text)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, game_id)
            DO UPDATE SET rating = EXCLUDED.rating,
                          review_text = EXCLUDED.review_text,
                          updated_at = NOW()
            RETURNING *;
            `,
            [userId, gameId, rating, review_text],
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Review insert error', error);
        res.status(500).json({ error: 'Failed to post review.' });
    }
});

router.get('/:gameId', async (req, res) => {
    const gameId = parseInt(req.params.gameId);

    try {
        const result = await pool.query(
            `
            SELECT r.id, r.rating, r.review_text, r.created_at,
                   u.username, u.profile_pic_url
            FROM reviews r
            JOIN users u ON u.id = r.user_id
            WHERE game_id = $1
            ORDER BY created_at DESC;
            `,
            [gameId],
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Review fetch error', error);
        res.status(500).json({ error: 'Failed to load reviews.' });
    }
});

router.get('/:gameId/user', authorize, async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const userId = req.user.id;

    try {
        const result = await pool.query(
            `SELECT * FROM reviews WHERE user_id=$1 AND game_id=$2`,
            [userId, gameId],
        );

        res.json(result.rows[0] || null);
    } catch (error) {
        console.error('User review fetch error', error);
        res.status(500).json({ error: 'Failed to load your review.' });
    }
});

export default router;
