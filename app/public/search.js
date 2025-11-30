const params = new URLSearchParams(window.location.search);

const searchType = params.get("type");
const searchTerm = params.get("term");

const searchBody = document.getElementById('searchBody');
const searchResults = document.getElementById('searchResults');

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
                    body: JSON.stringify({ searchTerm: searchTerm }),
            }).then((response) => {
                if (response.status >= 400) {
                    response.json().then((body) => {
                         console.log("error");
                    })
                } else {
                    response.json().then((body) => {
                        clearSearchBody();
                        for (const game of body) {
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
            await fetch(`/users/search?term=${searchTerm}`).then((response) => {
                if (response.status >= 400) {
                    response.json().then((body) => {
                         console.log("error");
                    });
                } else {
                    response
                        .json()
                        .then((body) => {
                            console.log(body);
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
        window.location.href = `/search?type=${searchType}&term=${searchTerm}`
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


document.addEventListener("DOMContentLoaded", () => {
    loadSearchList();
    setupSearch();
});
