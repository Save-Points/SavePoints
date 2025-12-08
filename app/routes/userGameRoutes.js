import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import cookieParser from 'cookie-parser';
import { authorize } from '../middleware/authorize.js';

let router = Router();
router.use(cookieParser());

router.post('/add', authorize, async (req, res) => {
    const userId = req.user.id;
    const { body } = req;

    if (!body.gameId) {
        return res.status(400).json({ error: 'Missing game id.'});
    }

    try {
        const result = await pool.query(
            `INSERT INTO user_games (user_id, game_id, rating, status, favorited, hours_played) 
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id, game_id) DO UPDATE SET
                rating = CASE WHEN EXCLUDED.rating IS NOT NULL THEN EXCLUDED.rating ELSE user_games.rating END,
                status = CASE WHEN EXCLUDED.status IS NOT NULL THEN EXCLUDED.status ELSE user_games.status END,
                hours_played = CASE WHEN EXCLUDED.hours_played IS NOT NULL THEN EXCLUDED.hours_played ELSE user_games.hours_played END,
                favorited = CASE WHEN EXCLUDED.favorited IS NOT NULL THEN EXCLUDED.favorited ELSE user_games.favorited END
            `, 
             [
                userId, 
                body.gameId || null, 
                body.rating ? Number(parseFloat(body.rating).toFixed(2)) : null, 
                body.status || null,
                typeof body.favorited === 'boolean' ? body.favorited : null,
                body.hoursPlayed ? parseInt(body.hoursPlayed) : null,
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
});

router.get("/", authorize, async (req, res) => {
    const userId = req.user.id;
    const favorites = req.query.favorites;
    const gameIds = req.query.gameIds ? req.query.gameIds.split(',').map(id => Number(id)) : null;

    try {
        let query = `SELECT ug.game_id, ug.rating, ug.created_at, ug.updated_at, ug.status, ug.favorited, ug.hours_played
            FROM user_games ug
            JOIN users u ON u.id = ug.user_id
            WHERE u.id = $1`;

        if (favorites) {
            query += ' AND ug.favorited = true';
        }

        if (gameIds) {
            query += ' AND game_id = ANY($2)';
        }

        let params = gameIds ? [userId, gameIds] : [userId];
        const result = await pool.query(query, params);

        if (result.rows) {
            return res.status(200).json(result.rows);
        } else {
            return res.status(404).json({ error: "User not found." })
        }
    } catch (error) {
        console.log('GET GAME LIST FAILED', error);
        return res.status(500).json({ error: "Internal server error." })
    }
});

router.get("/:username", async (req, res) => {
    const username = req.params.username;
    const favorites = req.query.favorites;

    try {
        let query = `SELECT ug.game_id, ug.rating, ug.created_at, ug.updated_at, ug.status, ug.favorited, ug.hours_played
            FROM user_games ug
            JOIN users u ON u.id = ug.user_id
            WHERE u.username = $1`;

        if (favorites) {
            query += ' AND ug.favorited = true';
        }
        const result = await pool.query(query, [username]);

        if (result.rows) {
            return res.status(200).json(result.rows);
        } else {
            return res.status(404).json({ error: "User not found." })
        }
    } catch (error) {
        console.log('GET GAME LIST FAILED', error);
        return res.status(500).json({ error: "Internal server error." })
    }
});

router.get("/current/:gameId", authorize, async (req, res) => {
    const userId = req.user.id;
    const gameId = req.params.gameId;

    try {
        let query = `SELECT ug.game_id, ug.rating, ug.created_at, ug.updated_at, ug.status, ug.favorited, ug.hours_played
            FROM user_games ug
            JOIN users u ON u.id = ug.user_id
            WHERE u.id = $1 AND ug.game_id = $2`;

        const result = await pool.query(query, [userId, gameId]);

        if (result.rows) {
            return res.status(200).json(result.rows);
        } else {
            return res.status(404).json({ error: "User not found." })
        }
    } catch (error) {
        console.log('GET GAME LIST FAILED', error);
        return res.status(500).json({ error: "Internal server error." })
    }
});


router.post('/togglefavorite', authorize, async (req, res) => {
    const userId = req.user.id;
    const { body } = req;

    if (!body.gameId) {
        return res.status(400).json({ error: 'Missing game id.'});
    }

    try {
        await pool.query(
            `INSERT INTO user_games (user_id, game_id, favorited) 
             VALUES ($1, $2, true)
             ON CONFLICT (user_id, game_id)
             DO UPDATE SET favorited = NOT user_games.favorited
             `, 
             [
                userId, 
                body.gameId
            ]
        );

        return res.status(200).send();
    } catch (error) {
        console.log('TOGGLE FAVORITE FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
