import { Router } from 'express';
import { injectToken, getTwitchToken } from '../middleware/token.js';
import { attachStatistics, pool } from '../utils/dbUtils.js';
import dotenv from 'dotenv';
import axios from 'axios';

let router = Router();
dotenv.config();

let CLIENT_ID = process.env.TWITCH_CLIENT_ID;

let genreToID = null;

async function ensureGenreCache() {
    if (genreToID) return Promise.resolve(genreToID);

    const accessToken = await getTwitchToken();

    try {
        const headers = {
            'Client-ID': CLIENT_ID,
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        };

        const [genresRes, themesRes, gameRes] = await Promise.all([
            axios.post(
                'https://api.igdb.com/v4/genres',
                'fields id, name; limit 500; sort name asc;',
                { headers }),
            axios.post(
                'https://api.igdb.com/v4/themes',
                'fields id, name; limit 500; sort name asc;',
                { headers }),
            axios.post(
                'https://api.igdb.com/v4/game_modes',
                'fields id, name; limit 500; sort name asc;',
                { headers }),
        ]);

        const combined = [
            ...genresRes.data,
            ...themesRes.data,
            ...gameRes.data,
        ];

        genreToID = {};
        combined.forEach((g) => {
            if (g.name) genreToID[g.name.toLowerCase()] = g.id;
        });
        return genreToID;
    } catch (error) {
        console.error(
            'Error fetching genres/themes/game_modes for cache:',
            error.message);
        res.status(500).json({ error: 'Error fetching genres' });
    }
}

router.post('/search', injectToken, async (req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    let searchTerm = req.body.searchTerm; 
    let offset = parseInt(req.body.offset) || 0;

    if (!searchTerm) {
        return res.status(400).json({ error: 'Search term is required' });
    }
    const accessToken = req.accessToken;

    const filters = `where game_type = (0,4,8,9,10)
        & cover != null & cover.url != null
        & version_parent = null
        & total_rating_count > 0
        & first_release_date != null;`;

    try {
        const apiResponse = await axios.post(
            'https://api.igdb.com/v4/games',
            `fields 
                id, 
                name, 
                game_type, 
                version_parent, 
                cover.url, 
                first_release_date, 
                involved_companies.company.name, 
                involved_companies.developer, 
                involved_companies.publisher;
            search "${searchTerm}";
            ${filters}
            limit 20;
            offset ${offset};`,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            },
        );

        const countResponse = await axios.post(
            'https://api.igdb.com/v4/games/count',
            `search "${searchTerm}";
            ${filters}`,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            },
        );

        const games = apiResponse.data.map(game => {
            game.cover.url = game.cover.url.replace('t_thumb', 't_cover_big');
            return game;
        });

        res.status(200).json({
            games,
            count: countResponse.data.count,
        });
    } catch (error) {
        console.log('Error querying IGDB:', error.message);
        res.status(500).json({ error: 'Error querying IGDB' });
    }
});

router.get('/game/:id', injectToken, async (req, res) => {
    const gameId = req.params.id;

    const accessToken = req.accessToken;

    try {
        let apiResponse = await axios.post(
            'https://api.igdb.com/v4/games',
            `fields 
                name, 
                summary, 
                cover.url, 
                aggregated_rating, 
                first_release_date,
                screenshots.url,
                videos.video_id,
                artworks.url, 
                platforms.name, 
                genres.name, 
                themes.name,
                game_modes.name,
                involved_companies.company.name, 
                involved_companies.developer, 
                involved_companies.publisher;
            where id = ${gameId};`,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            },
        );
        const game = apiResponse.data[0];
        game.cover.url = game.cover.url.replace('t_thumb', 't_cover_big');
        await attachStatistics([game]);

        res.status(200).json(game);
    } catch (error) {
        console.log('Error querying IGDB:', error.message);
        res.status(500).json({ error: 'Error querying IGDB' });
    }
});

router.get('/genres', injectToken, async (req, res) => {
    res.set('Cache-Control', 'public, max-age=86400');
    const accessToken = req.accessToken;
    try {
        const headers = {
            'Client-ID': CLIENT_ID,
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        };

        const [genreRes, themeRes, gameRes] = await Promise.all([
            axios.post(
                'https://api.igdb.com/v4/genres',
                'fields id, name; sort name asc; limit 500;',
                { headers },
            ),
            axios.post(
                'https://api.igdb.com/v4/themes',
                'fields id, name; sort name asc; limit 500;',
                { headers },
            ),
            axios.post(
                'https://api.igdb.com/v4/game_modes',
                'fields id, name; sort name asc; limit 500;',
                { headers },
            ), // Note: You might want to filter keywords as there are thousands.
        ]);

        const combined = [...genreRes.data, ...themeRes.data, ...gameRes.data];

        const seen = new Set();
        const merged = combined.filter((g) => {
            if (!g.name) return false;
            const name = g.name.toLowerCase();
            if (seen.has(name)) return false;
            seen.add(name);
            return true;
        });

        res.status(200).json(merged);
    } catch (error) {
        console.error('Error fetching genres/themes:', error.message);
        res.status(500).json({ error: 'Failed to fetch genres/themes' });
    }
});

router.get('/games', injectToken, async (req, res) => {
    const limit = parseInt(req.query.limit) || 500;
    const offset = parseInt(req.query.offset) || 0;
    const genre = req.query.genre;
    const includeStats = req.query.includeStats === 'true';
    const includeCount = req.query.includeCount === 'true';
    const newReleases = req.query.newReleases === 'true';

    const accessToken = req.accessToken;

    const ids = req.query.ids;

    try {
        let filters = [
            'cover != null',
            'game_type = (0,4,8,9,10)',
            'version_parent = null',
            'first_release_date != null',
        ];

        if (ids && ids.length > 0) {
            filters.push(`id = (${ids})`)
        }

        if (newReleases) {
            const now = Math.floor(Date.now() / 1000);
            const oneMonthAgo = now - 30 * 24 * 60 * 60;
            const newReleaseFilters = [
                `first_release_date > ${oneMonthAgo}`,
                `first_release_date <= ${now}`
            ]
            filters.push(...newReleaseFilters);
        }

        if (genre && genre !== 'all') {
            const map = await ensureGenreCache();
            const gid = map[genre.toLowerCase()];
            if (gid) {
                // Genres, themes, and game_modes are considered separate, so to get more options for the user, we need to fetch all three
                filters.push(
                    `(genres = (${gid}) | themes = (${gid}) | game_modes = (${gid}))`,
                );
            } else {
                return res.json({ games: [] });
            }
        }

        const whereClause = `where ${filters.join(' & ')}`;

        const query = `
            fields 
                id, 
                name, 
                cover.url, 
                game_type, 
                version_parent, 
                first_release_date, 
                total_rating_count, 
                involved_companies.company.name, 
                involved_companies.developer, 
                involved_companies.publisher;
            ${whereClause};
            sort total_rating_count desc;
            limit ${limit};
            offset ${offset};
        `;

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


        const games = apiResponse.data.map(game => {
            if (game.cover?.url) {
                game.cover.url = game.cover.url.replace('t_thumb', 't_cover_big');
            }
            return game;
        });

        if (includeStats) {
            await attachStatistics(games);
        }

        if (includeCount) {
            const countResponse = await axios.post(
                'https://api.igdb.com/v4/games/count',
                `${whereClause};`,
                {
                    headers: {
                        'Client-ID': CLIENT_ID,
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json',
                    },
                },
            );
            return res.status(200).json({ games: games, count: countResponse.data.count });
        } else {
            return res.status(200).json({ games: games });
        }
    } catch (error) {
        console.error('Error fetching games:', error.message);
        res.status(500).json({ error: 'Error fetching games' });
    }
});

router.get('/mostreviewed', injectToken, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const offset = parseInt(req.query.offset) || 0;
    const includeStats = req.query.includeStats === 'true';
    const accessToken = req.accessToken;

    try {
        const { rows } = await pool.query(
            `
            SELECT r.game_id, COUNT(*) AS review_count
            FROM reviews r
            WHERE r.deleted_at IS NULL
            GROUP BY r.game_id
            ORDER BY review_count DESC
            LIMIT $1 OFFSET $2;
            `,
            [limit, offset],
        );

        const reviewedCount = await pool.query(
            `SELECT COUNT(*) AS count
            FROM reviews
            WHERE deleted_at IS NULL
            GROUP BY game_id
            HAVING COUNT(*) >= 1`,
        );

        if (!rows.length) {
            return res.json({ games: [] });
        }

        const ids = rows.map((r) => r.game_id);

        const query = `
            fields 
                id, 
                name, 
                cover.url, 
                first_release_date, 
                total_rating_count, 
                involved_companies.company.name, 
                involved_companies.developer, 
                involved_companies.publisher;
            where id = (${ids.join(',')}) & cover != null;
            limit ${ids.length};
        `;

        const igdbRes = await axios.post(
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

        const igdbGames = igdbRes.data || [];

        igdbGames.sort(
            (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id),
        );

        const games = igdbGames.map(game => {
            if (game.cover?.url) {
                game.cover.url = game.cover.url.replace('t_thumb', 't_cover_big');
            }
            return game;
        });

        if (includeStats) {
            await attachStatistics(games);
        }

        return res.json({ games: games, count: reviewedCount });
    } catch (err) {
        console.error('Error in /api/mostreviewed:', err.message);
        return res
            .status(500)
            .json({ error: 'Failed to load most reviewed games' });
    }
});

router.get('/toprated', injectToken, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const offset = parseInt(req.query.offset) || 0;
    const includeStats = req.query.includeStats === 'true';
    const accessToken = req.accessToken;

    try {
        const { rows } = await pool.query(
            `
            SELECT game_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
            FROM user_games
            WHERE rating IS NOT NULL
            GROUP BY game_id
            HAVING COUNT(*) >= 1
            ORDER BY avg_rating DESC, rating_count DESC
            LIMIT $1 OFFSET $2;
            `,
            [limit, offset],
        );

        if (!rows.length) {
            return res.json({ games: [] });
        }

        const ids = rows.map((r) => r.game_id);

        const ratedCount = await pool.query(
            `SELECT COUNT(*) AS count
            FROM user_games
            WHERE rating IS NOT NULL
            GROUP BY game_id
            HAVING COUNT(*) >= 1`,
        );

        const query = `
            fields
                id, 
                name, 
                cover.url, 
                first_release_date, 
                total_rating_count, 
                involved_companies.company.name, 
                involved_companies.developer, 
                involved_companies.publisher;
            where id = (${ids.join(',')}) & cover != null;
            limit ${ids.length};
        `;

        const igdbRes = await axios.post(
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

        const igdbGames = igdbRes.data || [];

        igdbGames.sort(
            (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id),
        );

        const games = igdbGames.map(game => {
            if (game.cover?.url) {
                game.cover.url = game.cover.url.replace('t_thumb', 't_cover_big');
            }
            return game;
        });

        if (includeStats) {
            await attachStatistics(games);
        }

        return res.json({ games: games, count: ratedCount.rows[0].count });
    } catch (err) {
        console.error('Error in /api/toprated:', err.message);
        return res
            .status(500)
            .json({ error: 'Failed to load top rated games' });
    }
});

export default router;
