
import { getFavoriteIds, toggleFavorite, handleStarFavorited } from './favorite.js';

export async function generateGameCards(games) {
    let cards = [];
    const favoriteIds = await getFavoriteIds();

    const gamesWithFavorites = games.map(game => ({
        ...game,
        favorited: favoriteIds.includes(game.id)
    }));

    for (const game of gamesWithFavorites) {
        const card = document.createElement('div');
        card.className = 'game-card';
        const img = document.createElement('img');
        img.src = game.cover.url;
        img.alt = game.name;
        img.className = 'game-cover';
        img.loading = 'lazy';
        const title = document.createElement('p');
        title.textContent = game.name;
        title.className = 'game-title';

        if (game.rating !== null && game.rating !== undefined) {
            const rating = document.createElement('span');
            rating.textContent = `(${+parseFloat(game.rating).toFixed(2)}/10)`;
            rating.style.display = 'block';
            title.appendChild(rating);
        }
        const star = document.createElement('span');
        star.className = 'star';

        handleStarFavorited(star, game);

        star.addEventListener('click', async (event) => {
            event.stopPropagation();
            await toggleFavorite(game, star);
        });

        card.addEventListener('click', () => {
            window.location.href = `/game?id=${game.id}&tab=overview`;
        });
        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(star);
        cards.push(card);
    }

    return cards;
}

