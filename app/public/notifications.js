async function loadAllNotifications() {
    const container = document.getElementById('fullNotifList');
    
    try {
        const res = await fetch('/notifications?limit=all');
        if (res.status === 401) {
            window.location.href = '/login.html';
            return;
        }
        
        const data = await res.json();

        if (data.rows.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #777;">You have no notifications.</p>';
            return;
        }

        container.innerHTML = '';
        data.rows.forEach(n => {
            const div = document.createElement('div');
            div.className = `notif-item ${n.is_read ? '' : 'unread'}`;
            
            div.innerHTML = `
                <div style="font-size: 1rem;">${n.message}</div>
                <span class="notif-date">${new Date(n.created_at).toLocaleString()}</span>
            `;

            div.onclick = async () => {
                try {
                    await fetch(`/notifications/read/${n.id}`, { method: 'POST' });
                    if (n.link) window.location.href = n.link;
                    else div.classList.remove('unread');
                } catch(e) { console.error(e); }
            };

            container.appendChild(div);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="error-message">Failed to load notifications.</p>';
    }
}

const markAll = document.getElementById('markAll');

markAll.addEventListener('click', async () => {
    try {
        await fetch('/notifications/mark-all-read', { method: 'POST' });
        window.location.reload();
    } catch(err) { console.error(err); }
});

document.addEventListener('DOMContentLoaded', loadAllNotifications);