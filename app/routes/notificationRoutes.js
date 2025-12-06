import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Fetch latest 10 notifications
router.get('/', authorize, async (req, res) => {
    try {
        let limitClause = 'LIMIT 10';
        if (req.query.limit === 'all') {
            limitClause = '';
        }

        const result = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC ${limitClause}`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Mark all notifications as read
router.post('/mark-all-read', authorize, async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
            [req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Mark all read error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

export default router;