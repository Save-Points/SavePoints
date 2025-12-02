const params = new URLSearchParams(window.location.search);

const searchType = params.get('type');
const searchTerm = params.get('term');
const searchPage = parseInt(params.get('page')) || 1;

const searchBody = document.getElementById('searchBody');
const searchResults = document.getElementById('searchResults');
const paginationTop = document.getElementById('paginationTop');
const paginationBottom = document.getElementById('paginationBottom');

const ITEMS_PER_PAGE = 20;

function clearSearchBody() {
    while (searchBody.firstChild) {
        searchBody.removeChild(searchBody.firstChild);
    }
}

async function loadSearchList() {
    searchResults.textContent = `Search results for \"${searchTerm}\"`
    
    switch (searchType) {
        case 'games':
            await fetch('/api/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ searchTerm: searchTerm, offset: (searchPage - 1) * ITEMS_PER_PAGE }),
            }).then((response) => {
                if (response.status >= 400) {
                    response.json().then((body) => {
                        // TODO: handle error on page
                         console.log("error");
                    })
                } else {
                    response.json().then((body) => {
                        const count = body.count;
                        renderPagination(count);

                        clearSearchBody();
                        for (const game of body.games) {
                            const gameUrl = `/game?id=${game.id}`
                            const row = document.createElement('tr');
                            const imgTd = document.createElement('td');
                            const imgLink = document.createElement('a');
                            imgLink.href = gameUrl;

                            const img = document.createElement('img');
                            img.src = game.cover.url.replace('t_thumb', 't_cover_big');
                            img.alt = game.name;

                            imgLink.appendChild(img);
                            imgTd.appendChild(imgLink);
                            row.append(imgTd);

                            const infoTd = document.createElement('td');
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

                            row.append(infoTd);
                            searchBody.append(row);
                        }
                    })
                }
            });
            break;
        case 'users':
            const userOffset = (searchPage - 1) * ITEMS_PER_PAGE;
            await fetch(`/users/search?term=${searchTerm}&offset=${userOffset}`).then((response) => {
                if (response.status >= 400) {
                    response.json().then((body) => {
                         console.log("error");
                    });
                } else {
                    response
                        .json()
                        .then((body) => {
                            const count = body.count;
                            renderPagination(count);

                            clearSearchBody();
                            for (const user of body.rows) {
                                const userUrl = `/profile/${user.username}`
                                const row = document.createElement('tr');
                                const imgTd = document.createElement('td');
                                const imgLink = document.createElement('a');
                                imgLink.href = userUrl;
                                
                                const img = document.createElement('img');
                                const imageUrl = user.profile_pic_url
                                        ? user.profile_pic_url.replace(
                                            't_thumb',
                                            't_cover_big',
                                        )
                                        : '/images/default_profile_pic.jpg';

                                img.src = imageUrl;
                                img.alt = user.username;
                                img.className = 'user-profile-pic';

                                imgLink.appendChild(img);
                                imgTd.appendChild(imgLink);
                                row.append(imgTd);

                                const infoTd = document.createElement('td');
                                const infoDiv = document.createElement('div');

                                const userLink = document.createElement('a');
                                userLink.href = userUrl;
                                userLink.textContent = user.username;

                                const bioDiv = document.createElement('div');
                                bioDiv.textContent = user.bio;

                                // const countDiv = document.createElement('div');
                                // countDiv.textContent = `Game List Entries: ${user.game_count || 0}`

                                infoDiv.appendChild(userLink);
                                infoDiv.appendChild(bioDiv);
                                // infoDiv.appendChild(countDiv);

                                infoTd.appendChild(infoDiv);

                                row.append(infoTd);
                                searchBody.append(row);
                            }
                        })
                    }

                }
            );
            
            break;
        default:
            break;
    }
}

function setupSearch() {
    const searchPageInput = document.getElementById('searchPageInput');
    const searchPageButton = document.getElementById('searchPageButton');
    const searchPagePicker = document.getElementById('searchPageType');

    searchPageInput.value = searchTerm;
    searchPagePicker.value = searchType;

    searchPagePicker.addEventListener('change', () => {
        const searchPageType = searchPagePicker.value;

        switch (searchPageType) {
            case 'games':
                searchPageInput.placeholder = 'Search for Games...';
                break;
            case 'users':
                searchPageInput.placeholder = 'Search for Users...';
                break;
            default:
                break;
        }
    });

    function search() {
        const searchTerm = searchPageInput.value;
        const searchType = searchPagePicker.value;
        window.location.href = `/search?type=${searchType}&term=${searchTerm}&page=1`
    }

    searchPageButton.addEventListener('click', search);

    searchPageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            search();
        }
    });

    searchPagePicker.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            search();
        }
    });
}

function renderPagination(count) {
    paginationTop.textContent = '';
    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

    const getPageLinks = () => {
        const pages = [];

        pages.push(1);

        let start = Math.max(searchPage - 3, 2);
        let end = Math.min(searchPage + 3, totalPages - 1);

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
        prevPage.disabled = searchPage <= 1;
        prevPage.classList = 'auth-button';
        prevPage.style = 'height: 25px; margin-right: 3px;'

        prevPage.addEventListener('click', () => {
            if (searchPage > 1) {
                window.location.href = `/search?type=${searchType}&term=${searchTerm}&page=${searchPage - 1}`;
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
                a.href = `/search?type=${searchType}&term=${searchTerm}&page=${page}`;
                a.textContent = page;
                a.style = 'margin: 3px;'
                if (page === searchPage) {
                    a.style.fontWeight = 'bold';
                }
                elem.appendChild(a);
            }
        }

        const nextPage = document.createElement('button');
        nextPage.textContent = 'Next >';
        nextPage.disabled = searchPage >= totalPages;
        nextPage.classList = 'auth-button';
        nextPage.style = 'height: 25px; margin-left: 3px;'

        nextPage.addEventListener('click', () => {
            if (searchPage < totalPages) {
                window.location.href = `/search?type=${searchType}&term=${searchTerm}&page=${searchPage + 1}`;
            }
        });

        elem.appendChild(nextPage);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    loadSearchList();
    setupSearch();
});
