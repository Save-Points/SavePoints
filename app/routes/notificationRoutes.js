import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Fetch latest 10 notifications
router.get('/', authorize, async (req, res) => {
    const userId = req.user.id;
    try {
        let limitClause = 'LIMIT 10';
        if (req.query.limit === 'all') {
            limitClause = '';
        }

        const result = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC ${limitClause}`,
             [userId]
        );

        const unreadCount = await pool.query(
            `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
            [userId]
        );

        res.status(200).json({
            rows: result.rows,
            unreadCount: Number(unreadCount.rows[0].count)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

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

// Mark all notifications as read
router.post('/mark-all-read', authorize, async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
            [req.user.id]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Mark all read error:", err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.delete('/remove-friend-request/:targetId', authorize, async (req, res) => {
    try {
        await pool.query(
            `DELETE FROM notifications WHERE id = 
            (
                SELECT id FROM notifications WHERE type = 'friend_request' AND user_id = $1
                ORDER BY created_at DESC LIMIT 1
            )`,
            [req.params.targetId]
        )
        return res.status(200).send();
    } catch (error) {
        console.log('REMOVE FRIEND REQUEST NOTIFICATION FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;