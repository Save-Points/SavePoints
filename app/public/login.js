let username = document.getElementById('username');
let password = document.getElementById('password');
let loginButton = document.getElementById('login');
let messageDiv = document.getElementById('message');

loginButton.addEventListener('click', () => {
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
                messageDiv.textContent = 'Success';
                window.location.href = '/';
            }
        })
        .catch((error) => {
            messageDiv.textContent = `Error: ${error}`;
        });
});
