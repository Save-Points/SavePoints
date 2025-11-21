import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

let CLIENT_ID = process.env.TWITCH_CLIENT_ID;
let CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let accessToken = null;
let expireTime = null;

export async function getTwitchToken() {
    if (accessToken && expireTime && Date.now() < expireTime) {
        return accessToken;
    } else {
        try {
            let response = await axios.post(
                'https://id.twitch.tv/oauth2/token',
                null,
                {
                    params: {
                        client_id: CLIENT_ID,
                        client_secret: CLIENT_SECRET,
                        grant_type: 'client_credentials',
                    },
                },
            );
            accessToken = response.data.access_token;
            expireTime = Date.now() + response.data.expires_in * 1000;
            console.log('Successfully fetched new access token');
            return accessToken;
        } catch (err) {
            console.error('Error fetching access token');
        }
    }
}

export const injectToken = async (req, res, next) => {
    try {
        req.accessToken = await getTwitchToken();
        next();
    } catch (error) {
        console.log('GET TWITCH TOKEN FAILED', error);
        return res.status(500).json({ error: "Internal server error." })
    }
}
