import { generateGameCards } from "./utils/gameCard.js";

let userInfo = {
    games: [],
    favoriteGames: [],
    friends: [],
    averageRating: 0,
    hoursPlayed: 0,
    averageHoursPlayed: 0,
    completedGames: 0,
    playingGames: 0,
    plannedGames: 0,
    wishlistedGames: 0,
    droppedGames: 0,
    onHoldGames: 0,
    upvotes: 0,
    downvotes: 0,
}

let currentProfileUserId = null;

const contentDiv = document.getElementById('contentDiv');
const overviewTab = document.getElementById('overview');
const reviewsTab = document.getElementById('reviews');
const friendsTab = document.getElementById('friends');
const viewAllFriends = document.getElementById('viewFriends');

const pathParts = window.location.pathname.split('/'); 
const usernameParam = pathParts[2];

async function checkFriendStatus(targetUserId) {
    const actionArea = document.getElementById('friendActionArea');
    if (!actionArea) {
        return;
    }

    try {
        const res = await fetch(`/friends/status/${targetUserId}`);
        if (!res.ok) {
            return;
        } 

        const data = await res.json();
        actionArea.textContent = '';
        if (data.status === 'self') {
            return;
        }

        const btn = document.createElement('button');
        btn.className = 'friend-action-btn'; 

        if (data.status === 'none') {
            btn.textContent = 'Add Friend';
            btn.classList.add('btn-blue');
            btn.onclick = () => sendFriendRequest(targetUserId);
        } else if (data.status === 'sent') {
            btn.textContent = 'Cancel Request';
            btn.classList.add('btn-red');
            btn.onclick = () => removeFriendRequest(targetUserId);

        } else if (data.status === 'received') {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.gap = '10px';
            
            const acceptBtn = document.createElement('button');
            acceptBtn.className = 'friend-action-btn btn-green';
            acceptBtn.textContent = 'Accept';
            acceptBtn.onclick = () => acceptFriendRequest(targetUserId);

            const declineBtn = document.createElement('button');
            declineBtn.className = 'friend-action-btn btn-red';
            declineBtn.textContent = 'Decline';
            declineBtn.onclick = () => removeConnection(targetUserId);

            wrapper.appendChild(acceptBtn);
            wrapper.appendChild(declineBtn);
            actionArea.appendChild(wrapper);
            return;

        } else if (data.status === 'friends') {
            const wrapper = document.createElement('div');
            wrapper.className = 'friend-actions-wrapper';

            const badge = document.createElement('span');
            badge.className = 'friend-badge';
            badge.textContent = 'Friends';

            const unfriendBtn = document.createElement('button');
            unfriendBtn.className = 'friend-action-btn btn-red';
            unfriendBtn.textContent = 'Unfriend';
            unfriendBtn.style.marginTop = '0';
            unfriendBtn.onclick = () => removeConnection(targetUserId);

            wrapper.appendChild(badge);
            wrapper.appendChild(unfriendBtn);
            actionArea.appendChild(wrapper);
            return;
        }

        actionArea.appendChild(btn);

    } catch (error) {
        console.error("Error checking friend status:", error);
    }
}

async function sendFriendRequest(targetId) {
    try {
        const res = await fetch('/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId })
        });
        if (res.ok) {
            checkFriendStatus(targetId);
        }
    } catch (err) {
        console.error(err);
    }
}

async function acceptFriendRequest(requesterId) {
    try {
        const res = await fetch('/friends/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requesterId })
        });
        if (res.ok) {
            window.location.reload(); 
        }
    } catch (err) {
        console.error(err);
    }
}

async function removeConnection(targetId) {
    if (!confirm("Are you sure?")) return;

    try {
        const res = await fetch(`/friends/${targetId}`, {
            method: 'DELETE',
        });
        if (res.ok) {
            checkFriendStatus(targetId); 
             const container = document.getElementById('friendsContainer');
             if (container && container.children.length > 0) {
                 window.location.reload();
             }
        }
    } catch (err) {
        console.error(err);
    }
}

async function removeFriendRequest(targetId) {
    // TODO: do we want to keep this sure message, same with function on top
    if (!confirm("Are you sure?")) return;

    try {
        const res = await fetch(`/friends/${targetId}`, {
            method: 'DELETE',
        });

        await fetch(`/notifications/remove-friend-request/${targetId}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            checkFriendStatus(targetId); 
            const container = document.getElementById('friendsContainer');
            if (container && container.children.length > 0) {
                window.location.reload();
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadFriends(userId) {
    const container = document.getElementById('friendsContainer');
    try {
        const res = await fetch(`/friends/list/${userId}`);
        const friends = await res.json();

        container.textContent = ''; 

        if (!friends || friends.length === 0) {
            const p = document.createElement('p');
            p.className = 'empty-msg';
            p.textContent = 'No friends added yet.';
            container.appendChild(p);
            return;
        }

        userInfo.friends = friends;

        const friendsContainer = document.createElement('div');
        friendsContainer.classList = 'friends-container';

        friends.slice(0, 8).forEach(friend => {
            const imgLink = document.createElement('a');
            imgLink.href = `/profile/${friend.username}`;
            const img = document.createElement('img');
            img.src = friend.profile_pic_url || '/images/default_profile_pic.jpg';
            img.className = 'user-profile-pic';
            img.alt = friend.username;
            img.style = 'border: 1px solid black;'

            imgLink.appendChild(img);
            friendsContainer.appendChild(imgLink);
        });
        container.appendChild(friendsContainer);

    } catch (err) { 
        console.error("Error loading friends:", err); 
    }
}

async function loadProfile() {
    const endpoint = `/users/view/${usernameParam}`
    
    try {
        const response = await fetch(endpoint);
        
        if (response.status === 401 && !usernameParam) {
            window.location.href = 'login.html';
            return;
        }

        const user = await response.json();

        document.getElementById('profileName').textContent = `${user.username}'s Profile`;

        document.getElementById('bio').textContent =
            user.bio || 'No bio written yet.';

        if (user.profile_pic_url) {
            document.getElementById('avatar').src = user.profile_pic_url;
        } else {
            document.getElementById('avatar').src = '/images/default_profile_pic.jpg';
        }

        const dateStr = user.created_at || Date.now();
        const date = new Date(dateStr);
        document.getElementById('joinDate').textContent = date.toLocaleDateString();
        

        if (user.id) {
            loadFriends(user.id);
            if (usernameParam) {
                checkFriendStatus(user.id);
            }
        }

    } catch (error) {
        console.error('Failed to load profile:', error);
        document.getElementById('username').textContent =
            'Error loading profile';
    }
}

async function loadProfileGames() {
    const endpoint = `/usergames/${usernameParam}`

    try {
        const response = await fetch(endpoint);

        if (response.status === 401 && !usernameParam) {
            window.location.href = 'login.html';
            return;
        }

        const body = await response.json();
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

        userInfo.games.push(...combined);

        let totalRating = 0;
        let gamesWithRatings = 0;
        let gamesWithHours = 0;

        for (const game of combined) {
            if (game.favorited) {
                userInfo.favoriteGames.push(game);
            }

            if (game.rating !== null) {
                totalRating += parseInt(game.rating);
                gamesWithRatings++;
            }

            if (game.hours_played !== null) {
                userInfo.hoursPlayed += game.hours_played;
                gamesWithHours++;
            }

            switch (game.status) {
                case 'completed':
                    userInfo.completedGames++;
                    break;
                case 'playing':
                    userInfo.playingGames++;
                    break;
                case 'planned':
                    userInfo.plannedGames++;
                    break;
                case 'wishlisted':
                    userInfo.wishlistedGames++;
                    break;
                case 'dropped':
                    userInfo.droppedGames++;
                    break;
                case 'on_hold':
                    userInfo.onHoldGames++;
                    break;
                default:
                    break;
            }
        }
        userInfo.averageRating = gamesWithRatings ? totalRating / gamesWithRatings : 0;
        userInfo.averageHoursPlayed = gamesWithHours ? userInfo.hoursPlayed / gamesWithHours : 0;

    } catch (error) {
       
    }
}

function createProgressDiv(progressType) {
    const div = document.createElement('div');
    div.className = `segment ${progressType}`;

    const totalGames = userInfo.games.length;
    const percentage = +(100 * (userInfo[`${progressType.replace('-h', 'H')}Games`] || 0) / totalGames).toFixed(2);

    div.style = `width: ${percentage}%`;
    return div;
}

function formatStatus(status) {
    return status.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function loadStatistics() {
    const header = document.createElement('h2');
    header.classList = 'list-header';
    header.textContent = 'Statistics';
    header.style.marginTop = '0';
    const statsWrapper = document.createElement('div');
    statsWrapper.style.display = 'flex';
    statsWrapper.style.justifyContent = 'space-between';
    statsWrapper.style.alignItems = 'center';
    statsWrapper.style.marginBottom = '8px';
    statsWrapper.style.maxWidth = '500px';

    const hoursDiv = document.createElement('div');
    const daysPlayed = +(userInfo.hoursPlayed / 24).toFixed(2);
    hoursDiv.textContent = `Hours Played: ${userInfo.hoursPlayed} (${daysPlayed} days)`;

    const avgScoreDiv = document.createElement('div');
    const avgScore = +(userInfo.averageRating || 0).toFixed(2);
    avgScoreDiv.textContent = `Average Score: ${avgScore}`;

    statsWrapper.appendChild(hoursDiv);
    statsWrapper.appendChild(avgScoreDiv);

    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'progress-bar-wrapper';

    const barDiv = document.createElement('div');
    barDiv.className = 'progress-bar';

    wrapperDiv.appendChild(barDiv);

    const statuses = ['completed', 'playing', 'planned', 'wishlisted', 'on-hold', 'dropped'];

    const leftColumn = document.createElement('div');
    const middleColumn = document.createElement('div');
    const rightColumn = document.createElement('div');
    const keyDiv = document.createElement('div');
    keyDiv.style.display = 'flex';
    keyDiv.style.gap = '40px';

    for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        const div = createProgressDiv(status);
        barDiv.appendChild(div);

        const statusKey = document.createElement('div');
        statusKey.style.display = 'flex';
        statusKey.style.alignItems = 'center';
        statusKey.style.marginTop = '4px';
    
        const colorCircle = document.createElement('div');
        colorCircle.className = status;
        colorCircle.style.width = '16px';
        colorCircle.style.height = '16px';
        colorCircle.style.marginRight = '8px';
        colorCircle.style.borderRadius = '50%';
    
        const label = document.createElement('span');
        const count = userInfo[`${status.replace('-h', 'H')}Games`] || 0;
        label.textContent = `${formatStatus(status)} (${count})`;

        statusKey.appendChild(colorCircle);
        statusKey.appendChild(label);
        if (i < 3) {
            leftColumn.appendChild(statusKey);
        } else {
            middleColumn.appendChild(statusKey);
        }
    }

    keyDiv.appendChild(leftColumn);
    keyDiv.append(middleColumn);
    keyDiv.appendChild(rightColumn);
    contentDiv.appendChild(header);
    contentDiv.appendChild(statsWrapper);
    contentDiv.appendChild(wrapperDiv);
    contentDiv.appendChild(keyDiv);
}

async function createGameList(type) {
    const carouselWrapper = document.createElement('div');
    carouselWrapper.classList = 'carousel-wrapper';

    // const gameLeft = document.createElement('button');
    // gameLeft.classList = 'scroll-btn-left';
    // gameLeft.textContent = '◀';

    // const gameRight = document.createElement('button');
    // gameRight.classList = 'scroll-btn-right';
    // gameRight.textContent = '▶';

    const carousel = document.createElement('div');
    carousel.classList = 'carousel';

    // TODO: maybe scroll?
    // carouselWrapper.appendChild(gameLeft);
    carouselWrapper.appendChild(carousel);
    // carouselWrapper.appendChild(gameRight);

    let gamesToShow;
    switch (type) {
        case 'all':
            gamesToShow = userInfo.games
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 6)
                .map(game => ({
                    id: game.game_id,
                    name: game.igdb.name,
                    coverUrl: game.igdb.coverUrl,
                    rating: game.rating,
                }));
            break;
        case 'favorites':
            gamesToShow = userInfo.favoriteGames
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 6)
                .map(game => ({
                    id: game.game_id,
                    name: game.igdb.name,
                    coverUrl: game.igdb.coverUrl,
                }));
            break;
        default:
            break;
    }

    if (gamesToShow.length === 0) {
        const div = document.createElement('div');
        div.textContent = 'No games to show...';
        contentDiv.appendChild(div);
        return;
    }

    const cards = await generateGameCards(gamesToShow);

    for (const card of cards) {
        carousel.appendChild(card);
    }

   contentDiv.appendChild(carouselWrapper);
}

async function loadGameLists() {
    const allHeader = document.createElement('div');
    const allTitle = document.createElement('h2');
    allHeader.classList = 'list-header';

    allTitle.textContent = 'Top Rated Games';
    allHeader.style.marginTop = '3';
    const allLink = document.createElement('a');
    allLink.href = `/gamelist/${usernameParam}`
    allLink.textContent = 'View All'

    allHeader.appendChild(allTitle);
    allHeader.appendChild(allLink);
    contentDiv.appendChild(allHeader);
    
    await createGameList('all');

    const favHeader = document.createElement('div');
    const favTitle = document.createElement('h2');
    favHeader.classList = 'list-header';

    favTitle.textContent = 'Favorited Games';
    favTitle.style.marginTop = '3';

    favHeader.appendChild(favTitle);
    contentDiv.appendChild(favHeader);

    await createGameList('favorites');
}

async function loadOverviewTab() {
    contentDiv.textContent = '';
    loadStatistics();
    await loadGameLists();
}

async function loadFriendsTab() {
    contentDiv.textContent = '';
    const header = document.createElement('h2');
    header.classList = 'list-header';
    header.textContent = 'Friends';
    header.style.marginTop = '0';
    contentDiv.appendChild(header);
    const friendsContainer = document.createElement('div');
    friendsContainer.classList = 'friends-container';

    if (!userInfo.friends || userInfo.friends.length === 0) {
        console.log("here")
        const p = document.createElement('p');
        p.className = 'empty-msg';
        p.textContent = 'No friends added yet.';
        contentDiv.appendChild(p);
        return;
    }

    userInfo.friends.forEach(friend => {
        const card = document.createElement('div');
        card.classList = 'friend-card';

        const friendUrl = `/profile/${friend.username}`;

        const imgLink = document.createElement('a');
        imgLink.href = friendUrl;
        const img = document.createElement('img');
        img.src = friend.profile_pic_url || '/images/default_profile_pic.jpg';
        img.className = 'user-profile-pic';
        img.alt = friend.username;
        img.style = 'margin: 5px;'

        const infoContainer = document.createElement('div');
        infoContainer.classList = 'friend-info';

        const mainContainer = document.createElement('div');
        mainContainer.style = 'margin-top: 5px;'

        const friendLink = document.createElement('a');
        friendLink.href = friendUrl;
        friendLink.textContent = friend.username;

        const friendBio = document.createElement('div');
        friendBio.textContent = friend.bio || 'No bio written yet.';
        friendBio.classList = 'friend-bio';

        mainContainer.appendChild(friendLink);
        mainContainer.appendChild(friendBio);

        const friendDate = document.createElement('div');
        const dateStr = friend.updated_at;
        const date = new Date(dateStr);
        friendDate.textContent = `Friends since ${date.toLocaleDateString()}`
        friendDate.style = 'font-size: 0.8rem; color: #999;'

        imgLink.appendChild(img);
        card.appendChild(imgLink);

        infoContainer.appendChild(mainContainer);
        infoContainer.appendChild(friendDate);

        card.append(infoContainer);
        
        friendsContainer.append(card);
    });
    contentDiv.appendChild(friendsContainer);
}

async function loadReviewsTab() {
    contentDiv.textContent = '';

    try {
        let userId = currentProfileUserId;

        if (!userId) {
            const endpoint = usernameParam ? `/users/view/${usernameParam}` : '/users/view';
            const userRes = await fetch(endpoint);

            if (!userRes.ok) {
                const p = document.createElement('p');
                p.className = 'empty-msg';
                p.textContent = 'Unable to load reviews.';
                contentDiv.appendChild(p);
                return;
            }

            const user = await userRes.json();
            userId = user.id;
            currentProfileUserId = userId;
        }

        const res = await fetch(`/users/${userId}/reviews`);
        if (!res.ok) {
            const p = document.createElement('p');
            p.className = 'empty-msg';
            p.textContent = 'Failed to load reviews.';
            contentDiv.appendChild(p);
            return;
        }

        const reviews = await res.json();

        if (!reviews || reviews.length === 0) {
            const p = document.createElement('p');
            p.className = 'empty-msg';
            p.textContent = 'No reviews yet.';
            contentDiv.appendChild(p);
            return;
        }
        const gameIds = [...new Set(reviews.map(r => r.game_id))];
        const idStr = gameIds.join(',');

        const gamesRes = await fetch(`/api/games?ids=${idStr}`);
        if (!gamesRes.ok) {
            const p = document.createElement('p');
            p.className = 'empty-msg';
            p.textContent = 'Failed to load game info for reviews.';
            contentDiv.appendChild(p);
            return;
        }

        const gamesData = await gamesRes.json();
        const games = gamesData.games || [];

        const gameMap = new Map();
        games.forEach(g => gameMap.set(g.id, g));

        const header = document.createElement('h2');
        header.classList = 'list-header';
        header.textContent = 'Reviews';
        header.style.marginTop = '0';
        contentDiv.appendChild(header);

        const list = document.createElement('div');
        list.className = 'reviews-list';
        contentDiv.appendChild(list);

        reviews.forEach((rev) => {
            const g = gameMap.get(rev.game_id);

            const card = document.createElement('div');
            card.className = 'review-card clickable-review-card';
            card.style.cursor = 'pointer';

            card.addEventListener('click', () => {
                window.location.href = `/game.html?id=${rev.game_id}`;
            });

            const topRow = document.createElement('div');
            topRow.className = 'review-header-line';

            const title = document.createElement('strong');
            title.textContent = g ? g.name : `Game ID ${rev.game_id}`;
            topRow.appendChild(title);

            const ratingSpan = document.createElement('span');
            ratingSpan.className = 'review-meta';
            const rating =
                rev.user_rating !== null && rev.user_rating !== undefined
                    ? rev.user_rating
                    : 'N/A';
            ratingSpan.textContent = ` — Rating: ${+rating}/10`;
            topRow.appendChild(ratingSpan);

            const meta = document.createElement('div');
            meta.className = 'review-meta';
            const date = new Date(rev.created_at);
            meta.textContent = date.toLocaleString();

            const textP = document.createElement('p');
            textP.textContent = rev.review_text || '';

            card.appendChild(topRow);
            card.appendChild(meta);
            card.appendChild(textP);

            list.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading reviews tab:', error);
        const p = document.createElement('p');
        p.className = 'empty-msg';
        p.textContent = 'Error loading reviews.';
        contentDiv.appendChild(p);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
    await loadProfileGames();
    await loadOverviewTab();
});

function setActive(elem) {
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    elem.classList.add('active');
}

overviewTab.addEventListener('click', async () => {
    await loadOverviewTab();
    setActive(overviewTab);
});

reviewsTab.addEventListener('click', async () => {
    await loadReviewsTab();
    setActive(reviewsTab);
});

friendsTab.addEventListener('click', async () => {
    loadFriendsTab();
    setActive(friendsTab);
});

viewAllFriends.addEventListener('click', async () => {
    loadFriendsTab();
    setActive(friendsTab);
    viewAllFriends.classList.add('visited');
});
