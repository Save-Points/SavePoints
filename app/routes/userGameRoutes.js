import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import cookieParser from 'cookie-parser';
import { authorize } from '../middleware/authorize.js';

let router = Router();
router.use(cookieParser());

router.post('/add', authorize, async (req, res) => {
    const userId = req.user.id;
    const { body } = req;

    if (!body.igdbGameId && !body.customGameId) {
        return res.status(400).json({ error: 'Missing game id.'});
    }

    try {
        const result = await pool.query(
            `INSERT INTO user_games (user_id, igdb_game_id, custom_game_id, rating, status, favorited, hours_played) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING`, 
             [
                userId, 
                body.igdbGameId || null, 
                body.customGameId || null, 
                body.rating === '' ? null : Number(parseFloat(body.rating).toFixed(2)), 
                body.status || 'planned',
                body.favorited || false,
                body.hoursPlayed === '' ? 0 : parseInt(body.hoursPlayed)
            ]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ error: 'Game already in list.' });
        }

        return res.status(201).send();
    } catch (error) {
        console.log('ADD USER GAME FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
})

export default router;
