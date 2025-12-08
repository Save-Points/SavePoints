const params = new URLSearchParams(window.location.search);

const gamesType = params.get('type') || 'popular';
const gamesPage = parseInt(params.get('page')) || 1;
const gamesGenre = params.get('genre') || 'all';

const gamesBody = document.getElementById('gamesBody');
const gamesHeader = document.getElementById('gamesHeader');
const genreFilter = document.getElementById('genreFilter');

const ITEMS_PER_PAGE = 50;
let cachedGenres = null;

function formatStatus(status) {
    return status.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function fetchGenres() {
    const dropdown = document.getElementById('genreFilter');
    dropdown.innerHTML = '';

    fetch('/api/genres')
        .then((res) => res.json())
        .then((genres) => {
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Genres';
            if (gamesGenre.toLowerCase() === 'all') {
                allOption.selected = true;
            }
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
                if (name.toLowerCase() === gamesGenre.toLowerCase()) {
                    option.selected = true;
                }
                dropdown.appendChild(option);
            });
        })
        .catch((error) => {
            console.error('Error loading genres:', error);
        });
}

genreFilter.addEventListener('change', (e) => {
    window.location.href = `/games?type=${gamesType}&genre=${e.target.value || 'all'}&page=1`;
});

function clearGamesBody() {
    while (gamesBody.firstChild) {
        gamesBody.removeChild(gamesBody.firstChild);
    }
}

async function loadGames() {
    const offset = (gamesPage - 1) * ITEMS_PER_PAGE;
    let url;

    switch (gamesType) {
        case 'popular':
            gamesHeader.textContent = gamesGenre === 'all' ? 'Most Popular Games' : `Most Popular ${gamesGenre.charAt(0).toUpperCase() + gamesGenre.slice(1)} Games`;
            url = `/api/games?limit=${ITEMS_PER_PAGE}&offset=${offset}&genre=${gamesGenre}&includeStats=true&includeCount=true`;
            break;
        case 'new-releases':
            gamesHeader.textContent = 'Top New Releases';
            url = `/api/games?newReleases=true&limit=${ITEMS_PER_PAGE}&offset=${offset}&genre=${gamesGenre}&includeStats=true&includeCount=true`;
            break;
        case 'top-rated':
            gamesHeader.textContent = 'Top Rated';
            url = `/api/toprated?limit=${ITEMS_PER_PAGE}&offset=${offset}&includeStats=true`;
            break;
        case 'most-reviewed':
            gamesHeader.textContent = 'Most Reviewed';
            url = `/api/mostreviewed?limit=${ITEMS_PER_PAGE}&offset=${offset}&includeStats=true`;
            break;
        default:
            break;
    }

    const response = await fetch(url);
    const body = await response.json();
    const games = body.games;
    const count = body.count;

    clearGamesBody();

    renderPagination(count);

    const statusResponse = await loadUserStatuses(games);
    
    if (!statusResponse) {
        games.map(game => game.status = null);
    }

    for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const gameUrl = `/game?id=${game.id}&tab=overview`;
        const row = document.createElement('tr');

        const indexTd = document.createElement('td');
        indexTd.textContent = offset + i + 1;
        row.appendChild(indexTd);

        const imgTd = document.createElement('td');
        const imgLink = document.createElement('a');
        imgLink.href = gameUrl;

        const img = document.createElement('img');
        img.src = game.cover.url.replace('t_thumb', 't_cover_big');
        img.alt = game.name;
        img.loading = 'lazy';
        imgLink.appendChild(img);

        imgTd.appendChild(imgLink);
        imgTd.style = 'text-align: left';
        row.appendChild(imgTd);

        const infoTd = document.createElement('td');
        infoTd.style = 'text-align: left';
        const infoDiv = document.createElement('div');

        const titleLink = document.createElement('a');
        titleLink.href = gameUrl;
        titleLink.textContent = game.name;
        infoDiv.appendChild(titleLink);

        const developerDiv = document.createElement('div');
        const publisherDiv = document.createElement('div');
        if (game.involved_companies) {
            const developers = game.involved_companies.filter(company => company.developer);
            developerDiv.textContent = `Developers: ${developers.length > 0 ? developers.map(dev => dev.company.name).join(', ') : 'N/A'}`;

            const publishers = game.involved_companies.filter(company => company.publisher);
            publisherDiv.textContent = `Publishers: ${publishers.length > 0 ? publishers.map(pub => pub.company.name).join(', ') : 'N/A'}`;
        } else {
            developerDiv.textContent = 'Developers: N/A';
            publisherDiv.textContent = 'Publishers: N/A';
        }
        
        
        infoDiv.appendChild(developerDiv);
        infoDiv.appendChild(publisherDiv);

        infoTd.appendChild(infoDiv);

        row.appendChild(infoTd);

        const usersTd = document.createElement('td');
        usersTd.textContent = game.entries;
        row.appendChild(usersTd);

        const ratingTd = document.createElement('td');
        ratingTd.textContent = game.average_rating !== null ? `${game.average_rating}/10` : 'N/A';
        row.appendChild(ratingTd);

        const hoursTd = document.createElement('td');
        hoursTd.textContent = game.avg_hours_played || 'N/A';
        row.appendChild(hoursTd);

        const statusTd = document.createElement('td');
        statusTd.style = 'position: relative';

        const statusContainer = document.createElement('div');
        statusContainer.classList = 'status-container'

        const statusButton = document.createElement('button');
        statusButton.classList = 'action-btn ';
        statusButton.style = 'width: 125px;';

        if (game.status) {
            if (game.status === 'on_hold') {
                statusButton.classList.add('on-hold');
            } else {
                statusButton.classList.add(game.status);
            }
            statusButton.textContent = `${formatStatus(game.status)} ▼`;
        } else {
            statusButton.style = 'background-color: gray; color: white; width: 125px;';
            statusButton.textContent = 'Add to List ▼';
        }
        statusContainer.appendChild(statusButton);

        if (!statusResponse) {
            statusButton.addEventListener('click', () => {
                window.location.href = '/login.html';
            });
        } else {
            const dropdown = createStatusDropdown(async (newStatus) => {
                statusButton.textContent = `${formatStatus(newStatus)} ▼`;
                statusButton.style.backgroundColor = '';
                if (newStatus === 'on_hold') {
                    statusButton.classList = 'action-btn on-hold';
                    statusButton.style.color = 'black';
                } else {
                    statusButton.classList = 'action-btn' + ` ${newStatus}`;
                     statusButton.style.color = 'white';
                }

                await fetch('/usergames/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        gameId: game.id,
                        status: newStatus
                    })
                });
            });

            statusContainer.appendChild(dropdown);
            

            statusButton.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });

            document.addEventListener('click', () => {
                dropdown.style.display = 'none';
            });
        }
        statusTd.appendChild(statusContainer);
        row.appendChild(statusTd);
        gamesBody.appendChild(row);
    }
}

function createStatusDropdown(onSelect) {
    const dropdown = document.createElement('ul');
    dropdown.classList = 'status-dropdown';

    const statuses = ['playing', 'completed', 'on_hold', 'dropped', 'planned', 'wishlisted'];

    statuses.forEach(status => {
        const li = document.createElement('li');
        li.textContent = formatStatus(status);
        li.style.padding = '8px';
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
            onSelect(status);
            dropdown.style.display = 'none';
        });
        li.addEventListener('mouseover', () => li.style.backgroundColor = '#eee');
        li.addEventListener('mouseout', () => li.style.backgroundColor = 'white');
        dropdown.appendChild(li);
    });

    return dropdown;
}

async function loadUserStatuses(games) {
    const gameIds = games.map(game => game.id).join(','); 

    const response = await fetch(`/usergames?gameIds=${gameIds}`);
    if (!response.ok) {
        return false;
    }

    const userGames = await response.json();

    for (const game of games) {
        const userGame = userGames.find(ug => ug.game_id === game.id);
        game.status = userGame ? userGame.status : null;
    }
    return true;
}

function renderPagination(count) {
    paginationTop.textContent = '';
    paginationBottom.textContent = '';
    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

    const getPageLinks = () => {
        const pages = [];

        pages.push(1);

        let start = Math.max(gamesPage - 3, 2);
        let end = Math.min(gamesPage + 3, totalPages - 1);

        if (start > 2) {
            pages.push('...');
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < totalPages - 1) {
            pages.push('...');
        }

        if (totalPages > 1) {
            pages.push(totalPages);
        }

        return pages;
    };

    for (const elem of [paginationTop, paginationBottom]) {
        const prevPage = document.createElement('button');
        prevPage.textContent = '< Prev';
        prevPage.disabled = gamesPage <= 1;
        prevPage.classList = 'auth-button';
        prevPage.style = 'height: 25px; margin-right: 3px;'

        prevPage.addEventListener('click', () => {
            if (gamesPage > 1) {
                window.location.href = `/games?type=${gamesType}&genre=${gamesGenre}&page=${gamesPage - 1}`;
            }
        });

        elem.appendChild(prevPage);

        for (const page of getPageLinks()) {
            if (page === '...') {
                const span = document.createElement('span');
                span.textContent = '...';
                elem.appendChild(span);
            } else {
                const a = document.createElement('a');
                a.href =  `/games?type=${gamesType}&genre=${gamesGenre}&page=${page}`;
                a.textContent = page;
                a.style = 'margin: 3px;'
                if (page === gamesPage) {
                    a.style.fontWeight = 'bold';
                }
                elem.appendChild(a);
            }
        }

        const nextPage = document.createElement('button');
        nextPage.textContent = 'Next >';
        nextPage.disabled = gamesPage >= totalPages;
        nextPage.classList = 'auth-button';
        nextPage.style = 'height: 25px; margin-left: 3px;'

        nextPage.addEventListener('click', () => {
            if (gamesPage < totalPages) {
                window.location.href =  `/games?type=${gamesType}&genre=${gamesGenre}&page=${gamesPage + 1}`;
            }
        });

        elem.appendChild(nextPage);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (gamesType !== 'top-rated' && gamesType !== 'most-reviewed') {
        fetchGenres();
    } else {
        genreFilter.style.display = 'none';
    }
    await loadGames();
});
