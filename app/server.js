require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const app = express();
const hostname = 'localhost';
const port = 3000;

let axios = require('axios');

app.use(express.json());
app.use(express.static(__dirname + '/public'));

let CLIENT_ID = process.env.TWITCH_CLIENT_ID;
let CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
let accessToken = null;

async function getTwitchToken() {
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
        console.log('Successfully fetched new access token');
    } catch (err) {
        console.error('Error fetching access token');
    }
}

pool.connect().then(() =>
    console.log(`Connected to database: ${process.env.DB_DATABASE}`),
);

app.get('/games', (req, res) => {
    res.json({
        games: [
            {
                id: 1,
                name: 'Elden Ring',
                coverUrl:
                    'https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg',
            },
            {
                id: 2,
                name: "Baldur's Gate 3",
                coverUrl:
                    'https://upload.wikimedia.org/wikipedia/en/1/12/Baldur%27s_Gate_3_cover_art.jpg',
            },
            {
                id: 3,
                name: 'Hades II',
                coverUrl:
                    'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcRiUHktACgYRU8V6pDkpdQ5HF1gHrVogvP1VTO6ansDC0jub2p3',
            },
            {
                id: 4,
                name: 'The Legend of Zelda: Tears of the Kingdom',
                coverUrl:
                    'https://upload.wikimedia.org/wikipedia/en/f/fb/The_Legend_of_Zelda_Tears_of_the_Kingdom_cover.jpg',
            },
            {
                id: 5,
                name: 'Cyberpunk 2077',
                coverUrl:
                    'https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077_box_art.jpg',
            },
            {
                id: 6,
                name: 'Stardew Valley',
                coverUrl:
                    'https://upload.wikimedia.org/wikipedia/en/f/fd/Logo_of_Stardew_Valley.png',
            },
        ],
    });
});

app.post('/api/search', async (req, res) => {
    let searchTerm = req.body.searchTerm;
    if (!searchTerm) {
        return res.status(400).json({ error: 'Search term is required' });
    }
    if (!accessToken) {
        await getTwitchToken();
    }
    try {
        let apiResponse = await axios.post(
            'https://api.igdb.com/v4/games',
            `fields name, cover.url; search "${searchTerm}"; limit 10;`,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            },
        );
        res.json(apiResponse.data);
    } catch (error) {
        if (error.response && error.response.status == 401) {
            console.log('Access token expired, fetching a new one..');
            await getTwitchToken();

            return res.status(503).json({ error: 'Please try again' });
        } else {
            console.log('Error querying IGDB:', error.message);
            res.status(500).json({ error: 'Error querying IGDB' });
        }
    }
});

app.listen(port, hostname, () => {
    console.log(`Listening at http://${hostname}:${port}`);
    getTwitchToken();
});
