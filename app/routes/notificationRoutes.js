import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Fetch latest 10 notifications
router.get('/', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Notification fetch error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Mark specific notification as read
router.post('/read/:id', authorize, async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Notification read error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

export default router;