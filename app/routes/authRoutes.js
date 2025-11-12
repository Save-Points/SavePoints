import { Router } from 'express';
import { pool } from '../utils/dbUtils.js';
import argon2 from 'argon2'; // or bcrypt, whatever
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { authorize } from '../middleware/authorize.js';

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

    const { username, password } = body;

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

async function validateSignup(body) {
    if (!body) {
        return false;
    }

    const { email, username, password, birthday, birthmonth, birthyear } = body;

    const dayInt = parseInt(birthday, 10);
    const monthInt = parseInt(birthmonth, 10);
    const yearInt = parseInt(birthyear, 10);

    // validating strings
    if (
        !username ||
        !password ||
        !email ||
        typeof username !== 'string' ||
        typeof password !== 'string' ||
        typeof email !== 'string'
    ) {
        return false;
    }

    // validating birthday
    if (isNaN(dayInt) || isNaN(monthInt) || isNaN(yearInt)) {
        return false;
    }

    return true;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidUsername(username) {
    const re = /^[a-zA-Z0-9._-]{4,20}$/;
    return re.test(username);
}

async function validateRequirements(body) {
    const { email, username, password, birthday, birthmonth, birthyear } = body;
    const errors = { fields: {} };

    if (!isValidEmail(email)) {
        errors.fields.email = 'Invalid email format.';
    }

    if (!isValidUsername(username)) {
        errors.fields.username =
            'Username must be 4-20 characters. Allowed characters are letters, numbers, dots, underscores, and hyphens.';
    }

    if (password.length < 8) {
        errors.fields.password = 'Password must be at least 8 characters.';
    }

    const dayInt = parseInt(birthday, 10);
    const monthInt = parseInt(birthmonth, 10);
    const yearInt = parseInt(birthyear, 10);

    const date = new Date(yearInt, monthInt - 1, dayInt);

    if (
        date.getFullYear() !== yearInt ||
        date.getMonth() !== monthInt - 1 ||
        date.getDate() !== dayInt
    ) {
        errors.fields.birthdate = 'Invalid date of birth.';
    } else {
        const today = new Date();
        const thirteenYearsAgo = new Date(
            today.getFullYear() - 13,
            today.getMonth(),
            today.getDate(),
        );

        if (date > thirteenYearsAgo) {
            errors.fields.birthdate =
                'You must be at least 13 years old to create an account.';
        }
    }

    const result = await pool.query(
        'SELECT email, username FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
        [username, email],
    );

    for (let row of result.rows) {
        if (row.username.toLowerCase() === username.toLowerCase()) {
            errors.fields.username = 'Username already exists.';
        }

        if (row.email.toLowerCase() === email.toLowerCase()) {
            errors.fields.email = 'Email already linked to another account.';
        }
    }

    return errors;
}

async function getUserIdByToken(token) {
    try {
        const result = await pool.query(
            `SELECT u.id
             FROM auth_tokens a
             JOIN users u ON u.id = a.user_id
             WHERE a.token = $1 AND a.revoked = false AND a.expires_at > NOW()`,
            [token],
        );

        if (result.rows.length == 0) {
            return null;
        }

        return result.rows[0].id;
    } catch (error) {
        console.log('GET USER BY TOKEN FAILED', error);
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

async function createAuthToken(userId) {
    // generate login token, save in cookie
    const token = makeToken();

    try {
        await pool.query(
            'INSERT INTO auth_tokens (user_id, token) VALUES ($1, $2)',
            [userId, token],
        );
    } catch (error) {
        console.log('INSERT FAILED', error);
        return null;
    }

    return token;
}

router.post('/create', async (req, res) => {
    const { body } = req;

    if (!(await validateSignup(body))) {
        return res.status(400).json({ error: 'Invalid input body.' });
    }

    try {
        const errors = await validateRequirements(body);

        if (Object.keys(errors.fields).length > 0) {
            return res
                .status(400)
                .json({ error: 'Invalid input.', fields: errors.fields });
        }
    } catch (error) {
        console.log('VALIDATE FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }

    const { email, username, password, birthday, birthmonth, birthyear } = body;

    let hash;
    try {
        hash = await argon2.hash(password);
    } catch (error) {
        console.log('HASH FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }

    const pgDay = birthday.padStart(2, '0');
    const pgMonth = birthmonth.padStart(2, '0');
    const pgBirthdate = `${birthyear}-${pgMonth}-${pgDay}`;

    let result;
    try {
        result = await pool.query(
            'INSERT INTO users (username, password, email, birthdate) VALUES ($1, $2, $3, $4) RETURNING id',
            [username, hash, email, pgBirthdate],
        );
    } catch (error) {
        console.log('INSERT FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }

    const token = await createAuthToken(result.rows[0].id);

    if (token) {
        return res.status(201).cookie('token', token, cookieOptions).send();
    } else {
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/login', async (req, res) => {
    const { body } = req;

    if (!validateLogin(body)) {
        return res.status(400).json({ error: 'Invalid input body.' });
    }
    const { username, password } = body;

    let result;
    try {
        result = await pool.query(
            'SELECT id, password FROM users WHERE username = $1',
            [username],
        );
    } catch (error) {
        console.log('SELECT FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }

    // username doesn't exist
    if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const hash = result.rows[0].password;

    let verifyResult;
    try {
        verifyResult = await argon2.verify(hash, password);
    } catch (error) {
        console.log('VERIFY FAILED', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }

    // password didn't match
    if (!verifyResult) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = await createAuthToken(result.rows[0].id);

    if (token) {
        return res.status(200).cookie('token', token, cookieOptions).send();
    } else {
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/logout', authorize, async (req, res) => {
    const { token } = req.cookies;

    try {
        await revokeToken(token);
    } catch {
        return res.status(500).json({ error: 'Internal server error.' });
    }

    return res.status(200).clearCookie('token', cookieOptions).send();
});

export default router;
