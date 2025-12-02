const params = new URLSearchParams(window.location.search);
const gameId = params.get('id');

const gameInfoDiv = document.getElementById('gameInfo');

const gameHeader = document.getElementById('name');
const gameCover = document.getElementById('cover');
const gameRating = document.getElementById('gameRating');
const gameRelease = document.getElementById('releaseDate');
const gamePlatforms = document.getElementById('platforms');
const gameGenres = document.getElementById('genres');
const gameSummary = document.getElementById('summary');
const gameDevelopers = document.getElementById('developers');
const gamePublishers = document.getElementById('publishers');

const addButton = document.getElementById('addToList');
const userGameInput = document.getElementById('userGameAdd');

const submitButton = document.getElementById('submit');
const gameStatus = document.getElementById('status');
const hoursPlayed = document.getElementById('hoursPlayed');
const userRating = document.getElementById('userRating');
const messageDiv = document.getElementById('message');

const userReviewSection = document.getElementById('userReviewSection');
const reviewsList = document.getElementById('reviewsList');
const submitReviewBtn = document.getElementById('submitReview');

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
                    gameCover.src = game.cover ? game.cover.url.replace(
                            't_thumb',
                            't_cover_big',
                        ) : 'https://placehold.co/264x352?text=No+Image';

                    gameCover.alt = `${game.name} cover`;

                    gameRelease.textContent = game.first_release_date ? new Date(game.first_release_date * 1000).toLocaleDateString() : 'N/A';

                    gamePlatforms.textContent = game.platforms ? game.platforms.map((p) => p.name).join(', ') : 'N/A';

                    gameGenres.textContent = game.genres ? game.genres.map((g) => g.name).join(', ') : 'N/A';

                    gameHeader.textContent = game.name;

                    gameRating.textContent = +Math.round(game.aggregated_rating);

                    if (game.involved_companies) {
                        const developers = game.involved_companies.filter(company => company.developer);
                        gameDevelopers.textContent = developers.length > 0 ?  developers.map(dev => dev.company.name).join(', ') : 'N/A';

                        const publishers = game.involved_companies.filter(company => company.publisher);
                        gamePublishers.textContent = publishers.length > 0 ? publishers.map(dev => dev.company.name).join(', ') : 'N/A';
                    } else {
                        gameDevelopers.textContent = 'N/A';
                        gamePublishers.textContent = 'N/A';
                    }



                    gameSummary.textContent = game.summary;
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
        return Boolean(review);
    } catch (error) {
        return false;
    }
}

async function setupReviewBox() {
    const user = await checkLogin();
    if (!user) {
        userReviewSection.style.display = 'none';
        return;
    }

    const hasReview = await hasActiveReview();
    userReviewSection.style.display = hasReview ? 'none' : 'block';
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
                <button class="vote-btn" data-action="reply-upvote" data-reply-id="${reply.id}">▲ ${reply.upvotes}</button>
                <button class="vote-btn" data-action="reply-downvote" data-reply-id="${reply.id}">▼ ${reply.downvotes}</button>
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
                <button class="vote-btn" data-action="review-upvote" data-review-id="${review.id}">▲ ${review.upvotes}</button>
                <button class="vote-btn" data-action="review-downvote" data-review-id="${review.id}">▼ ${review.downvotes}</button>
                <button class="small-btn" data-action="review-reply" data-review-id="${review.id}">Reply</button>${isOwner ? `
                    <button class="small-btn" data-action="review-edit" data-review-id="${review.id}">Edit</button>
                    <button class="small-btn" data-action="review-delete" data-review-id="${review.id}">Delete</button>` : ''}
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

function loadReviews() {
    fetch(`/reviews/${gameId}`)
        .then((r) => r.json())
        .then((reviews) => {
            if (!Array.isArray(reviews)) {
                reviewsList.innerHTML = '<p>No reviews yet.</p>';
                return;
            }

            if (!reviews.length) {
                reviewsList.innerHTML = '<p>No reviews yet.</p>';
                return;
            }

            reviewsList.innerHTML = reviews.map(renderReview).join('');
        })
        .catch((error) => {
            console.error('Error loading reviews', error);
            reviewsList.innerHTML = '<p>Failed to load reviews.</p>';
        });
}

submitReviewBtn.addEventListener('click', async () => {
    const review_text = document.getElementById('reviewText').value;

    const res = await fetch(`/reviews/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_text }),
    });

    if (res.ok) {
        document.getElementById('reviewText').value = '';
        await setupReviewBox();
        loadReviews();
    } else {
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'Failed to submit review.');
    }
});

reviewsList.addEventListener('click', async (e) => {
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

        loadReviews();
        return;
    }

    // editing a review/reply
    if (action === "review-edit" || action === "reply-edit" ||
        action === "cancel-edit" || action === "cancel-reply-edit") {

        const isReview = action.includes("review");
        const id = isReview ? btn.dataset.reviewId : btn.dataset.replyId;

        const selector = isReview ? `.edit-input[data-review-id="${id}"]` : `.reply-edit[data-reply-id="${id}"]`;

        const box = reviewsList.querySelector(selector);
        if (!box) return;

        if (action.startsWith("cancel")) {
            box.classList.add("hidden");
        } else {
            box.classList.remove("hidden");
        }

        return;
    }

    // submitting changes for edit
    if (action === "save-edit" || action === "save-reply-edit") {

        const isReview = action === "save-edit";
        const id = isReview ? btn.dataset.reviewId : btn.dataset.replyId;

        const selector = isReview ? `.edit-input[data-review-id="${id}"]` : `.reply-edit[data-reply-id="${id}"]`;

        const editBox = reviewsList.querySelector(selector);
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

        loadReviews();
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

        if (isReview) await setupReviewBox();
        loadReviews();
        return;
    }

    // replying to a review/reply
    if (action === "review-reply" || action === "reply-reply") {

        const isReview = action === "review-reply";
        const id = isReview ? btn.dataset.reviewId : btn.dataset.replyId;

        const selector = isReview ? `.reply-input[data-review-id="${id}"]` : `.reply-input[data-parent-reply="${id}"]`;

        const box = reviewsList.querySelector(selector);
        if (box) box.classList.toggle("hidden");

        return;
    }

    // sending a reply
    if (action === "send-reply" || action === "send-nested-reply") {

        const isNested = action === "send-nested-reply";
        const reviewId = btn.dataset.reviewId;
        const parentReplyId = isNested ? Number(btn.dataset.parentReply) : null;

        const selector = isNested ? `.reply-input[data-parent-reply="${parentReplyId}"]` : `.reply-input[data-review-id="${reviewId}"]`;

        const replyDiv = reviewsList.querySelector(selector);
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
            status: gameStatus.value,
            hoursPlayed: hoursPlayed.value, 
            rating: userRating.value,
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
    }))
})

setupReviewBox();
loadReviews();
