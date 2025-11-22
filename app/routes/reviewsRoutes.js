import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/:gameId', authorize, async (req, res) => {
    const userId = req.user.id;
    const gameId = parseInt(req.params.gameId);
    const { review_text } = req.body;

    try {
        await pool.query(
            `
            INSERT INTO reviews (user_id, game_id, review_text)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, game_id)
            DO UPDATE SET review_text = EXCLUDED.review_text,
                          updated_at = NOW();
            `,
            [userId, gameId, review_text],
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
            SELECT r.id, ug.rating, r.review_text, r.created_at,
                   u.username, u.profile_pic_url
            FROM reviews r
            JOIN users u ON u.id = r.user_id
            JOIN user_games ug ON ug.user_id = u.id AND ug.game_id = r.game_id
            WHERE r.game_id = $1
            ORDER BY created_at DESC;
            `,
            [gameId],
        );

        res.status(200).json(result.rows);
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
