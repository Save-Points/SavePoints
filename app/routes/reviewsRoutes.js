import { Router } from 'express';
import { pool, sendNotification } from '../utils/dbUtils.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// This is a major helper function to load all of the information for the review page (i.e. reviews, replies, vote counts)
async function getReviewsTree(gameId) {

    // queries reviews, user info, and votes
    const reviewsResult = await pool.query(
        `
        SELECT r.id, r.user_id, r.game_id, r.review_text, r.created_at, r.updated_at, r.deleted_at, u.username, u.profile_pic_url, ug.rating, COALESCE(SUM(CASE WHEN rv.vote = 'upvote' THEN 1 ELSE 0 END), 0) AS upvotes, COALESCE(SUM(CASE WHEN rv.vote = 'downvote' THEN 1 ELSE 0 END), 0) AS downvotes
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        LEFT JOIN user_games ug ON ug.user_id = r.user_id AND ug.game_id = r.game_id
        LEFT JOIN review_votes rv ON rv.review_id = r.id
        WHERE r.game_id = $1
        GROUP BY r.id, u.username, u.profile_pic_url, ug.rating
        ORDER BY r.created_at DESC;
        `,
        [gameId],
    );

    // queries replies, user info, and votes
    const repliesResult = await pool.query(
        `
        SELECT rr.id, rr.review_id, rr.parent_id, rr.user_id, rr.game_id, rr.reply_text, rr.created_at, rr.updated_at, rr.deleted_at, u.username, u.profile_pic_url, COALESCE(SUM(CASE WHEN rv.vote = 'upvote' THEN 1 ELSE 0 END), 0) AS upvotes, COALESCE(SUM(CASE WHEN rv.vote = 'downvote' THEN 1 ELSE 0 END), 0) AS downvotes
        FROM review_replies rr
        JOIN users u ON u.id = rr.user_id
        LEFT JOIN reply_votes rv ON rv.reply_id = rr.id
        WHERE rr.game_id = $1
        GROUP BY rr.id, u.username, u.profile_pic_url
        ORDER BY rr.created_at ASC;
        `,
        [gameId],
    );

    const reviews = reviewsResult.rows;
    const replies = repliesResult.rows;
    
    const reviewsWithActiveReplies = new Set();
    for (const rep of replies) {
        if (!rep.deleted_at) {
            reviewsWithActiveReplies.add(rep.review_id);
        }
    }

    // Converts info from the database into a map of reviews
    const reviewById = new Map();
    for (const r of reviews) {
        reviewById.set(r.id, {
            id: r.id,
            user_id: r.user_id,
            game_id: r.game_id,
            username: r.username,
            profile_pic_url: r.profile_pic_url,
            rating: r.rating,
            review_text: r.review_text,
            display_text: r.deleted_at ? 'Message deleted by user' : (r.review_text || ''),
            created_at: r.created_at,
            updated_at: r.updated_at,
            deleted_at: r.deleted_at,
            upvotes: Number(r.upvotes),
            downvotes: Number(r.downvotes),
            replies: [],
        });
    }

    // Converts info from the database into a map of replies
    const replyById = new Map();
    for (const rep of replies) {
        replyById.set(rep.id, {
            id: rep.id,
            review_id: rep.review_id,
            parent_id: rep.parent_id,
            user_id: rep.user_id,
            game_id: rep.game_id,
            username: rep.username,
            profile_pic_url: rep.profile_pic_url,
            reply_text: rep.reply_text,
            display_text: rep.deleted_at ? 'Message deleted by user' : (rep.reply_text || ''),
            created_at: rep.created_at,
            updated_at: rep.updated_at,
            deleted_at: rep.deleted_at,
            upvotes: Number(rep.upvotes),
            downvotes: Number(rep.downvotes),
            replies: [],
        });
    }

    // Attach replies to parents (review or reply)
    for (const rep of replyById.values()) {
        if (rep.parent_id) {
            const parentReply = replyById.get(rep.parent_id);
            if (parentReply) {
                parentReply.replies.push(rep);
            }
        } else {
            const rev = reviewById.get(rep.review_id);
            if (rev) {
                rev.replies.push(rep);
            }
        }
    }

    // Creates the final list of the reviews, filtering out deleted reviews and any non-valid reviews
    const finalReviews = [];
    for (const r of reviewById.values()) {
        if (!r.deleted_at || reviewsWithActiveReplies.has(r.id)) {
            finalReviews.push(r);
        }
    }

    return finalReviews;
}

// Creates a brand new review for a game
router.post('/:gameId', authorize, async (req, res) => {
    const userId = req.user.id;
    const gameId = parseInt(req.params.gameId, 10);
    const { review_text } = req.body;
    
    try {
        const existing = await pool.query(
            'SELECT id FROM reviews WHERE user_id = $1 AND game_id = $2 AND deleted_at IS NULL',
            [userId, gameId],
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'You already have a review for this game.' });
        }

        await pool.query(
            `
            INSERT INTO reviews (user_id, game_id, review_text)
            VALUES ($1, $2, $3);
            `,
            [userId, gameId, review_text || ''],
        );

        return res.status(201).json({ success: true });
    } catch (error) {
        console.error('Review insert error', error);
        return res.status(500).json({ error: 'Failed to post review.' });
    }
});

// New edit functionality for the reviews
router.put('/:reviewId', authorize, async (req, res) => {
    const userId = req.user.id;
    const reviewId = parseInt(req.params.reviewId, 10);
    const { review_text } = req.body;

    try {
        const existing = await pool.query(
            'SELECT user_id FROM reviews WHERE id = $1 AND deleted_at IS NULL',
            [reviewId],
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found.' });
        }

        if (existing.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'User ID of this review does not match your User ID.' });
        }

        await pool.query(
            `
            UPDATE reviews
            SET review_text = $1, updated_at = NOW()
            WHERE id = $2;
            `,
            [review_text || '', reviewId],
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Review update error', error);
        return res.status(500).json({ error: 'Failed to update review.' });
    }
});

// New deletion functionality for reviews. Instead of deleting from the database it flags the message ass deleted (soft deletion)
router.delete('/:reviewId', authorize, async (req, res) => {
    const userId = req.user.id;
    const reviewId = parseInt(req.params.reviewId, 10);

    try {
        const existing = await pool.query('SELECT user_id FROM reviews WHERE id = $1 AND deleted_at IS NULL', [reviewId],);
        
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found.' });
        }

        if (existing.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'User ID of this review does not match your User ID.' });
        }

        await pool.query(
            'UPDATE reviews SET deleted_at = NOW() WHERE id = $1;',
            [reviewId],
        );
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Review delete error', error);
        return res.status(500).json({ error: 'Failed to delete review.' });
    }
});

// This creates the replies, either for under reviews or for under other replies
router.post('/:reviewId/reply', authorize, async (req, res) => {
    const userId = req.user.id;
    const reviewId = parseInt(req.params.reviewId, 10);
    const { reply_text, parent_reply_id } = req.body;

    if (!reviewId || Number.isNaN(reviewId)) {
        return res.status(400).json({ error: 'Invalid review id.' });
    }

    try {
        const reviewRow = await pool.query(
            'SELECT game_id, user_id FROM reviews WHERE id = $1',
            [reviewId],
        );

        if (reviewRow.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found.' });
        }

        const gameId = reviewRow.rows[0].game_id;
        const reviewOwnerId = reviewRow.rows[0].user_id;

        let parentId = null;
        let targetUserId = reviewOwnerId;

        if (parent_reply_id) {
            const pr = await pool.query(
                'SELECT id, user_id FROM review_replies WHERE id = $1 AND review_id = $2',
                [parent_reply_id, reviewId],
            );
            if (pr.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid parent reply.' });
            }
            parentId = parent_reply_id;
            targetUserId = pr.rows[0].user_id;
        }

        const insertRes = await pool.query(
            `INSERT INTO review_replies (review_id, parent_id, user_id, game_id, reply_text) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [reviewId, parentId, userId, gameId, reply_text || '']
        );

        const newReplyId = insertRes.rows[0].id;

        if (userId !== targetUserId) {
            const sender = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
            const senderName = sender.rows[0].username;

            let msg;
            if (parentId) {
                msg = `${senderName} replied to your comment`;
            } else {
                msg = `${senderName} replied to your review`;
            }

            const link = `/game?id=${gameId}`;

            await pool.query(
                `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, 'reply', $2, $3)`,
                [targetUserId, msg, link]
            );
        }
        return res.status(201).json({ success: true });
    } catch (error) {
        console.error('Reply insert error', error);
        return res.status(500).json({ error: 'Failed to post reply.' });
    }
});

// Review voting
router.post('/:reviewId/vote', authorize, async (req, res) => {
    const userId = req.user.id;
    const reviewId = parseInt(req.params.reviewId, 10);
    const { vote } = req.body;

    if (!reviewId || Number.isNaN(reviewId)) {
        return res.status(400).json({ error: 'Invalid review id.' });
    }

    if (!['upvote', 'downvote', 'none'].includes(vote)) {
        return res.status(400).json({ error: 'Invalid vote.' });
    }

    try {
        if (vote === 'none') {
            await pool.query(
                'DELETE FROM review_votes WHERE user_id = $1 AND review_id = $2',
                [userId, reviewId],
            );
        } else {
            await pool.query(
                `
                INSERT INTO review_votes (user_id, review_id, vote)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, review_id)
                DO UPDATE SET vote = EXCLUDED.vote;
                `,
                [userId, reviewId, vote],
            );

            if (vote === 'upvote') {
                const reviewRes = await pool.query('SELECT user_id, game_id FROM reviews WHERE id = $1', [reviewId]);
                if (reviewRes.rows.length > 0) {
                    const ownerId = reviewRes.rows[0].user_id;
                    const gameId = reviewRes.rows[0].game_id;

                    if (ownerId !== userId) {
                        const sender = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
                        const senderName = sender.rows[0].username;

                        const exists = await pool.query(
                            `SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'upvote' AND message LIKE $2`,
                            [ownerId, `${senderName} upvoted your review%`]
                        );

                        if (exists.rows.length === 0) {
                            const link = `/game?id=${gameId}#review-${reviewId}`;
                            await sendNotification(ownerId, 'upvote', `${senderName} upvoted your review`, link);
                        }
                    }
                }
            }
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Review vote error', error);
        return res.status(500).json({ error: 'Failed to vote on review.' });
    }
});

// This gets all of the reviews with nested replies (Important as reviews with nested replies have a different deletion method than those without replies)
router.get('/:gameId', async (req, res) => {
    const gameId = parseInt(req.params.gameId, 10);

    if (!gameId || Number.isNaN(gameId)) {
        return res.status(400).json({ error: 'Invalid game id.' });
    }

    try {
        const tree = await getReviewsTree(gameId);
        return res.status(200).json(tree);
    } catch (error) {
        console.error('Review fetch error', error);
        return res.status(500).json({ error: 'Failed to load reviews.' });
    }
});

// Checks if a user has an active review (one that is not deleted)
router.get('/:gameId/user', authorize, async (req, res) => {
    const gameId = parseInt(req.params.gameId, 10);
    const userId = req.user.id;

    if (!gameId || Number.isNaN(gameId)) {
        return res.status(400).json({ error: 'Invalid game id.' });
    }

    try {
        const result = await pool.query(
            `SELECT id, created_at, updated_at
             FROM reviews
             WHERE user_id = $1 AND game_id = $2 AND deleted_at IS NULL`,
            [userId, gameId],
        );

        res.json(result.rows[0] || null);
    } catch (error) {
        console.error('User review fetch error', error);
        res.status(500).json({ error: 'Failed to load your review.' });
    }
});

export default router;
