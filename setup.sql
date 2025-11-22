CREATE DATABASE savepoints;
\c savepoints;

CREATE TYPE privacy_type AS ENUM('public', 'private', 'friends_only');
CREATE TYPE friend_status AS ENUM ('pending', 'accepted');
CREATE TYPE user_game_status AS ENUM('completed', 'playing', 'planned', 'wishlisted', 'dropped', 'on_hold');

CREATE TYPE vote_type AS ENUM('upvote', 'downvote');

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
    token CHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    revoked BOOLEAN DEFAULT false
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    game_id INT NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL,
    UNIQUE(user_id, game_id, deleted_at)
);

CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE review_replies (
    id SERIAL PRIMARY KEY,
    review_id INT REFERENCES reviews(id) ON DELETE CASCADE,
    parent_id INT REFERENCES review_replies(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    game_id INT NOT NULL,
    reply_text TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE TRIGGER update_review_replies_updated_at
BEFORE UPDATE ON review_replies
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE review_votes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    review_id INT REFERENCES reviews(id) ON DELETE CASCADE,
    vote vote_type NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, review_id)
);

CREATE TABLE reply_votes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    reply_id INT REFERENCES review_replies(id) ON DELETE CASCADE,
    vote vote_type NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, reply_id)
);

CREATE TABLE custom_games (
    id SERIAL PRIMARY KEY -- todo: rest of this table, currently here so user_games can reference
);

CREATE TABLE user_games (
    user_id INT REFERENCES users(id) NOT NULL,
    game_id INT NOT NULL,
    -- custom_game_id INT REFERENCES custom_games(id) DEFAULT NULL,
    rating NUMERIC(4, 2) CHECK (rating >= 0 AND rating <= 10) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    status user_game_status DEFAULT 'planned',
    favorited BOOLEAN DEFAULT FALSE,
    hours_played INT DEFAULT 0,
    PRIMARY KEY (user_id, game_id)
);

CREATE TRIGGER set_user_games_updated_at BEFORE UPDATE ON user_games FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE friends (
    id SERIAL PRIMARY KEY,
    requester_id INT REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
    status friend_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id),
    CHECK (requester_id != receiver_id)
);

-- TODO: Notifications for friends (was thinking add a table so we can do messages, etc)? 
