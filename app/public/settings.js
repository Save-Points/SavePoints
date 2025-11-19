async function loadSettings() {
    try {
        const response = await fetch('/users/current');

        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        const user = await response.json();

        document.getElementById('username').value = user.username;
        document.getElementById('picUrl').value = user.profile_pic_url || '';
        document.getElementById('bio').value = user.bio || '';
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

document.getElementById('saveBtn').addEventListener('click', async () => {
    const saveBtn = document.getElementById('saveBtn');
    const msg = document.getElementById('msg');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    msg.textContent = '';

    const updates = {
        profile_pic_url: document.getElementById('picUrl').value,
        bio: document.getElementById('bio').value,
    };

    try {
        const response = await fetch('/users/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (response.ok) {
            msg.textContent = 'Settings updated successfully!';
            msg.style.color = 'green';
        } else {
            msg.textContent = 'Failed to update settings.';
            msg.style.color = 'red';
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        msg.textContent = 'An error occurred.';
        msg.style.color = 'red';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
});

document.addEventListener('DOMContentLoaded', loadSettings);
