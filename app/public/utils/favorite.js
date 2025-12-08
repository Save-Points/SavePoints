export async function getFavoriteIds() {
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
    return favoriteIds;
}

export async function toggleFavorite(game, starElem) {
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

export function handleStarFavorited(starElem, game) {
    starElem.innerHTML = game.favorited ? '★' : '☆';
}