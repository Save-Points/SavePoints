import { generateGameCards } from "./utils/gameCard.js";

let gameListIndex = 0;
let currentGenre = 'all';
let gameListIndexNew = 0;

function fetchGenres() {
    const dropdown = document.getElementById('genreFilter');
    dropdown.innerHTML = '';

    fetch('/api/genres')
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

async function loadGames(reset = false) {
    if (reset) gameListIndex = 0;
    const url = `/api/games?limit=25&offset=${gameListIndex}&genre=${currentGenre}`;
    fetch(url)
        .then((res) => res.json())
        .then(async (data) => {
            const container = document.getElementById('gamesContainer');
            if (reset) container.textContent = '';

            const cards = await generateGameCards(data.games);
            for (const card of cards) {
                container.appendChild(card);
            }
            gameListIndex += 10;
        })
        .catch((error) => console.error('Error loading games:', error));
}

function loadNewReleases() {
    const url = `/api/newreleases?limit=25&offset=${gameListIndexNew}`;
    fetch(url)
        .then((res) => res.json())
        .then(async (data) => {
            const container = document.getElementById('newReleasesContainer');
            const cards = await generateGameCards(data.games);
            for (const card of cards) {
                container.appendChild(card);
            }
            gameListIndexNew += 10;
        })
        .catch((error) => console.error('Error loading new releases:', error));
}

function setupScrollButtons() {
    document.querySelectorAll('.carousel-wrapper').forEach(wrapper => {
        const carousel = wrapper.querySelector('.carousel');
        wrapper.querySelector('.scroll-btn-left').addEventListener('click', () => {
            carousel.scrollBy({ left: -carousel.offsetWidth, behavior: 'smooth' });
        });
        wrapper.querySelector('.scroll-btn-right').addEventListener('click', () => {
            carousel.scrollBy({ left: carousel.offsetWidth, behavior: 'smooth' });
        });
    });
}

document.getElementById('genreFilter').onchange = (e) => {
    currentGenre = e.target.value;
    loadGames(true);
};

document.addEventListener("DOMContentLoaded", () => {
    fetchGenres();
    loadGames(true);
    loadNewReleases();
    setupScrollButtons();
});
