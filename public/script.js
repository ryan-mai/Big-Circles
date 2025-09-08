document.addEventListener('DOMContentLoaded', () => {
    const username = document.getElementById('user-form');
    username.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log("SUBMITTED")
        const user = document.getElementById('user-input').value;
        sessionStorage.setItem('username', user)
        window.location.href = './game.html';
    });
})