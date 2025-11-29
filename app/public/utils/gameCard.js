export async function generateGameCards(games) {
    let cards = [];
    let favoriteIds = [];

    const storedFavorites = localStorage.getItem('favoriteIds');
    if (storedFavorites) {
        try {
            favoriteIds = JSON.parse(storedFavorites);
        } catch (error) {
            console.log('GET STORED FAVORITES FAILED', error);
            favoriteIds = [];
        }
    } else {
        try {
            const response = await fetch(`/usergames?favorites=true`);
            if (response.ok) {
                const favoritesRes = await response.json();
                favoriteIds = favoritesRes.map(game => game.game_id);
            } else {
                favoriteIds = [];
            }
            localStorage.setItem('favoriteIds', JSON.stringify(favoriteIds));
        } catch (error) {
            console.log('FETCH FAVORITES FAILED', error);
            favoriteIds = [];
        }
    }

    const gamesWithFavorites = games.map(game => ({
        ...game,
        favorited: favoriteIds.includes(game.id)
    }));

    for (const game of gamesWithFavorites) {
        const card = document.createElement('div');
        card.className = 'game-card';
        const img = document.createElement('img');
        img.src = game.coverUrl;
        img.alt = game.name;
        img.className = 'game-cover';
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

        star.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleFavorite(game, star);
        });

        card.addEventListener('click', () => {
            window.location.href = `/game?id=${game.id}`;
        });
        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(star);
        cards.push(card);
    }

    return cards;
}

async function toggleFavorite(game, starElem) {
    try {
        const response = await fetch('/usergames/togglefavorite', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: game.id
            })
        });

        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        game.favorited = !game.favorited;

        let storedFavorites = JSON.parse(localStorage.getItem('favoriteIds') || '[]');
        if (game.favorited) {
            storedFavorites.push(game.id);
        } else {
            storedFavorites = storedFavorites.filter(id => id !== game.id);
        }
        localStorage.setItem('favoriteIds', JSON.stringify(storedFavorites));
        
    } catch (error) {
        // TODO: do something on this error?
        console.log('FAILED TO GET FAVORITES', error);
    }
    handleStarFavorited(starElem, game);
}

function handleStarFavorited(starElem, game) {
    starElem.innerHTML = game.favorited ? '★' : '☆';
}
