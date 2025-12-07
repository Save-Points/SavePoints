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
