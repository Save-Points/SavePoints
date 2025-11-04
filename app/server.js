import express from 'express';
import authRoutes from './routes/authRoutes.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const hostname = 'localhost';
const port = 3000;

app.use(express.json());
app.use(express.static('app/public'));

app.use('/auth', authRoutes);

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

let genreToID = null;

function ensureGenreCache() {
    if (genreToID) return Promise.resolve(genreToID);

    let tokenPromise;
    if (accessToken) {
        tokenPromise = Promise.resolve();
    } else {
        tokenPromise = getTwitchToken();
    }
    return tokenPromise
        .then(() => {
            return axios.post(
                'https://api.igdb.com/v4/genres',
                'fields id, name; limit 500; sort name asc;',
                {
                    headers: {
                        'Client-ID': CLIENT_ID,
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json',
                    },
                },
            );
        })
        .then((resp) => {
            genreToID = {};
            resp.data.forEach((g) => {
                if (g.name) {
                    genreToID[g.name.toLowerCase()] = g.id;
                }
            });
            return genreToID;
        })
        .catch((error) => {
            console.error('Error fetching genres for cache:', error.message);
            throw error;
        });
}

app.get('/games', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;
    const genre = req.query.genre;

    if (!accessToken) await getTwitchToken();

    try {
        let whereClause = 'where cover != null;';
        if (genre && genre !== 'all') {
            try {
                const map = await ensureGenreCache();
                const gid = map[genre.toLowerCase()];
                if (gid) {
                    whereClause = `where genres = (${gid}) & cover != null;`;
                } else {
                    return res.json({ games: [] });
                }
            } catch (e) {
                return res.status(500).json({ error: 'Error resolving genre' });
            }
        }

        const query = `fields id, name, cover.url;
                   ${whereClause}
                   sort popularity desc;
                   limit ${limit};
                   offset ${offset};`;

        const apiResponse = await axios.post(
            'https://api.igdb.com/v4/games',
            query,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            },
        );

        const formattedGames = (apiResponse.data || []).map((g) => ({
            id: g.id,
            name: g.name,
            coverUrl: g.cover
                ? g.cover.url.replace('t_thumb', 't_cover_big')
                : 'https://placehold.co/150x200?text=No+Image',
        }));

        res.json({ games: formattedGames });
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('Access token expired, fetching new one...');
            await getTwitchToken();
            return res.status(503).json({ error: 'Please try again' });
        }
        console.error('Error fetching games:', error.message);
        res.status(500).json({ error: 'Error fetching games' });
    }
});

app.get('/genres', async (req, res) => {
    if (!accessToken) await getTwitchToken();
    try {
        const response = await axios.post(
            'https://api.igdb.com/v4/genres',
            'fields id, name; sort name asc;',
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            },
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching genres:', error.message);
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

app.get('/newreleases', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;
    if (!accessToken) await getTwitchToken();

    const now = Math.floor(Date.now() / 1000);
    const oneMonthAgo = now - 30 * 24 * 60 * 60;

    try {
        const query = `fields id, name, cover.url, first_release_date;
                       where first_release_date != null
                       & first_release_date > ${oneMonthAgo}
                       & first_release_date <= ${now}
                       & cover != null;
                       sort first_release_date desc;
                       limit ${limit};
                       offset ${offset};`;

        const response = await axios.post(
            'https://api.igdb.com/v4/games',
            query,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            },
        );

        const formatted = (response.data || []).map((g) => ({
            id: g.id,
            name: g.name,
            coverUrl: g.cover
                ? g.cover.url.replace('t_thumb', 't_cover_big')
                : 'https://placehold.co/150x200?text=No+Image',
        }));
        res.json({ games: formatted });
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('Access token expired, fetching new one...');
            await getTwitchToken();
            return res.status(503).json({ error: 'Please try again' });
        }
        console.error('Error fetching new releases:', error.message);
        res.status(500).json({ error: 'Error fetching new releases' });
    }
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
            `fields id, name, cover.url; search "${searchTerm}"; limit 10;`,
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
            console.log('Access token expired, fetching a new one...');
            await getTwitchToken();

            return res.status(503).json({ error: 'Please try again' });
        } else {
            console.log('Error querying IGDB:', error.message);
            res.status(500).json({ error: 'Error querying IGDB' });
        }
    }
});

app.get('/api/game/:id', async (req, res) => {
    let gameId = req.params.id;

    if (!accessToken) {
        await getTwitchToken();
    }

    try {
        let apiResponse = await axios.post(
            'https://api.igdb.com/v4/games',
            `fields name, summary, cover.url, aggregated_rating, first_release_date, platforms.name, genres.name;
            where id = ${gameId};`,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            },
        );
        res.json(apiResponse.data[0]);
    } catch (error) {
        if (error.response && error.response.status == 401) {
            console.log('Access token expired, fetching a new one...');
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
