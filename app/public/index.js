let gameListIndex = 0;
let currentGenre = 'all';
let gameListIndexNew = 0;

function fetchGenres() {
    const dropdown = document.getElementById('genreFilter');
    dropdown.innerHTML = '';

    fetch('/genres')
        .then((res) => res.json())
        .then((genres) => {
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Genres';
            dropdown.appendChild(allOption);
            if (!Array.isArray(genres)) return;

            genres.forEach((g) => {
                let name;
                if (typeof g === 'string') {
                    name = g;
                } else if (g && typeof g === 'object') {
                    if (g.name) {
                        name = g.name;
                    } else if (g.id) {
                        name = String(g.id);
                    } else {
                        name = null;
                    }
                }

                if (!name || name == 'Card & Board Game') return;
                const display = name[0].toUpperCase() + name.slice(1);
                const option = document.createElement('option');
                option.value = name.toLowerCase();
                option.textContent = display;
                dropdown.appendChild(option);
            });
        })
        .catch((error) => {
            console.error('Error loading genres:', error);
        });
}

document.getElementById('genreFilter').addEventListener('change', (e) => {
    currentGenre = e.target.value || 'all';
    loadGames(true);
});

function loadGames(reset = false) {
    if (reset) gameListIndex = 0;
    const url = `/games?limit=10&offset=${gameListIndex}&genre=${currentGenre}`;
    fetch(url)
        .then((res) => res.json())
        .then((data) => {
            const container = document.getElementById('gamesContainer');
            if (reset) container.textContent = '';
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
            gameListIndex += 10;
        })
        .catch((error) => console.error('Error loading games:', error));
}

function loadNewReleases() {
    const url = `/newreleases?limit=10&offset=${gameListIndexNew}`;
    fetch(url)
        .then((res) => res.json())
        .then((data) => {
            const container = document.getElementById('newReleasesContainer');
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
            gameListIndexNew += 10;
        })
        .catch((error) => console.error('Error loading new releases:', error));
}

function setupScrollButtons() {
    const mainContainer = document.getElementById('gamesContainer');
    const newContainer = document.getElementById('newReleasesContainer');

    document.getElementById('scrollLeftMain').onclick = () => {
        mainContainer.scrollBy({ left: -200, behavior: 'smooth' });
    };
    document.getElementById('scrollRightMain').onclick = () => {
        mainContainer.scrollBy({ left: 200, behavior: 'smooth' });
    };

    document.getElementById('scrollLeftNew').onclick = () => {
        newContainer.scrollBy({ left: -200, behavior: 'smooth' });
    };
    document.getElementById('scrollRightNew').onclick = () => {
        newContainer.scrollBy({ left: 200, behavior: 'smooth' });
    };
}

document.getElementById('loadMore').onclick = () => loadGames();
document.getElementById('loadMoreNew').onclick = () => loadNewReleases();

document.getElementById('genreFilter').onchange = (e) => {
    currentGenre = e.target.value;
    loadGames(true);
};

fetchGenres();
loadGames(true);
loadNewReleases();
setupScrollButtons();

const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchResults = document.getElementById('searchResults');
const searchPicker = document.getElementById('searchType');

searchPicker.addEventListener('change', () => {
    const searchType = searchPicker.value;

    switch (searchType) {
        case 'games':
            searchInput.placeholder = 'Search for Games...';
            break;
        case 'users':
            searchInput.placeholder = 'Search for Users...';
            break;
        default:
            break;
    }
});
const searchResultsDisplay = document.getElementById('searchResultsDisplay');

searchButton.addEventListener('click', () => {
    searchResultsDisplay.style.display = 'block';
    const searchTerm = searchInput.value;
    if (!searchTerm) {
        return;
    }

    const container = document.getElementById('searchResults');
    container.textContent = 'Loading...';

    const searchType = searchPicker.value;

    switch (searchType) {
        case 'games':
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
                            container.textContent = '';
                            data.forEach((game) => {
                                const card = document.createElement('div');
                                card.className = 'game-card';

                                const img = document.createElement('img');
                                let imageUrl;
                                if (game.cover) {
                                    imageUrl = game.cover.url.replace(
                                        't_thumb',
                                        't_cover_big',
                                    );
                                } else {
                                    imageUrl =
                                        'https://placehold.co/150x200?text=No+Image';
                                }
                                img.src = imageUrl;
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
                        });
                    }
                })
                .catch((error) => {
                    searchResults.textContent = `Error: ${error.message}`;
                });
            break;
        case 'users':
            fetch(`/users/search?term=${searchTerm}`).then((response) => {
                if (response.status >= 400) {
                    response.json().then((body) => {
                        searchResults.textContent = `Error: ${body.error}`;
                    });
                } else {
                    response.json().then((body) => {
                        if (!body.rows || body.rows.length == 0) {
                            searchResults.textContent = `No users found.`;
                        } else {
                            container.textContent = '';

                            body.rows.forEach((user) => {
                                const card = document.createElement('div');
                                card.className = 'user-card';
                                
                                // TODO: actually style these
                                const img = document.createElement('img');
                                const imageUrl = user.profile_pic_url ? user.profile_pic_url.replace(
                                        't_thumb',
                                        't_cover_big',
                                    ) : '/images/default_profile_pic.jpg';
                                img.src = imageUrl;
                                img.alt = user.username;
                                img.className = 'user-profile-pic';

                                const username = document.createElement('p');
                                username.textContent = user.username;
                                username.className = 'username'

                                card.addEventListener('click', () => {
                                    window.location.href = `user.html?id=${user.id}`;
                                });
                                card.appendChild(img);
                                card.appendChild(username);
                                container.appendChild(card);
                            });
                        }
                    }).catch((error) => {
                        searchResults.textContent = `Error: ${error.message}`;
                    });
                }
            });
            break;
        default:
            break;
    }
});

// TODO: eventually we should move all of this login to some header that we can use across all of our site so users can logout/login anywhere
let logoutButton = document.getElementById('logout');
let loginButton = document.getElementById('login');
let signupButton = document.getElementById('signup');

async function checkStatus() {
    fetch('/auth/status', {
        credentials: 'include',
    })
        .then((response) => {
            response.json().then((body) => {
                if (body.loggedIn) {
                    loginButton.style.display = 'none';
                    signupButton.style.display = 'none';
                    logoutButton.style.display = 'inline-block';
                } else {
                    loginButton.style.display = 'inline-block';
                    signupButton.style.display = 'inline-block';
                    logoutButton.style.display = 'none';
                }
            });
        })
        .catch((error) => {
            console.log(`Status check failed: ${error}`);
        });
}

checkStatus();

logoutButton.addEventListener('click', async () => {
    await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
    })
        .then((response) => {
            if (response.status == 200) {
                console.log('Logout success');
            } else {
                console.log(`Logout failed ${response.status}`);
            }
        })
        .catch((error) => {
            console.log(`Logout failed: ${error}`);
        });
    await checkStatus();
});
