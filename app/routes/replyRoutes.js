import { Router } from 'express';
import { pool, sendNotification } from '../utils/dbUtils.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Similar to review deletion but for a reply, with some changed logic as a reply card can never be deleted no matter what
router.delete('/:replyId', authorize, async (req, res) => {
    const userId = req.user.id;
    const replyId = parseInt(req.params.replyId, 10);

    if (!replyId || Number.isNaN(replyId)) {
        return res.status(400).json({ error: 'Invalid reply id.' });
    }

    try {
        const existing = await pool.query(
            'SELECT user_id FROM review_replies WHERE id = $1 AND deleted_at IS NULL',
            [replyId],
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Reply not found.' });
        }

        if (existing.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'User ID of reply does not match your user ID.' });
        }

        await pool.query(
            'UPDATE review_replies SET deleted_at = NOW() WHERE id = $1;',
            [replyId],
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Reply delete error', error);
        return res.status(500).json({ error: 'Failed to delete reply.' });
    }
});

// reply editing functionality
router.put('/:replyId', authorize, async (req, res) => {
    const userId = req.user.id;
    const replyId = parseInt(req.params.replyId, 10);
    const { reply_text } = req.body;

    if (!replyId || Number.isNaN(replyId)) {
        return res.status(400).json({ error: 'Invalid reply id.' });
    }

    try {
        const existing = await pool.query(
            'SELECT user_id FROM review_replies WHERE id = $1 AND deleted_at IS NULL',
            [replyId],
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Reply not found.' });
        }

        if (existing.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'User ID of reply does not match your user ID.' });
        }

        await pool.query(
            `
            UPDATE review_replies
            SET reply_text = $1, updated_at = NOW()
            WHERE id = $2;
            `,
            [reply_text || '', replyId],
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Reply update error', error);
        return res.status(500).json({ error: 'Failed to update reply.' });
    }
});

// Reply voting
router.post('/:replyId/vote', authorize, async (req, res) => {
    const userId = req.user.id;
    const replyId = parseInt(req.params.replyId, 10);
    const { vote } = req.body;

    if (!replyId || Number.isNaN(replyId)) {
        return res.status(400).json({ error: 'Invalid reply id.' });
    }

    if (!['upvote', 'downvote', 'none'].includes(vote)) {
        return res.status(400).json({ error: 'Invalid vote.' });
    }

    try {
        if (vote === 'none') {
            await pool.query(
                'DELETE FROM reply_votes WHERE user_id = $1 AND reply_id = $2',
                [userId, replyId],
            );
        } else {
            await pool.query(
                `
                INSERT INTO reply_votes (user_id, reply_id, vote)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, reply_id)
                DO UPDATE SET vote = EXCLUDED.vote;
                `,
                [userId, replyId, vote],
            );

            if (vote === 'upvote') {
                const replyRes = await pool.query('SELECT user_id, game_id FROM review_replies WHERE id = $1', [replyId]);
                if (replyRes.rows.length > 0) {
                    const ownerId = replyRes.rows[0].user_id;
                    const gameId = replyRes.rows[0].game_id;
                    
                    if (ownerId !== userId) {
                        const sender = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
                        const senderName = sender.rows[0].username;

                        const exists = await pool.query(
                            `SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'upvote' AND message LIKE $2`,
                            [ownerId, `${senderName} upvoted your comment%`]
                        );

                        if (exists.rows.length === 0) {
                            const link = `/game?id=${gameId}`;
                            await sendNotification(ownerId, 'upvote', `${senderName} upvoted your comment`, link);
                        }
                    }
                }
            }
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Reply vote error', error);
        return res.status(500).json({ error: 'Failed to vote on reply.' });
    }
});

export default router;