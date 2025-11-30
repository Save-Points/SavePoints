const email = document.getElementById('email');
const username = document.getElementById('username');
const password = document.getElementById('password');
const birthday = document.getElementById('birthday');
const birthmonth = document.getElementById('birthmonth');
const birthyear = document.getElementById('birthyear');

const emailError = document.getElementById('emailError');
const usernameError = document.getElementById('usernameError');
const passwordError = document.getElementById('passwordError');
const birthdateError = document.getElementById('birthdateError');

const birthdateWrapper = document.getElementById('birthdateWrapper');

const signupButton = document.getElementById('signup');
const messageDiv = document.getElementById('message');

function addPlaceholderOption(select, textContent) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = textContent;
    placeholder.selected = true;
    placeholder.disabled = true;
    select.append(placeholder);
}

document.addEventListener('DOMContentLoaded', () => {
    addPlaceholderOption(birthday, 'Day');
    addPlaceholderOption(birthmonth, 'Month');
    addPlaceholderOption(birthyear, 'Year');

    for (let i = 1; i <= 31; i++) {
        const dayOption = document.createElement('option');
        dayOption.value = i;
        dayOption.textContent = i;
        birthday.append(dayOption);
    }

    for (let j = 1; j <= 12; j++) {
        const monthOption = document.createElement('option');
        monthOption.value = j;
        monthOption.textContent = j;
        birthmonth.append(monthOption);
    }

    const currentYear = new Date().getFullYear();

    for (let k = currentYear; k > 1899; k--) {
        const yearOption = document.createElement('option');
        yearOption.value = k;
        yearOption.textContent = k;
        birthyear.append(yearOption);
    }
});

function resetErrorMessages() {
    username.style.outline = '';
    usernameError.textContent = '';

    email.style.outline = '';
    emailError.textContent = '';

    password.style.outline = '';
    passwordError.textContent = '';

    birthdateWrapper.style.outline = '';
    birthdateError.textContent = '';
}

function handleSignUp() {
    resetErrorMessages();

    let hasError = false;

    if (!email.value.trim()) {
        email.style.outline = '1px solid red';
        emailError.textContent = 'Email is required.';
        hasError = true;
    }

    if (!username.value.trim()) {
        username.style.outline = '1px solid red';
        usernameError.textContent = 'Username is required.';
        hasError = true;
    }

    if (!password.value.trim()) {
        password.style.outline = '1px solid red';
        passwordError.textContent = 'Password is required.';
        hasError = true;
    }

    if (!birthday.value || !birthmonth.value || !birthyear.value) {
        birthdateWrapper.style.outline = '1px solid red';
        birthdateError.textContent = 'Valid birthdate is required.';
        hasError = true;
    }

    if (hasError) {
        return;
    }

    fetch('/auth/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email.value,
            username: username.value,
            password: password.value,
            birthday: birthday.value,
            birthmonth: birthmonth.value,
            birthyear: birthyear.value,
        }),
    })
        .then((response) => {
            if (response.status == 201) {
                window.location.href = '/';
            } else {
                response.json().then((body) => {
                    if (body.fields) {
                        if (body.fields.email) {
                            email.style.outline = '1px solid red';
                            emailError.textContent = body.fields.email;
                        }

                        if (body.fields.username) {
                            username.style.outline = '1px solid red';
                            usernameError.textContent = body.fields.username;
                        }

                        if (body.fields.password) {
                            password.style.outline = '1px solid red';
                            passwordError.textContent = body.fields.password;
                        }

                        if (body.fields.birthdate) {
                            birthdateWrapper.style.outline = '1px solid red';
                            birthdateError.textContent = body.fields.birthdate;
                        }
                    }
                });
            }
        })
        .catch((error) => {
            messageDiv.textContent = `Error: ${error}`;
        });
}

signupButton.addEventListener('click', handleSignUp);

function createOnEnter(element) {
    element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            handleSignUp();
        }
    })
}

createOnEnter(email);
createOnEnter(username);
createOnEnter(password);
createOnEnter(birthday);
createOnEnter(birthmonth);
createOnEnter(birthyear);
