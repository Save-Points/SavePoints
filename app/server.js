import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reviewsRoutes from './routes/reviewsRoutes.js';
import replyRoutes from './routes/replyRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import userGameRoutes from './routes/userGameRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTwitchToken } from './middleware/token.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const hostname = 'localhost';
const port = 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/usergames', userGameRoutes);
app.use('/api', apiRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/replies', replyRoutes);
app.use('/friends', friendRoutes);

app.get('/gamelist/:username', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gameList.html'));
});

app.get('/profile/:username', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/game', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.listen(port, hostname, () => {
    console.log(`Listening at http://${hostname}:${port}`);
    (async () => {
        await getTwitchToken();
    })();
});
