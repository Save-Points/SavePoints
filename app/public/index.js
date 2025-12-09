import { generateGameCards } from "./utils/gameCard.js";

async function loadGames(reset = false) {
    const url = `/api/games?limit=30&includeStats=false&includeCount=false`;
    fetch(url)
        .then((res) => res.json())
        .then(async (data) => {
            const container = document.getElementById('gamesContainer');
            if (reset) container.textContent = '';

            const cards = await generateGameCards(data.games);
            for (const card of cards) {
                container.appendChild(card);
            }
        })
        .catch((error) => console.error('Error loading games:', error));
}

function loadNewReleases() {
    const url = `/api/games?newReleases=true&limit=30&includeStats=false&includeCount=false`;
    fetch(url)
        .then((res) => res.json())
        .then(async (data) => {
            const container = document.getElementById('newReleasesContainer');
            const cards = await generateGameCards(data.games);
            for (const card of cards) {
                container.appendChild(card);
            }
        })
        .catch((error) => console.error('Error loading new releases:', error));
}

function loadMostReviewed() {
    const url = `/api/popular?sortBy=reviews&limit=30&includeStats=false`;
    fetch(url)
        .then((res) => res.json())
        .then(async (data) => {
            const container = document.getElementById('mostReviewedContainer');
            if (!data || !Array.isArray(data.games)) return;

            const cards = await generateGameCards(data.games);
            for (const card of cards) {
                container.appendChild(card);
            }
        })
        .catch((error) =>
            console.error('Error loading most reviewed games:', error),
        );
}

function loadTopRated() {
    const url = `/api/popular?sortBy=rating&limit=30&includeStats=false`;
    fetch(url)
        .then((res) => res.json())
        .then(async (data) => {
            const container = document.getElementById('topRatedContainer');
            if (!data || !Array.isArray(data.games)) return;

            const cards = await generateGameCards(data.games);
            for (const card of cards) {
                container.appendChild(card);
            }
        })
        .catch((error) =>
            console.error('Error loading top rated games:', error),
        );
}

function loadMostFavorited() {
    const url = `/api/popular?sortBy=favorites&limit=30&includeStats=false`;
    fetch(url)
        .then((res) => res.json())
        .then(async (data) => {
            const container = document.getElementById('mostFavoritedContainer');
            if (!data || !Array.isArray(data.games)) return;

            const cards = await generateGameCards(data.games);
            for (const card of cards) {
                container.appendChild(card);
            }
        })
        .catch((error) =>
            console.error('Error loading most favorited games:', error),
        );
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

document.addEventListener("DOMContentLoaded", async () => {
    await Promise.all([
        loadGames(true),
        loadNewReleases(),
        loadMostReviewed(),
        loadTopRated(),
        loadMostFavorited(),
        setupScrollButtons()
    ]);
});
