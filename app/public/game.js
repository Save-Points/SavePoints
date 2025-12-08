import { getFavoriteIds, toggleFavorite, handleStarFavorited } from "/utils/favorite.js";

const params = new URLSearchParams(window.location.search);
const gameId = params.get('id');
const activeTab = params.get('tab') || 'overview';

const gameInfoDiv = document.getElementById('gameInfo');

const gameHeader = document.getElementById('gameHeader');
const gameCover = document.getElementById('cover');

const addButton = document.getElementById('addToList');
const userGameInput = document.getElementById('userGameAdd');

const submitButton = document.getElementById('submit');
const entryStatus = document.getElementById('entryStatus');
const entryHoursPlayed = document.getElementById('entryHoursPlayed');
const entryRating = document.getElementById('entryRating');
const messageDiv = document.getElementById('message');
const submitReviewBtn = document.getElementById('submitReview');

const overviewTab = document.getElementById('overview');
const reviewsTab = document.getElementById('reviews');
const mediaTab = document.getElementById('media');
const contentDiv = document.getElementById('contentDiv');

const addReview = document.getElementById('addReview');
const reviewModal = document.getElementById('reviewModal');
const closeModal = document.getElementById('closeModal');

let gameInfo = {
    name: '',
    releaseDate: '',
    platforms: '',
    genres: '',
    developers: [],
    publishers: [],
    summary: '',
    reviews: [],
    averageRating: null,
    favoritesCount: null,
    playing: 0,
    completed: 0,
    planned: 0,
    wishlisted: 0,
    dropped: 0,
    onHold: 0,
    listEntries: null,
    averageHoursPlayed: null,
    hoursPlayed: null,
    screenshots: [],
    artworks: [],
    videos: [],
    themes: [],
    gameModes: []
}

let currentUser = null;

if (gameId) {
    fetch(`/api/game/${gameId}`)
        .then((response) => {
            if (response.status >= 400) {
                response.json().then((body) => {
                    gameInfoDiv.textContent = `Error: ${body.error}`;
                });
            } else {
                response.json().then((game) => {
                    document.title = game.name;
                    gameCover.src = game.cover.url;

                    gameCover.alt = `${game.name} cover`;
                });
            }
        })
        .catch((error) => {
            console.error('Error fetching game details:', error);
            gameInfoDiv.textContent = `Error: ${error.message}`;
        });
} else {
    gameInfoDiv.textContent = 'No game ID provided.';
}

async function loadGame() {
    const endpoint = `/api/game/${gameId}`;

    try {
        const response = await fetch(endpoint);
        const game = await response.json();

        document.title = game.name;

        const titleContainer = document.createElement('div');
        const title = document.createElement('span');
        title.textContent = game.name;
        titleContainer.appendChild(title);
        
        const favoriteIds = await getFavoriteIds();

        game.favorited = favoriteIds.includes(game.id);
        const star = document.createElement('span');
        star.className = 'game-page-star';
        handleStarFavorited(star, game);

        star.addEventListener('click', async (event) => {
            event.stopPropagation();
            await toggleFavorite(game, star);
        });

        gameHeader.textContent = game.name;
        gameHeader.appendChild(star);
        gameCover.src = game.cover.url;
        gameCover.alt = `${game.name} Cover`;

        gameInfo.releaseDate = game.first_release_date
            ? new Date(game.first_release_date * 1000).toLocaleDateString()
            : 'N/A';
        gameInfo.platforms = game.platforms
            ? game.platforms.map((p) => p.name).join(', ')
            : 'N/A';
        gameInfo.genres = game.genres || [];
        if (game.involved_companies) {
            gameInfo.developers = game.involved_companies.filter(company => company.developer);
            gameInfo.publishers = game.involved_companies.filter(company => company.publisher);
        }
        gameInfo.themes = game.themes || [];
        gameInfo.gameModes = game.game_modes || [];

        gameInfo.summary = game.summary || 'No summary available.';
        gameInfo.name = game.name;
        gameInfo.averageRating = game.average_rating;
        gameInfo.favoritesCount = game.favorites_count;
        gameInfo.playing = game.playing_count;
        gameInfo.completed = game.completed_count;
        gameInfo.planned = game.planned_count;
        gameInfo.wishlisted = game.wishlisted_count;
        gameInfo.dropped = game.dropped_count;
        gameInfo.onHold = game.on_hold_count;
        gameInfo.listEntries = game.entries;
        gameInfo.averageHoursPlayed = game.avg_hours_played;
        gameInfo.hoursPlayed = game.total_hours_played;
        gameInfo.screenshots = game.screenshots ? game.screenshots.map(screenshot => screenshot.url) : [];
        gameInfo.artworks = game.artworks ? game.artworks.map(artwork => artwork.url) : [];
        gameInfo.videos = game.videos ? game.videos.map(video => video.video_id) : [];
    } catch (error) {
        console.error('Failed to load game', error);
        gameHeader.textContent = 'Error loading game';
    }
}

function createCard(label, value, iconClass) {
    const card = document.createElement('div');
    card.className = 'game-info-card';

    const statLabel = document.createElement('div');
    statLabel.style.fontWeight = 'bold';
    statLabel.style.marginBottom = '8px';
    if (iconClass) {
        const icon = document.createElement('i');
        icon.className = `fas ${iconClass}`;
        icon.style.marginRight = '6px';
        statLabel.appendChild(icon);
    }
    statLabel.appendChild(document.createTextNode(label));
    card.appendChild(statLabel);

    if (value instanceof HTMLElement) {
        card.appendChild(value);
    } else {
        const statValue = document.createElement('div');
        statValue.textContent = value ?? 'N/A';
        card.appendChild(statValue);
    }

    return card;
}

async function loadOverviewTab() {
    contentDiv.textContent = '';
    const summaryHeader = document.createElement('h2');
    summaryHeader.classList = 'list-header';
    summaryHeader.textContent = 'Summary';
    summaryHeader.style.marginTop = '0';
    contentDiv.appendChild(summaryHeader);

    const summary = document.createElement('p');
    summary.textContent = gameInfo.summary;
    contentDiv.appendChild(summary);

    const infoHeader = document.createElement('h2');
    infoHeader.classList = 'list-header';
    infoHeader.textContent = 'Information';
    infoHeader.style.marginTop = '0';
    contentDiv.appendChild(infoHeader);

    const genInfoContainer = document.createElement('div');
    genInfoContainer.classList = 'game-info-container';

    genInfoContainer.appendChild(createCard('Release Date', gameInfo.releaseDate, 'fa-calendar'));

    const genresContainer = document.createElement('div');

    for (let i = 0; i < gameInfo.genres.length; i++) {
        const genre = gameInfo.genres[i];
        const a = document.createElement('a');
        a.href = `/games?type=popular&genre=${encodeURIComponent(genre.name)}&page=1`;
        a.textContent = genre.name;

        genresContainer.appendChild(a);

         if (i < gameInfo.genres.length - 1) {
            const comma = document.createTextNode(', ');
            genresContainer.appendChild(comma);
        }
    }
    genInfoContainer.appendChild(createCard('Genres', genresContainer, 'fa-tags'));

    const themesContainer = document.createElement('div');

    for (let i = 0; i < gameInfo.themes.length; i++) {
        const theme = gameInfo.themes[i];
        const a = document.createElement('a');
        a.href = `/games?type=popular&genre=${encodeURIComponent(theme.name)}&page=1`;
        a.textContent = theme.name;
        themesContainer.appendChild(a);
    
        if (i < gameInfo.themes.length - 1) {
            const comma = document.createTextNode(', ');
            themesContainer.appendChild(comma);
        }
    }
    genInfoContainer.appendChild(createCard('Themes', themesContainer, 'fa-palette'));

    const modesContainer = document.createElement('div');
    for (let i = 0; i < gameInfo.gameModes.length; i++) {
        const mode = gameInfo.gameModes[i];
        const a = document.createElement('a');
        a.href = `/games?type=popular&genre=${encodeURIComponent(mode.name)}&page=1`;
        a.textContent = mode.name;
        modesContainer.appendChild(a);
    
        if (i < gameInfo.gameModes.length - 1) {
            const comma = document.createTextNode(', ');
            modesContainer.appendChild(comma);
        }
    }
    genInfoContainer.appendChild(createCard('Game Modes', modesContainer, 'fa-gamepad'));


    contentDiv.appendChild(genInfoContainer);

    const companyContainer = document.createElement('div');
    companyContainer.classList = 'game-info-container';

    companyContainer.appendChild(createCard('Platforms', gameInfo.platforms, 'fa-suitcase'));

    const developersText = gameInfo.developers.length > 0 ? gameInfo.developers.map(dev => dev.company.name).join(', ') : 'N/A';
    companyContainer.appendChild(createCard('Developers', developersText, 'fa-pencil'));

    const publishersText = gameInfo.publishers.length > 0 ? gameInfo.publishers.map(pub => pub.company.name).join(', ') : 'N/A';
    companyContainer.appendChild(createCard('Publishers', publishersText, 'fa-building'));

    contentDiv.appendChild(companyContainer);

    const statsHeader = document.createElement('h2');
    statsHeader.classList = 'list-header';
    statsHeader.textContent = 'Statistics';
    statsHeader.style.marginTop = '0';
    contentDiv.appendChild(statsHeader);

    const statusesContainer = document.createElement('div');
    statusesContainer.classList = 'game-info-container';

    const statsContainer = document.createElement('div');
    statsContainer.classList = 'game-info-container';

    statsContainer.appendChild(createCard('Total List Entries', gameInfo.listEntries, 'fa-list'));
    statsContainer.appendChild(createCard('Favorites', gameInfo.favoritesCount, 'fa-star'));
    statsContainer.appendChild(createCard('Average Rating', gameInfo.averageRating !== null ? `${+gameInfo.averageRating.toFixed(2)}/10` : 'N/A', 'fa-star-half-alt'));
    statsContainer.appendChild(createCard('Average Hours Played', gameInfo.averageHoursPlayed !== null ? +gameInfo.averageHoursPlayed.toFixed(2) : 'N/A', 'fa-clock'));
    statsContainer.appendChild(createCard('Total Hours Played', gameInfo.hoursPlayed !== null ? +gameInfo.hoursPlayed.toFixed(2) : 'N/A', 'fa-hourglass'));


    statusesContainer.appendChild(createCard('Playing', gameInfo.playing, 'fa-play'));
    statusesContainer.appendChild(createCard('Completed', gameInfo.completed, 'fa-trophy'));
    statusesContainer.appendChild(createCard('Planned', gameInfo.planned, 'fa-clipboard'));
    statusesContainer.appendChild(createCard('Dropped', gameInfo.dropped, 'fa-ban'));
    statusesContainer.appendChild(createCard('On Hold', gameInfo.onHold, 'fa-pause'));
    statusesContainer.appendChild(createCard('Wishlisted', gameInfo.wishlisted, 'fa-heart'));
    
    contentDiv.appendChild(statsContainer);
    contentDiv.appendChild(statusesContainer);
}


async function loadReviewsTab() {
    contentDiv.textContent = '';
    const reviewsHeader = document.createElement('h2');
    reviewsHeader.classList = 'list-header';
    reviewsHeader.textContent = 'User Reviews';
    reviewsHeader.style.marginTop = '0';
    contentDiv.appendChild(reviewsHeader);

    const reviewsListDiv = document.createElement('div');
    contentDiv.appendChild(reviewsListDiv);

    function loadReviews() {
    const userId = currentUser ? currentUser.id : '';
    fetch(`/reviews/${gameId}?userId=${userId}`)
        .then((r) => r.json())
        .then((reviews) => {
            if (!Array.isArray(reviews)) {
                reviewsListDiv.innerHTML = '<p>No reviews yet.</p>';
                return;
            }

            if (!reviews.length) {
                reviewsListDiv.innerHTML = '<p>No reviews yet.</p>';
                return;
            }

            reviewsListDiv.innerHTML = reviews.map(renderReview).join('');
        })
        .catch((error) => {
            console.error('Error loading reviews', error);
            reviewsListDiv.innerHTML = '<p>Failed to load reviews.</p>';
        });
    }

    submitReviewBtn.addEventListener('click', async () => {
        const review_text = document.getElementById('reviewText').value;
        const reviewStatus = document.getElementById('reviewStatus').value || null;
        const reviewHoursPlayed = document.getElementById('reviewHoursPlayed').value;
        const reviewRating = document.getElementById('reviewRating').value;
        reviewModal.style.display = 'none';

        const reviewRes = await fetch(`/reviews/${gameId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_text }),
        });

        const listRes = await fetch('/usergames/add', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: gameId,
                rating: reviewRating,
                hoursPlayed: reviewHoursPlayed,
                status: reviewStatus,
            })
        });

        if (reviewRes.ok && listRes.ok) {
            document.getElementById('reviewText').value = '';
            loadReviews();
        } else {
            const body = await reviewRes.json().catch(() => ({}));
            alert(body.error || 'Failed to submit review.');
        }
        window.location.reload();
    });

    reviewsListDiv.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const action = btn.dataset.action;

        // voting on reviews/replies
        if (action === "review-upvote" || action === "review-downvote" ||
            action === "reply-upvote"  || action === "reply-downvote") {

            const isReview = action.startsWith("review");
            const id = isReview ? btn.dataset.reviewId : btn.dataset.replyId;
            const vote = action.includes("upvote") ? "upvote" : "downvote";

            await fetch(`${isReview ? "/reviews" : "/replies"}/${id}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vote }),
            });

            window.location.reload();
            return;
        }

        // editing a review/reply
        if (action === "review-edit" || action === "reply-edit" ||
            action === "cancel-edit" || action === "cancel-reply-edit") {

            const isReview = action.includes("review");
            const id = isReview ? btn.dataset.reviewId : btn.dataset.replyId;

            const selector = isReview ? `.edit-input[data-review-id="${id}"]` : `.reply-edit[data-reply-id="${id}"]`;

            const box = reviewsListDiv.querySelector(selector);
            if (!box) return;

            if (action.startsWith("cancel")) {
                box.classList.add("hidden");
            } else {
                box.classList.remove("hidden");
            }
            window.location.reload();
            return;
        }

        // submitting changes for edit
        if (action === "save-edit" || action === "save-reply-edit") {

            const isReview = action === "save-edit";
            const id = isReview ? btn.dataset.reviewId : btn.dataset.replyId;

            const selector = isReview ? `.edit-input[data-review-id="${id}"]` : `.reply-edit[data-reply-id="${id}"]`;

            const editBox = reviewsListDiv.querySelector(selector);
            if (!editBox) return;

            const textarea = editBox.querySelector("textarea");
            const text = textarea.value;

            const res = await fetch(`${isReview ? "/reviews" : "/replies"}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isReview ? { review_text: text } : { reply_text: text }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                alert(body.error || `Failed to edit ${isReview ? "review" : "reply"}.`);
                return;
            }

            window.location.reload();
            return;
        }

        // deleting a review/reply
        if (action === "review-delete" || action === "reply-delete") {

            const isReview = action === "review-delete";
            const id = isReview ? btn.dataset.reviewId : btn.dataset.replyId;

            if (!confirm(`Delete this ${isReview ? "review" : "reply"}?`)) return;

            const res = await fetch(`${isReview ? "/reviews" : "/replies"}/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                alert(body.error || `Failed to delete ${isReview ? "review" : "reply"}.`);
                return;
            }

            // if (isReview) await setupReviewBox();
            window.location.reload();
            return;
        }

        // replying to a review/reply
        if (action === "review-reply" || action === "reply-reply") {

            const isReview = action === "review-reply";
            const id = isReview ? btn.dataset.reviewId : btn.dataset.replyId;

            const selector = isReview ? `.reply-input[data-review-id="${id}"]` : `.reply-input[data-parent-reply="${id}"]`;

            const box = reviewsListDiv.querySelector(selector);
            if (box) box.classList.toggle("hidden");

            return;
        }

        // sending a reply
        if (action === "send-reply" || action === "send-nested-reply") {

            const isNested = action === "send-nested-reply";
            const reviewId = btn.dataset.reviewId;
            const parentReplyId = isNested ? Number(btn.dataset.parentReply) : null;

            const selector = isNested ? `.reply-input[data-parent-reply="${parentReplyId}"]` : `.reply-input[data-review-id="${reviewId}"]`;

            const replyDiv = reviewsListDiv.querySelector(selector);
            const textarea = replyDiv.querySelector(".reply-textarea");
            const reply_text = textarea.value;

            const res = await fetch(`/reviews/${reviewId}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isNested ? { reply_text, parent_reply_id: parentReplyId } : { reply_text }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                alert(body.error || "Failed to post reply.");
                return;
            }

            textarea.value = "";
            replyDiv.classList.add("hidden");
            loadReviews();
            return;
        }
    });
    loadReviews();
}

async function loadMediaTab() {
    contentDiv.textContent = '';

    if (gameInfo.videos.length === 0 && gameInfo.screenshots.length === 0 && gameInfo.artworks.length === 0) {
        const noMedia = document.createElement('p');
        noMedia.textContent = 'No media available.';
        contentDiv.appendChild(noMedia);
        return;
    };

    if (gameInfo.videos.length > 0) {
        const videosHeader = document.createElement('h2');
        videosHeader.classList = 'list-header';
        videosHeader.textContent = `Videos (${gameInfo.videos.length})`;
        videosHeader.style.marginTop = '0';
        contentDiv.appendChild(videosHeader);

        for (const video of gameInfo.videos) {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${video}`;
            iframe.classList = 'video';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            contentDiv.appendChild(iframe);
        }
    }

    if (gameInfo.screenshots.length > 0) {
        const screenshotsHeader = document.createElement('h2');
        screenshotsHeader.classList = 'list-header';
        screenshotsHeader.textContent = `Screenshots (${gameInfo.screenshots.length})`;
        screenshotsHeader.style.marginTop = '20px';
        contentDiv.appendChild(screenshotsHeader);

        for (const screenshot of gameInfo.screenshots) {
            const img = document.createElement('img');
            img.src = screenshot.replace('t_thumb', 't_720p');
            img.classList = 'screenshot';
            img.alt = 'Screenshot';
            img.loading = 'lazy';
            contentDiv.appendChild(img);
        }
    }

    if (gameInfo.artworks.length > 0) {
        const artworksHeader = document.createElement('h2');
        artworksHeader.classList = 'list-header';
        artworksHeader.textContent = `Artworks (${gameInfo.artworks.length})`;
        artworksHeader.style.marginTop = '20px';
        contentDiv.appendChild(artworksHeader);

        for (const artwork of gameInfo.artworks) {
            const img = document.createElement('img');
            img.src = artwork.replace('t_thumb', 't_720p');
            img.classList = 'screenshot';
            img.alt = 'Artwork';
            img.loading = 'lazy';
            contentDiv.appendChild(img);
        }
    }
}


async function checkLogin() {
    const res = await fetch('/users/current');
    if (res.ok) {
        const data = await res.json();
        currentUser = data;
        return data;
    } else {
        currentUser = null;
        return null;
    }
}

// Checks if the user already have an active (not deleted) review for this game
async function hasActiveReview() {
    try {
        const res = await fetch(`/reviews/${gameId}/user`);
        if (!res.ok) return false;
        const review = await res.json();
        if (review) {
           addReview.style.display = 'none';
           return true; 
        }
        addReview.style.display = 'block';
        return false;
    } catch (error) {
        return false;
    }
}

async function loadAddEntry() {
    try {
        const response = await fetch(`/usergames/current/${gameId}`);
        const body = await response.json();

        if (body.length !== 0) {
            const entry = body[0];
            addButton.textContent = 'Edit Entry';
            userGameInput.classList.add('show');

            entryStatus.value = entry.status;
            entryHoursPlayed.value = entry.hoursPlayed || '';
            entryRating.value = entry.rating || '';
            submitButton.textContent = 'Update'
        } else {
            addButton.textContent = 'Add to List';
        }

    } catch (error) {
        console.log('ERROR LOADING ADD ENTRY', error);
    }
}


// This is a helper that renders the reviews and the replies for the render functions
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// This is a recursive renderer for a reply (makes it so there is indentation based on depth)
function renderReply(reply, depth) {
    const indent = depth * 20;

    const isOwner = currentUser && currentUser.username === reply.username;
    const edited = reply.updated_at && reply.updated_at !== reply.created_at;

    const userVote = reply.user_vote === 'upvote' ? 'up' : reply.user_vote === 'downvote' ? 'down' : null;

    return `
        <div class="review-card" style="margin-left: ${indent}px" data-reply-id="${reply.id}">
            <div class="review-header-line">
                <strong>${escapeHtml(reply.username)}</strong>
                <span class="review-meta">
                    <small>${new Date(reply.created_at).toLocaleString()}</small>
                    ${edited ? `<small> • Edited at ${new Date(reply.updated_at).toLocaleString()}</small>` : ""}
                </span>
            </div>
            <p>${escapeHtml(reply.display_text)}</p>
            <div class="review-actions">
                <button class="vote-btn${userVote === 'up' ? ' vote-btn-active-up' : ''}" data-action="reply-upvote" data-reply-id="${reply.id}">▲ ${reply.upvotes}</button>
                <button class="vote-btn${userVote === 'down' ? ' vote-btn-active-down' : ''}" data-action="reply-downvote" data-reply-id="${reply.id}">▼ ${reply.downvotes}</button>
                <button class="small-btn" data-action="reply-reply" data-reply-id="${reply.id}">Reply</button>
                ${isOwner ? `<button class="small-btn" data-action="reply-edit" data-reply-id="${reply.id}">Edit</button>` : "" }
                ${isOwner ? `<button class="small-btn" data-action="reply-delete" data-reply-id="${reply.id}">Delete</button>` : "" }
            </div>

            <div class="reply-input hidden" data-parent-reply="${reply.id}">
                <textarea class="reply-textarea" placeholder="Reply..."></textarea>
                <br />
                <button class="small-btn" data-action="send-nested-reply" data-parent-reply="${reply.id}" data-review-id="${reply.review_id}">
                    Post Reply
                </button>
            </div>
            <div class="reply-edit hidden" data-reply-id="${reply.id}">
                <textarea class="reply-edit-textarea">${escapeHtml(reply.display_text)}</textarea>
                <br>
                <button class="small-btn" data-action="save-reply-edit" data-reply-id="${reply.id}">Save</button>
                <button class="small-btn" data-action="cancel-reply-edit" data-reply-id="${reply.id}">Cancel</button>
            </div>

            ${reply.replies.map(child => renderReply(child, depth + 1)).join('')}
        </div>
    `;
}


// Renders a top level review and its replies
function renderReview(review) {
    const isOwner =
        currentUser && currentUser.username === review.username;

    const edited =
        review.updated_at && review.updated_at !== review.created_at;

    const ratingText =
        review.rating !== null && review.rating !== undefined ? `${+review.rating}/10` : '-';

    const userVote = review.user_vote === 'upvote' ? 'up' : review.user_vote === 'downvote' ? 'down' : null;

    return `
        <div class="review-card" data-review-id="${review.id}">
            <div class="review-header-line">
                <strong>${escapeHtml(review.username)}</strong>
                <span> — Rating: ${ratingText}</span>
            </div>

            <div class="review-meta">
                <small>${new Date(review.created_at).toLocaleString()}</small>
                ${edited ? `<small> • Edited at ${new Date(review.updated_at,).toLocaleString()}</small>` : ''}
            </div>
            <p>${escapeHtml(review.display_text)}</p>
            <div class="review-actions">
                <button class="vote-btn${userVote === 'up' ? ' vote-btn-active-up' : ''}" data-action="review-upvote" data-review-id="${review.id}">▲ ${review.upvotes}</button>
                <button class="vote-btn${userVote === 'down' ? ' vote-btn-active-down' : ''}" data-action="review-downvote" data-review-id="${review.id}">▼ ${review.downvotes}</button>
                <button class="action-btn" data-action="review-reply" data-review-id="${review.id}">Reply</button>${isOwner ? `
                    <button class="action-btn" data-action="review-edit" data-review-id="${review.id}">Edit</button>
                    <button class="action-btn" data-action="review-delete" data-review-id="${review.id}">Delete</button>` : ''}
            </div>

            <div class="edit-input hidden" data-review-id="${review.id}">
                <textarea class="edit-textarea">${escapeHtml(review.display_text,)}</textarea>
                <br />
                <button class="small-btn" data-action="save-edit" data-review-id="${review.id}">Save</button>
                <button class="small-btn" data-action="cancel-edit" data-review-id="${review.id}">Cancel</button>
            </div>

            <div class="reply-input hidden" data-review-id="${review.id}">
                <textarea class="reply-textarea" placeholder="Reply..."></textarea>
                <br />
                <button class="small-btn" data-action="send-reply" data-review-id="${review.id}">Post Reply</button>
            </div>

            ${review.replies.map((rep) => renderReply(rep, 1)).join('')}
        </div>
    `;
}

addButton.addEventListener('click', () => {
    userGameInput.classList.toggle('show');
    setTimeout(() => {
        messageDiv.classList.add('hidden');
        messageDiv.textContent = '';
        messageDiv.classList.remove('error-message');
    }, 750);
});

submitButton.addEventListener('click', () => {
    messageDiv.display = 'none';
    messageDiv.textContent = '';
    messageDiv.classList.remove('error-message');
    fetch('/usergames/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status: entryStatus.value !== '' ? entryStatus.value : null,
            hoursPlayed: entryHoursPlayed.value !== '' ? entryHoursPlayed.value : null, 
            rating: entryRating.value !== '' ? entryRating.value : null,
            gameId: gameId
        })
    }).then((response => {
        if (response.status >= 400) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }

            response.json().then((body) => {
                messageDiv.style.display = 'inline-block';
                messageDiv.textContent = body.error;
                messageDiv.classList.add('error-message');
            });
        } else {
            userGameInput.classList.toggle('show');
            messageDiv.style.display = 'inline-block';
            messageDiv.textContent = 'Successfully added game to your list.'
        }
    }));
    window.location.reload();
})


document.addEventListener('DOMContentLoaded', async () => {
    await checkLogin();
    await loadGame();
    await loadAddEntry();
    await hasActiveReview();
    switch (activeTab) {
        case 'overview':
            await loadOverviewTab();
            setActive(overviewTab);
            break;
        case 'reviews':
            await loadReviewsTab();
            setActive(reviewsTab);
            break;
        case 'media':
            await loadMediaTab();
            setActive(mediaTab);
            break;
        default:
            await loadOverviewTab();
            setActive(overviewTab);
            break;
    }
});


function setActive(elem) {
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    elem.classList.add('active');
}

function setTabUrl(tab) {
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    history.pushState(null, '', url);
}

overviewTab.addEventListener('click', async () => {
    await loadOverviewTab();
    setActive(overviewTab);
    setTabUrl('overview');
});

reviewsTab.addEventListener('click', async () => {
    await loadReviewsTab();
    setActive(reviewsTab);
    setTabUrl('reviews');
});

mediaTab.addEventListener('click', async () => {
    await loadMediaTab();
    setActive(mediaTab);
    setTabUrl('media');
});

addReview.addEventListener('click', () => {
    reviewModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
    reviewModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === reviewModal) {
        reviewModal.style.display = 'none';
    }
});
