import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
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
router.put('/review/:reviewId', authorize, async (req, res) => {
    const userId = req.user.id;
    const reviewId = parseInt(req.params.reviewId, 10);
    const { review_text } = req.body;

    try {
        const existing = await pool.query(
            'SELECT user_id FROM reviews WHERE id = $1 AND deleted_at IS NULL',
            [reviewId],
        );
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
router.delete('/review/:reviewId', authorize, async (req, res) => {
    const userId = req.user.id;
    const reviewId = parseInt(req.params.reviewId, 10);

    try {
        const existing = await pool.query('SELECT user_id FROM reviews WHERE id = $1 AND deleted_at IS NULL', [reviewId],);
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
router.post('/review/:reviewId/reply', authorize, async (req, res) => {
    const userId = req.user.id;
    const reviewId = parseInt(req.params.reviewId, 10);
    const { reply_text, parent_reply_id } = req.body;

    try {
        const reviewRow = await pool.query(
            'SELECT game_id FROM reviews WHERE id = $1',
            [reviewId],
        );

        const gameId = reviewRow.rows[0].game_id;

        let parentId = null;
        if (parent_reply_id) {
            parentId = parent_reply_id;
        }

        await pool.query(
            `
            INSERT INTO review_replies (review_id, parent_id, user_id, game_id, reply_text)
            VALUES ($1, $2, $3, $4, $5);
            `,
            [reviewId, parentId, userId, gameId, reply_text || ''],
        );

        return res.status(201).json({ success: true });
    } catch (error) {
        console.error('Reply insert error', error);
        return res.status(500).json({ error: 'Failed to post reply.' });
    }
});

// Similar to review deletion but for a reply, with some changed logic as a reply card can never be deleted no matter what
router.delete('/reply/:replyId', authorize, async (req, res) => {
    const userId = req.user.id;
    const replyId = parseInt(req.params.replyId, 10);

    try {
        const existing = await pool.query(
            'SELECT user_id FROM review_replies WHERE id = $1 AND deleted_at IS NULL',
            [replyId],
        );

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
router.put('/reply/:replyId', authorize, async (req, res) => {
    const userId = req.user.id;
    const replyId = parseInt(req.params.replyId, 10);
    const { reply_text } = req.body;

    try {
        const existing = await pool.query(
            'SELECT user_id FROM review_replies WHERE id = $1 AND deleted_at IS NULL',
            [replyId],
        );

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

// Review voting
router.post('/review/:reviewId/vote', authorize, async (req, res) => {
    const userId = req.user.id;
    const reviewId = parseInt(req.params.reviewId, 10);
    const { vote } = req.body;

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
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Review vote error', error);
        return res.status(500).json({ error: 'Failed to vote on review.' });
    }
});

// Reply voting
router.post('/reply/:replyId/vote', authorize, async (req, res) => {
    const userId = req.user.id;
    const replyId = parseInt(req.params.replyId, 10);
    const { vote } = req.body;

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
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Reply vote error', error);
        return res.status(500).json({ error: 'Failed to vote on reply.' });
    }
});

// This gets all of the reviews with nested replies (Important as reviews with nested replies have a different deletion method than those without replies)
router.get('/:gameId', async (req, res) => {
    const gameId = parseInt(req.params.gameId, 10);

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
