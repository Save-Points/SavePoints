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
                const profileUrl = `/profile/${body.username}`
                loginButton.classList.add('hidden');
                signupButton.classList.add('hidden');
                profileContainer.classList.remove('hidden');
                profileButton.classList.remove('hidden');
                profileButton.textContent = `${body.username} ▼`;
                profileLink.href = profileUrl;

                const img = document.createElement('img');
                img.src = body.profile_pic_url  || '/images/default_profile_pic.jpg';
                img.classList = 'auth-profile-pic';
                img.style = !body.profile_pic_url ? 'border: 1px solid black;' : '';
                
                picLink.appendChild(img);
                picLink.href = profileUrl;
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
    });

    profileButton.addEventListener('click', () => {
        userDropdown.style.display =
            userDropdown.style.display == 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!profileButton.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.style.display = 'none';
        }
    });
}

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
