async function loadProfile() {
    // TODO: Refactor this code to be more dynamic
    // Check URL for a username and fetch that user's data. This allows use for one page for all profiles
    try {
        const response = await fetch('/users/current');

        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        const user = await response.json();

        document.getElementById('username').textContent = user.username;

        document.getElementById('bio').textContent =
            user.bio || 'No bio written yet.';

        if (user.profile_pic_url) {
            document.getElementById('avatar').src = user.profile_pic_url;
        }

        const dateStr = user.created_at || Date.now();
        const date = new Date(dateStr);
        document.getElementById('joinDate').textContent =
            date.toLocaleDateString();

        // TODO: Call functions to load dynamic content
    } catch (error) {
        console.error('Failed to load profile:', error);
        document.getElementById('username').textContent =
            'Error loading profile';
    }
}

// TODO: Functions for Lists & Favorites

document.addEventListener('DOMContentLoaded', loadProfile);
