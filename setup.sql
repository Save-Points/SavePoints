CREATE DATABASE savepoints;
\c savepoints;

CREATE TYPE privacy_type AS ENUM('public', 'private', 'friends_only');

CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	username VARCHAR(20) UNIQUE NOT NULL,
	password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE, -- need to set to NOT NULL in future
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- need to change this to auto update
    birthday DATE DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    privacy privacy_type DEFAULT 'public',
    profile_pic_url TEXT DEFAULT NULL,
    is_admin BOOLEAN DEFAULT false
);

CREATE TABLE auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    token CHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    revoked BOOLEAN DEFAULT false
);
