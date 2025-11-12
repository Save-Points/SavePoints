import cron from 'node-cron';
import { pool } from '../utils/dbUtils.js';

async function purgeTokens() {
    try {
        const result = await pool.query(
            'DELETE FROM auth_tokens WHERE revoked = true OR expires_at <= NOW() RETURNING id',
        );

        console.log(
            `Purged ${result.rowCount} expired/revoked tokens from auth_tokens table`,
        );
    } catch (error) {
        console.log('PURGE TOKENS FAILED', error);
    }
}

cron.schedule('0 5 * * *', () => {
    console.log('Purging tokens...');
    purgeTokens();
});
