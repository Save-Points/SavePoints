const username = document.getElementById('username');
const password = document.getElementById('password');
const loginButton = document.getElementById('login');
const messageDiv = document.getElementById('message');

function handleLogin() {
    messageDiv.textContent = '';

    fetch('/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username.value,
            password: password.value,
        }),
    })
        .then((response) => {
            if (response.status >= 400) {
                response.json().then((body) => {
                    messageDiv.textContent = body.error;
                });
            } else {
                window.location.href = '/';
            }
        })
        .catch((error) => {
            messageDiv.textContent = `Error: ${error}`;
        });
}

loginButton.addEventListener('click', handleLogin);

username.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            handleLogin();
        }
    });

password.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleLogin();
    }
});
