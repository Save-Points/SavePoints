import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/status/:targetId', authorize, async (req, res) => {
    const myId = req.user.id;
    const targetId = parseInt(req.params.targetId);

    if (myId === targetId) {
        return res.json({ status: 'self' });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM friends 
             WHERE (requester_id = $1 AND receiver_id = $2) 
                OR (requester_id = $2 AND receiver_id = $1)`,
            [myId, targetId]
        );

        if (result.rows.length === 0) {
            return res.json({ status: 'none' });
        }

        const friendship = result.rows[0];
        
        if (friendship.status === 'accepted') {
            return res.json({ status: 'friends' });
        }
        
        if (friendship.requester_id === myId) {
            return res.json({ status: 'sent' });
        } else {
            return res.json({ status: 'received', requestId: friendship.id });
        }

    } catch (error) {
        console.error('Friend status error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/request', authorize, async (req, res) => {
    const myId = req.user.id;
    const { targetId } = req.body;

    try {
        await pool.query(
            'INSERT INTO friends (requester_id, receiver_id) VALUES ($1, $2)',
            [myId, targetId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Friend request error', error);
        res.status(500).json({ error: 'Failed to send request' });
    }
});

router.post('/accept', authorize, async (req, res) => {
    const myId = req.user.id;
    const { requesterId } = req.body;

    try {
        await pool.query(
            `UPDATE friends SET status = 'accepted', updated_at = NOW()
             WHERE requester_id = $1 AND receiver_id = $2 AND status = 'pending'`,
            [requesterId, myId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Friend accept error', error);
        res.status(500).json({ error: 'Failed to accept request' });
    }
});

router.get('/list/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);

    try {
        const result = await pool.query(
            `SELECT u.id, u.username, u.profile_pic_url 
             FROM friends f
             JOIN users u ON (
                CASE 
                    WHEN f.requester_id = $1 THEN f.receiver_id = u.id
                    ELSE f.requester_id = u.id
                END
             )
             WHERE (f.requester_id = $1 OR f.receiver_id = $1) 
             AND f.status = 'accepted'`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Friend list error', error);
        res.status(500).json({ error: 'Failed to list friends' });
    }
});

export default router;