const path = window.location.pathname.split('/');
const username = path[path.length - 1];

const messageDiv = document.getElementById('message');
const gamesBody = document.getElementById('gamesBody');
const gamesTable = document.getElementById('gamesTable');
const pageHead = document.getElementById('pageHeader');


const titleHead = document.getElementById('titleHead');
const ratingHead = document.getElementById('ratingHead');
const statusHead = document.getElementById('statusHead');
const hoursPlayedHead = document.getElementById('hoursPlayedHead');

let userGames = [];
window.titleState = null;
window.ratingState = null;
window.hoursPlayedState = null;
window.statusState = null;

const statusValues = {
    'playing': 1,
    'completed': 2,
    'on_hold': 5,
    'planned': 3,
    'wishlisted': 4, 
    'dropped': 6
}

function resetState(head, state) {
    head.classList.remove('sort-asc', 'sort-desc');
    window[state] = null;
}

function formatStatus(status) {
    return status.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function sortAndRenderGames(sortType) {
    let sortedGames = [...userGames];

    switch (sortType) {
        case 'title-asc':
            sortedGames.sort((a, b) => a.igdb.name.localeCompare(b.igdb.name));
            break;
        case 'title-desc':
            sortedGames.sort((a, b) => b.igdb.name.localeCompare(a.igdb.name));
            break;
        case 'rating-asc':
            sortedGames.sort((a, b) => {
                if (a.rating == null) {
                    return 1;
                }
                if (b.rating == null) {
                    return -1;
                }
                return a.rating - b.rating;
            });
            break;
        case 'rating-desc':
            sortedGames.sort((a, b) => {
                if (a.rating == null) {
                    return 1;
                }
                if (b.rating == null) {
                    return -1;
                }
                return b.rating - a.rating;
            });
            break;
        case 'hours-asc':
            sortedGames.sort((a, b) => (a.hours_played || 0) - (b.hours_played || 0));
            break;
        case 'hours-desc':
            sortedGames.sort((a, b) => (b.hours_played || 0) - (a.hours_played || 0));
            break;
        case 'status-asc':
            sortedGames.sort((a, b) => (statusValues[a.status] || 0) - (statusValues[b.status] || 0));
            break;
        case 'status-desc':
            sortedGames.sort((a, b) => (statusValues[b.status] || 0) - (statusValues[a.status] || 0));
            break;
        default:
            sortedGames.sort((a, b) => (statusValues[a.status] || 0) - (statusValues[b.status] || 0));
            break;
    }

    renderGames(sortedGames);
}

function renderGames(games) {
    while (gamesBody.firstChild) {
        gamesBody.removeChild(gamesBody.firstChild);
    }
    for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const gameUrl = `/game?id=${game.game_id}`

        const row = document.createElement('tr');

        const statusColorTd = document.createElement('td');
        statusColorTd.classList = game.status === 'on_hold' ? 'on-hold' : game.status;
        row.append(statusColorTd);

        const indexTd = document.createElement('td');
        indexTd.textContent = i + 1;
        row.append(indexTd);

        const imgTd = document.createElement('td');

        const imgLink = document.createElement('a');
        imgLink.href = gameUrl;

        const img = document.createElement('img');
        img.src = game.igdb.coverUrl;
        img.alt = game.igdb.name;

        imgLink.appendChild(img);
        imgTd.appendChild(imgLink);
        row.append(imgTd);

        const titleLink = document.createElement('a');
        titleLink.href = gameUrl;
        titleLink.textContent = game.igdb.name;

        const titleTd = document.createElement('td');
        titleTd.appendChild(titleLink);

        row.append(titleTd);

        const scoreTd = document.createElement('td');
        scoreTd.textContent = game.rating ? `${+game.rating}/10` : '-';
        row.append(scoreTd);

        const statusTd = document.createElement('td');
        statusTd.textContent = formatStatus(game.status);
        row.append(statusTd);

        const hoursPlayedTd = document.createElement('td');
        hoursPlayedTd.textContent = game.hours_played;
        row.append(hoursPlayedTd);

        const reviewTd = document.createElement('td');
        // TODO: add link to review if there is one
        reviewTd.textContent = '-';
        row.append(reviewTd);
        
        gamesBody.append(row);
    }
    gamesTable.classList.remove('hidden');
}

async function loadGameList() {
    try {
        await fetch(`/usergames/${username}`).then((response) => {
            if (response.status >= 400) {
                response.json().then((body) => {
                    messageDiv.style.display = 'inline-block';
                    messageDiv.textContent = body.error;
                    messageDiv.classList.add('error-message');
                })
            } else {
                response.json().then(async (body) => {
                    const gameIds = body.map((game) => game.game_id);
                    const idStr = gameIds.join(',');
                    const apiRes = await fetch(`/api/games?ids=${idStr}`);
                    const data = await apiRes.json();
                    const games = data.games;

                    const combined = body.map((game) => {
                        const igdbGame = games.find((g) => g.id == game.game_id);
                        return {
                            ...game,
                            igdb: igdbGame,
                        }
                    });

                    userGames = combined;
                    sortAndRenderGames();
                })
            }
        })
    } catch (error) {
        messageDiv.style.display = 'inline-block';
        messageDiv.textContent = error;
        messageDiv.classList.add('error-message');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    pageHead.textContent = `${username}'s Game List`
});

document.addEventListener('DOMContentLoaded', loadGameList);

titleHead.addEventListener('click', () => {
    resetState(ratingHead, 'ratingState');
    resetState(hoursPlayedHead, 'hoursPlayedState');
    resetState(statusHead, 'statusState');

    if (window.titleState == null) {
        titleHead.classList.add('sort-asc');
        window.titleState = 'title-asc';
    } else if (window.titleState == 'title-asc') {
        titleHead.classList.remove('sort-asc');
        titleHead.classList.add('sort-desc');
        window.titleState = 'title-desc';
    } else {
        titleHead.classList.remove('sort-desc');
        window.titleState = null;
    }

    sortAndRenderGames(window.titleState);
});

ratingHead.addEventListener('click', () => {
    resetState(titleHead, 'titleState');
    resetState(hoursPlayedHead, 'hoursPlayedState');
    resetState(statusHead, 'statusState');

    if (window.ratingState == null) {
        ratingHead.classList.add('sort-desc');
        window.ratingState = 'rating-desc';
    } else if (window.ratingState == 'rating-desc') {
        ratingHead.classList.remove('sort-desc');
        ratingHead.classList.add('sort-asc');
        window.ratingState = 'rating-asc';
    } else {
        ratingHead.classList.remove('sort-asc');
        window.ratingState = null;
    }

    sortAndRenderGames(window.ratingState);
});

hoursPlayedHead.addEventListener('click', () => {
    resetState(titleHead, 'titleState');
    resetState(ratingHead, 'ratingState');
    resetState(statusHead, 'statusState');

    if (window.hoursPlayedState == null) {
        hoursPlayedHead.classList.add('sort-desc');
        window.hoursPlayedState = 'hours-desc';
    } else if (window.hoursPlayedState == 'hours-desc') {
        hoursPlayedHead.classList.remove('sort-desc');
        hoursPlayedHead.classList.add('sort-asc');
        window.hoursPlayedState = 'hours-asc';
    } else {
        hoursPlayedHead.classList.remove('sort-asc');
        window.hoursPlayedState = null;
    }

    sortAndRenderGames(window.hoursPlayedState);
});

statusHead.addEventListener('click', () => {
    resetState(titleHead, 'titleState');
    resetState(ratingHead, 'ratingState');
    resetState(hoursPlayedHead, 'hoursPlayedState');

    if (window.statusState == null) {
        statusHead.classList.add('sort-desc');
        window.statusState = 'status-desc';
    } else if (window.statusState == 'status-desc') {
        statusHead.classList.remove('sort-desc');
        statusHead.classList.add('sort-asc');
        window.statusState = 'status-asc';
    } else {
        statusHead.classList.remove('sort-asc');
        window.statusState = null;
    }

    sortAndRenderGames(window.statusState);
});
