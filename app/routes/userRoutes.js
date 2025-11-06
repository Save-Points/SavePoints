import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';

let router = Router();

router.get('/search', async (req, res) => {
    let searchTerm = req.query.term;

    if (!searchTerm) {
        return res.status(400).json({ error: 'No search term provided.' });
    }

    try {
        await pool
            .query(`SELECT id, username, profile_pic_url FROM users WHERE username ILIKE $1 LIMIT 50`, [
                `${searchTerm}%`,
            ])
            .then((result) => {
                res.status(200).json({
                    rows: result.rows
                });
            });
    } catch (error) {
        console.log('SELECT FAILED', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
