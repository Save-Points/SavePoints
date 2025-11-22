const params = new URLSearchParams(window.location.search);
const gameId = params.get('id');

const gameInfoDiv = document.getElementById('gameInfo');
const userReviewSection = document.getElementById('userReviewSection');
const loginNotice = document.getElementById('loginNotice');
const reviewsList = document.getElementById('reviewsList');
const gameHeader = document.getElementById('name');
const gameCover = document.getElementById('cover');
const gameRating = document.getElementById('gameRating');
const gameRelease = document.getElementById('releaseDate');
const gamePlatforms = document.getElementById('platforms');
const gameGenres = document.getElementById('genres');
const gameSummary = document.getElementById('summary');

const addButton = document.getElementById('addToList');
const userGameInput = document.getElementById('userGameAdd');

const submitButton = document.getElementById('submit');
const gameStatus = document.getElementById('status');
const hoursPlayed = document.getElementById('hoursPlayed');
const userRating = document.getElementById('userRating');
const messageDiv = document.getElementById('message');

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

                    gameRating.textContent = Math.round(game.aggregated_rating)

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
        return data;
    } else {
        return null;
    }
}

checkLogin().then((user) => {
    if (user) {
        userReviewSection.style.display = 'block';
        loginNotice.style.display = 'none';
        // loadUserReview();
    } else {
        userReviewSection.style.display = 'none';
        loginNotice.style.display = 'block';
    }
});

function loadReviews() {
    fetch(`/reviews/${gameId}`)
        .then((r) => r.json())
        .then((reviews) => {
            const container = document.getElementById('reviewsList');

            if (!reviews.length) {
                container.innerHTML = '<p>No reviews yet.</p>';
                return;
            }

            container.innerHTML = reviews
                .map(
                    (r) => `
                <div class="review-card">
                    <strong>${r.username}</strong> — <span>Rating: ${+r.rating}/10</span>
                    <p>${r.review_text ? r.review_text : ''}</p>
                    <small>${new Date(r.created_at).toLocaleString()}</small>
                </div>
            `,
                )
                .join('');
        });
}

loadReviews();

// function loadUserReview() {
//     fetch(`/reviews/${gameId}/user`)
//         .then((r) => r.json())
//         .then((review) => {
//             if (review) {
//                 document.getElementById('ratingInput').value = review.rating;
//                 document.getElementById('reviewText').value =
//                     review.review_text || '';
//             }
//         });
// }

document.getElementById('submitReview').addEventListener('click', async () => {
    const rating = document.getElementById('ratingInput').value;
    const review_text = document.getElementById('reviewText').value;

    const res = await fetch(`/reviews/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review_text }),
    });

    if (res.ok) {
        loadReviews();
    } else {
        alert('Failed to submit review.');
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
            response.json().then((body) => {
                messageDiv.style.display = 'inline-block';
                messageDiv.textContent = body.error;
                messageDiv.classList.add('error-message');
            })
        } else {
            userGameInput.classList.toggle('show');
            messageDiv.style.display = 'inline-block';
            messageDiv.textContent = 'Successfully added game to your list.'
        }
    }))
})
