import { Router } from 'express';
import { pool, getUserId } from '../utils/dbUtils.js';
import argon2 from 'argon2'; // or bcrypt, whatever
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

let router = Router();
router.use(cookieParser());

let cookieOptions = {
    httpOnly: true, // client-side JS can't access this cookie; important to mitigate cross-site scripting attack damage
    secure: true, // cookie will only be sent over HTTPS connections (and localhost); important so that traffic sniffers can't see it even if our user tried to use an HTTP version of our site, if we supported that
    sameSite: 'strict', // browser will only include this cookie on requests to this domain, not other domains; important to prevent cross-site request forgery attacks
};

function makeToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function validateLogin(body) {
    if (!body) {
        return false;
    }

    let { username, password } = body;

    if (
        !username ||
        !password ||
        typeof username !== 'string' ||
        typeof password !== 'string'
    ) {
        return false;
    }

    return true;
}

async function validateRequirements(body) {
    let { username, password } = body;

    // TODO: decide actual length restrictions
    if (username < 4 || username.length > 20 || password.length < 8) {
        return false;
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username],
        );

        return result.rows.length == 0;
    } catch (error) {
        console.log('VALIDATE REQUIREMENTS FAILED', error);
        throw error;
    }
}

async function isTokenActive(token) {
    try {
        const result = await pool.query(
            'SELECT id FROM auth_tokens WHERE token = $1 AND revoked = false AND expires_at > NOW()',
            [token],
        );

        return result.rows.length !== 0;
    } catch (error) {
        console.log('GET TOKEN FAILED', error);
        throw error;
    }
}

async function revokeToken(token) {
    try {
        await pool.query(
            'UPDATE auth_tokens SET revoked = true WHERE token = $1',
            [token],
        );
    } catch (error) {
        console.log('REVOKE TOKEN FAILED', error);
        throw error;
    }
}

async function createAuthToken(username) {
    // generate login token, save in cookie
    let token = makeToken();
    // TODO: get rid of all these console logs when we are confident it works as expected
    console.log('Generated token', token);
    let userId = await getUserId(username);

    try {
        await pool.query(
            'INSERT INTO auth_tokens (user_id, token) VALUES ($1, $2)',
            [userId, token],
        );
    } catch (error) {
        console.log('INSERT FAILED', error);
        return null;
    }

    return token; // TODO
}

router.post('/create', async (req, res) => {
    let { body } = req;

    if (!(await validateLogin(body))) {
        return res.sendStatus(400); // TODO
    }

    let { username, password } = body;
    console.log(username, password);

    if (!(await validateRequirements(body))) {
        return res.sendStatus(400);
    }

    let hash;
    try {
        hash = await argon2.hash(password);
    } catch (error) {
        console.log('HASH FAILED', error);
        return res.sendStatus(500); // TODO
    }

    console.log(hash); // TODO just for debugging
    try {
        await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2)',
            [username, hash],
        );
    } catch (error) {
        console.log('INSERT FAILED', error);
        return res.sendStatus(500); // TODO
    }

    // TODO automatically log people in when they create account, because why not?
    let token = await createAuthToken(username);

    if (token) {
        return res.status(200).cookie('token', token, cookieOptions).send(); // TODO
    } else {
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/login', async (req, res) => {
    console.log('Login route called with body:', req.body);
    let { body } = req;
    // TODO validate body is correct shape and type
    if (!validateLogin(body)) {
        return res.status(400).json({ error: 'Invalid body.' }); // TODO
    }
    let { username, password } = body;

    let result;
    try {
        result = await pool.query(
            'SELECT password FROM users WHERE username = $1',
            [username],
        );
    } catch (error) {
        console.log('SELECT FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' }); // TODO
    }

    // username doesn't exist
    if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid username or password.' }); // TODO
    }
    let hash = result.rows[0].password;
    console.log(username, password, hash); // TODO REMOVE ALL CONSOLE LOGS WHEN DONE

    let verifyResult;
    try {
        verifyResult = await argon2.verify(hash, password);
    } catch (error) {
        console.log('VERIFY FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' }); // TODO
    }

    // password didn't match
    console.log(verifyResult);
    if (!verifyResult) {
        console.log("Credentials didn't match");
        return res.status(400).json({ error: 'Invalid username or password.' }); // TODO
    }

    let token = await createAuthToken(username);

    if (token) {
        return res.status(200).cookie('token', token, cookieOptions).send(); // TODO
    } else {
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

let authorize = (req, res, next) => {
    let { token } = req.cookies;
    console.log(token);
    if (token === undefined || !isTokenActive(token)) {
        return res.sendStatus(403); // TODO
    }
    next();
};

router.post('/logout', (req, res) => {
    console.log('Called logout with body', req.cookies);
    let { token } = req.cookies;

    if (token === undefined) {
        console.log('Already logged out');
        return res.sendStatus(400); // TODO
    }

    if (!isTokenActive(token)) {
        console.log("Token doesn't exist");
        return res.sendStatus(400); // TODO
    }

    revokeToken(token);
    console.log('Token revoked');

    return res.status(200).clearCookie('token', cookieOptions).send();
});

router.get('/status', (req, res) => {
    let { token } = req.cookies;
    if (token === undefined || !isTokenActive(token)) {
        return res.status(200).json({ loggedIn: false });
    }
    return res.status(200).json({ loggedIn: true });
});

export default router;
