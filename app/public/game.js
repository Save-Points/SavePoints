const params = new URLSearchParams(window.location.search);
const gameId = params.get('id');

const gameInfoDiv = document.getElementById("gameInfo");

if (gameId) {
    fetch(`/api/game/${gameId}`).then((response) => {
        if (response.status >= 400) {
            response.json().then((body) => {
                gameInfoDiv.textContent = `Error: ${body.error}`;
            });
        } else {
            response.json().then((game) => {
                document.title = game.name
                let coverUrl;
                if (game.cover) {
                    coverUrl = game.cover.url.replace('t_thumb', 't_cover_big');
                } else {
                    coverUrl = 'https://placehold.co/264x352?text=No+Image';
                }

                let releaseDate;
                if (game.first_release_date) {
                    releaseDate = new Date(game.first_release_date * 1000).toLocaleDateString();
                } else {
                    releaseDate = 'N/A';
                }

                let platforms;
                if (game.platforms) {
                    platforms = game.platforms.map(p => p.name).join(', ');
                } else {
                    platforms = 'N/A'
                }

                let genres;
                if (game.genres) {
                    genres = game.genres.map(g => g.name).join(', ');
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
    }).catch(error => {
        console.error("Error fetching game details:", error);
        gameInfoDiv.textContent = `Error: ${error.message}`;
    });
} else {
    gameInfoDiv.textContent = "No game ID provided.";
}