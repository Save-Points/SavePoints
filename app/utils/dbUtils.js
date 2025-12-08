import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect().then(() =>
    console.log(`Connected to database: ${process.env.DB_DATABASE}`),
);

export async function sendNotification(targetId, type, message, link) {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, type, message, link) 
             VALUES ($1, $2, $3, $4)`,
            [targetId, type, message, link]
        )
    } catch (error) {
        console.error('SEND NOTIFICATION FAILED', error);
        throw error;
    }
}

export async function attachStatistics(games) {
    const gameIds = games.map(game => game.id);

    if (!gameIds) {
        return;
    }

    try {
        const result = await pool.query(
            `SELECT 
                game_id, 
                AVG(rating) AS avg_rating, 
                COUNT(*) FILTER (WHERE favorited) AS favorites_count,
                COUNT(*) FILTER (WHERE status='playing') AS playing_count,
                COUNT(*) FILTER (WHERE status='completed') AS completed_count,
                COUNT(*) FILTER (WHERE status='planned') AS planned_count,
                COUNT(*) FILTER (WHERE status='wishlisted') AS wishlisted_count,
                COUNT(*) FILTER (WHERE status='dropped') AS dropped_count,
                COUNT(*) FILTER (WHERE status='on_hold') AS on_hold_count,
                COUNT(*) AS entries,
                SUM(hours_played) AS total_hours_played,
                AVG(NULLIF(hours_played,0)) FILTER (WHERE status NOT IN ('planned', 'wishlisted')) AS avg_hours_played
             FROM user_games 
             WHERE game_id = ANY($1)
             GROUP BY game_id
            `,
            [gameIds]
        );

        const statsMap = Object.fromEntries(
            result.rows.map(row => [row.game_id, row])
        );

        for (const game of games) {
            const stats = statsMap[game.id];
            game.average_rating = stats ? parseFloat(parseFloat(stats.avg_rating).toFixed(2)) : null;
            game.favorites_count = stats ? parseInt(stats.favorites_count, 10) : 0;
            game.playing_count = stats ? parseInt(stats.playing_count, 10) : 0;
            game.completed_count = stats ? parseInt(stats.completed_count, 10) : 0;
            game.planned_count = stats ? parseInt(stats.planned_count, 10) : 0;
            game.wishlisted_count = stats ? parseInt(stats.wishlisted_count, 10) : 0;
            game.dropped_count = stats ? parseInt(stats.dropped_count, 10) : 0;
            game.on_hold_count = stats ? parseInt(stats.on_hold_count, 10) : 0;
            game.entries = stats ? parseInt(stats.entries, 10) : 0;
            game.avg_hours_played = stats && stats.avg_hours_played ? parseFloat(parseFloat(stats.avg_hours_played).toFixed(2)) : null;
            game.total_hours_played = stats ? parseInt(stats.total_hours_played, 10) : 0;
        }
    } catch (error) {
        console.log('ATTACH STATISTICS FAILED', error);
        throw error;
    }
}
