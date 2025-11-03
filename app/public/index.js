fetch('/games')
    .then((res) => res.json())
    .then((data) => {
        const container = document.getElementById('gamesContainer');
        container.textContent = '';

        data.games.forEach((game) => {
            const card = document.createElement('div');
            card.className = 'game-card';

            const img = document.createElement('img');
            img.src = game.coverUrl;
            img.alt = game.name;
            img.className = 'game-cover';

            const title = document.createElement('p');
            title.textContent = game.name;
            title.className = 'game-title';

            card.addEventListener('click', () => {
                window.location.href = `game.html?id=${game.id}`;
            });

            card.appendChild(img);
            card.appendChild(title);
            container.appendChild(card);
        });
    })
    .catch((err) => console.error('Error loading games:', err));

const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchResults = document.getElementById('searchResults');

searchButton.addEventListener('click', () => {
    const searchTerm = searchInput.value;
    if (!searchTerm) {
        return;
    }

    const container = document.getElementById("searchResults");
    container.textContent= 'Loading...';

    fetch('/api/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchTerm: searchTerm }),
    })
        .then((response) => {
            if (response.status >= 400) {
                response.json().then((body) => {
                    searchResults.textContent = `Error: ${body.error}`;
                });
            } else {
                response.json().then((data) => {
                    container.textContent = ""
                    data.forEach(game => {
                        const card = document.createElement("div");
                        card.className = "game-card";

                        const img = document.createElement("img");
                        let imageUrl
                        if (game.cover) {
                            imageUrl = game.cover.url.replace('t_thumb', 't_cover_big');
                        } else {
                            imageUrl = 'https://placehold.co/150x200?text=No+Image';
                        }
                        img.src = imageUrl;
                        img.alt = game.name;
                        img.className = "game-cover";

                        const title = document.createElement("p");
                        title.textContent = game.name;
                        title.className = "game-title";

                        card.addEventListener("click", () => {
                            window.location.href = `game.html?id=${game.id}`;
                        });
                        card.appendChild(img);
                        card.appendChild(title);
                        container.appendChild(card);
                    })
                });
            }
        })
        .catch((error) => {
            searchResults.textContent = `Error: ${error.message}`;
        });
});
