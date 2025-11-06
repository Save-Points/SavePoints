import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';

let router = Router();

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
        await pool
            .query(query, values)
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
