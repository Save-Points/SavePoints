export async function loadHeader() {
    try {
        const response = await fetch('/header.html');

        const text = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const target = document.querySelector('#header');

        target.replaceChildren(...doc.body.childNodes);
        await new Promise(requestAnimationFrame);
        await setupLogin();
        await setupSearch();
        setupIcon();
    } catch (error) {
        console.log("LOAD HTML FAILED", error);
    }
}

async function setupLogin() {
    const logoutButton = document.getElementById('logout');
    const loginButton = document.getElementById('login');
    const signupButton = document.getElementById('signup');
    const profileButton = document.getElementById('profile');
    const profileLink = document.getElementById('profileLink');
    const picLink = document.getElementById('picLink');
    const profileContainer = document.getElementById('profileContainer');
    const gameListLink = document.getElementById('gameListLink');

    const userDropdown = document.getElementById('userDropdown');

    await fetch('/users/current', {
        credentials: 'include',
    }).then((response) => {
        if (response.status >= 400) {
            loginButton.classList.remove('hidden');
            signupButton.classList.remove('hidden');
            profileButton.classList.add('hidden');
            profileContainer.classList.add('hidden');
        } else {
            response.json().then((body) => {
                const profileUrl = `/profile/${body.username}`;
                loginButton.classList.add('hidden');
                signupButton.classList.add('hidden');
                profileContainer.classList.remove('hidden');
                profileButton.classList.remove('hidden');
                profileButton.textContent = `${body.username} ▼`;
                profileLink.href = profileUrl;
                gameListLink.href = `/gamelist/${body.username}`;

                const img = document.createElement('img');
                img.src = body.profile_pic_url  || '/images/default_profile_pic.jpg';
                img.classList = 'auth-profile-pic';
                img.style = !body.profile_pic_url ? 'border: 1px solid black;' : '';
                
                picLink.appendChild(img);
                picLink.href = profileUrl;

                initNotifications();
            }); 
        }
    })
    .catch((error) => {
        console.log(`Status check failed: ${error}`);
    });

    logoutButton.addEventListener('click', async () => {
        await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include',
        })
            .then((response) => {
                if (response.status == 200) {
                    console.log('Logout success');
                    location.reload();
                } else {
                    console.log(`Logout failed ${response.status}`);
                }
            })
            .catch((error) => {
                console.log(`Logout failed: ${error}`);
            });
        localStorage.clear();
    });

    profileButton.addEventListener('click', () => {
        userDropdown.style.display =
            userDropdown.style.display == 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (profileButton && userDropdown) {
            if (!profileButton.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.style.display = 'none';
            }
        }
        const notifBtn = document.getElementById('notifBtn');
        const notifDropdown = document.getElementById('notifDropdown');
        if (notifBtn && notifDropdown && notifDropdown.style.display === 'block') {
             if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
                notifDropdown.style.display = 'none';
            }
        }
    });
}

function initNotifications() {
    const btn = document.getElementById('notifBtn');
    const badge = document.getElementById('notifBadge');
    const dropdown = document.getElementById('notifDropdown');
    const list = document.getElementById('notifList');

    let viewAllContainer = dropdown.querySelector('.notif-footer');
    if (!viewAllContainer) {
        viewAllContainer = document.createElement('div');
        viewAllContainer.className = 'notif-footer';
        viewAllContainer.style.cssText = 'padding: 10px; text-align: center; background: #f8f9fa; border-top: 1px solid #eee;';
        
        const viewAllLink = document.createElement('a');
        viewAllLink.href = '/my-notifications';
        viewAllLink.textContent = 'View All';
        viewAllLink.style.cssText = 'text-decoration: none; color: #007bff; font-size: 0.9rem; font-weight: bold;';
        
        viewAllContainer.appendChild(viewAllLink);
        dropdown.appendChild(viewAllContainer);
    }

    const markAll = document.getElementById('markAll');

    markAll.addEventListener('click', async () => {
        try {
            await fetch('/notifications/mark-all-read', { method: 'POST' });
            badge.style.display = 'none'; 
            fetchAndRender();
        } catch(err) { console.error(err); }
    });

    if (!btn) {
        return;
    }

    const fetchAndRender = () => {
        fetch('/notifications')
            .then(r => r.json())
            .then(data => {
                const unread = data.unreadCount;
                
                if (unread > 0) {
                    badge.textContent = unread;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }

                if (data.rows.length === 0) {
                    list.innerHTML = '<div style="padding:15px; color:#777; text-align:center;">No notifications</div>';
                } else {
                    list.innerHTML = data.rows.map(n => `
                        <div class="hover-text ${n.is_read ? '' : 'header-unread-notif'}" style="padding: 10px; border-bottom: 1px solid #eee; cursor:pointer;"
                             onclick="handleNotifClick(${n.id}, '${n.link || ''}', this)">
                            <p style="margin:0; font-size:0.9rem;">${n.message}</p>
                            <small style="color:#999; font-size:0.75rem;">${new Date(n.created_at).toLocaleDateString()}</small>
                        </div>
                    `).join('');
                }
            })
            .catch(err => console.error("Notification Error:", err));
    };

    fetchAndRender();

    btn.onclick = async (e) => {
        e.stopPropagation();
        const isClosed = dropdown.style.display === 'none' || dropdown.style.display === '';
        
        if (isClosed) {
            dropdown.style.display = 'block';
            const userDropdown = document.getElementById('userDropdown');
            if(userDropdown) userDropdown.style.display = 'none';
        } else {
            dropdown.style.display = 'none';
        }
    };
}

window.handleNotifClick = async (id, link, element) => {
    try {
        await fetch(`/notifications/read/${id}`, { method: 'POST' });
        element.style.background = '#fff'; 
        element.classList.remove('header-unread-notif');
        
        const badge = document.getElementById('notifBadge');
        let count = parseInt(badge.textContent) || 0;
        if (count > 0) {
            count--;
            badge.textContent = count;
            if (count === 0) badge.style.display = 'none';
        }

        if (link && link !== '#' && link !== 'null') {
            window.location.href = link;
        }
    } catch(e) { console.error(e); }
};

async function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchPicker = document.getElementById('searchType');

    searchPicker.addEventListener('change', () => {
        const searchType = searchPicker.value;

        switch (searchType) {
            case 'games':
                searchInput.placeholder = 'Search for Games...';
                break;
            case 'users':
                searchInput.placeholder = 'Search for Users...';
                break;
            default:
                break;
        }
    });

    function search() {
        const searchTerm = searchInput.value;
        const searchType = searchPicker.value;
        window.location.href = `/search?type=${searchType}&term=${searchTerm}&page=1`
    }

    searchButton.addEventListener('click', search);

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            search();
        }
    });

    searchPicker.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            search();
        }
    });
}

function setupIcon() {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/images/favicon.ico';
    link.type = 'image/x-icon';
    document.head.appendChild(link);
}
