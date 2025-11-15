const params = new URLSearchParams(window.location.search);
const gameId = params.get('id');

const gameInfoDiv = document.getElementById('gameInfo');
const userReviewSection = document.getElementById('userReviewSection');
const loginNotice = document.getElementById('loginNotice');
const reviewsList = document.getElementById('reviewsList');

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
                    let coverUrl;
                    if (game.cover) {
                        coverUrl = game.cover.url.replace(
                            't_thumb',
                            't_cover_big',
                        );
                    } else {
                        coverUrl = 'https://placehold.co/264x352?text=No+Image';
                    }

                    let releaseDate;
                    if (game.first_release_date) {
                        releaseDate = new Date(
                            game.first_release_date * 1000,
                        ).toLocaleDateString();
                    } else {
                        releaseDate = 'N/A';
                    }

                    let platforms;
                    if (game.platforms) {
                        platforms = game.platforms
                            .map((p) => p.name)
                            .join(', ');
                    } else {
                        platforms = 'N/A';
                    }

                    let genres;
                    if (game.genres) {
                        genres = game.genres.map((g) => g.name).join(', ');
                    } else {
                        genres = 'N/A';
                    }

                    gameInfoDiv.innerHTML = `
                    <h2>${game.name}</h2>
                    <img src="${coverUrl}" alt="${game.name} cover">
                    <p><strong>Rating:</strong> ${Math.round(game.aggregated_rating)}</p>
                    <p><strong>Release Date:</strong> ${releaseDate}</p>
                    <p><strong>Platforms:</strong> ${platforms}</p>
                    <p><strong>Genres:</strong> ${genres}</p>
                    <p>${game.summary}</p>
                `;
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
        loadUserReview();
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
                    <strong>${r.username}</strong> — <span>Rating: ${r.rating}/10</span>
                    <p>${r.review_text ? r.review_text : ''}</p>
                    <small>${new Date(r.created_at).toLocaleString()}</small>
                </div>
            `,
                )
                .join('');
        });
}

loadReviews();

function loadUserReview() {
    fetch(`/reviews/${gameId}/user`)
        .then((r) => r.json())
        .then((review) => {
            if (review) {
                document.getElementById('ratingInput').value = review.rating;
                document.getElementById('reviewText').value =
                    review.review_text || '';
            }
        });
}

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
