CREATE DATABASE savepoints;
\c savepoints;

CREATE TYPE privacy_type AS ENUM('public', 'private', 'friends_only');

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	username VARCHAR(20) UNIQUE NOT NULL,
	password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    birthdate DATE DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    privacy privacy_type DEFAULT 'public',
    profile_pic_url TEXT DEFAULT NULL,
    verified BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false
);

CREATE UNIQUE INDEX idx_users_username_lower ON users (LOWER(username));
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    token CHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    revoked BOOLEAN DEFAULT false
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    game_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 10),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);

CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
