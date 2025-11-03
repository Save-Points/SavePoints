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

export async function getUserId(username) {
    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username],
        );

        if (result.rows.length == 0) {
            return null;
        }

        return result.rows[0].id;
    } catch (error) {
        console.log('GET USER ID FAILED', error);
        throw error;
    }
}
