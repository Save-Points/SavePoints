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
            btn.onclick = () => removeConnection(targetUserId);

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

        friends.forEach(friend => {
            const div = document.createElement('div');
            div.className = 'user-card';
            div.onclick = () => window.location.href = `/profile/${friend.username}`;

            const img = document.createElement('img');
            img.src = friend.profile_pic_url || '/images/default_profile_pic.jpg';
            img.className = 'user-profile-pic';
            img.alt = friend.username;

            const strong = document.createElement('strong');
            strong.textContent = friend.username;
            strong.className = 'username';

            div.appendChild(img);
            div.appendChild(strong);
            container.appendChild(div);
        });

    } catch (err) { 
        console.error("Error loading friends:", err); 
    }
}

async function loadProfile() {
    const pathParts = window.location.pathname.split('/'); 
    let usernameParam = pathParts[2];

    let endpoint = '/users/current';
    if (usernameParam) {
        endpoint = `/users/view/${usernameParam}`;
    }
    
    try {
        const response = await fetch(endpoint);
        
        if (response.status === 401 && !usernameParam) {
            window.location.href = 'login.html';
            return;
        }

        if (response.status === 404) {
            document.getElementById('username').textContent = "User not found";
            document.getElementById('bio').style.display = 'none';
            
            const settingsBtn = document.querySelector('a[href="/settings.html"]');
            if(settingsBtn) settingsBtn.classList.add('hidden');
            return;
        }

        const user = await response.json();

        // Check if its the user themselves (hides settings button etc.)
        try {
            const meRes = await fetch('/users/current');
            const settingsBtn = document.querySelector('a[href="/settings.html"]');

            if (meRes.ok) {
                const me = await meRes.json();
                if (me.id !== user.id) {
                    if(settingsBtn) {
                        settingsBtn.classList.add('hidden');
                    }
                } else {
                    if(settingsBtn) {
                        settingsBtn.classList.remove('hidden');
                    }
                }
            } else {
                 if(settingsBtn) {
                    settingsBtn.classList.add('hidden');
                }
            }
        } catch (e) { 
            console.error("Auth check failed", e); 
        }

        document.getElementById('username').textContent = user.username;
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
        
        document.getElementById('gameView').href = `/gamelist/${user.username}`

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

// TODO: Functions for Lists & Favorites

document.addEventListener('DOMContentLoaded', loadProfile);
