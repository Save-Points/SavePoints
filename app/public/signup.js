let email = document.getElementById('email');
let username = document.getElementById('username');
let password = document.getElementById('password');
let signupButton = document.getElementById('signup');
let messageDiv = document.getElementById('message');

signupButton.addEventListener('click', () => {
    fetch('/auth/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email.value,
            username: username.value,
            password: password.value,
        }),
    })
        .then((body) => {
            if (body.status == 200) {
                messageDiv.textContent = 'Success';
                window.location.href = '/';
            } else {
                messageDiv.textContent = 'Bad request';
            }
        })
        .catch((error) => {
            messageDiv.textContent = `Error: ${error}`;
        });
});
