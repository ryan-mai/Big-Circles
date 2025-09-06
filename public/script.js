const socket = io('http://localhost:3000', {
    auth: {
        secret: "Shhh"
    },
    query: {
        meaningOfLife: 42,
    }
})

// Server has:
    // on method
    // emit method

socket.on('welcome', data=>{
    console.log(data)
    socket.emit('thanks', 'skibdi gyatttt')
})

socket.on('helloAll', (data) => {
    console.log(data)
})

document.addEventListener('DOMContentLoaded', () => {
    const username = document.getElementById('user-form');
    username.addEventListener('submit', (e) => {
        const user = document.getElementById('username-input').value;
        document.addEventListener('username-input').value = '';
        socket.emit('nameChange', user);
    });

    const form = document.getElementById('messsages-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault()
        const newMsg = document.getElementById('user-message').value;
        document.getElementById('user-message').value = '';
        socket.emit('chatlog', newMsg);
    });
})

socket.on('recieveMsg', (data) => {
    const msg = document.createElement('li');
    msg.innerText = data;
    msg.className='list-group-item';
    const chatlogs = document.getElementById('messages')
    chatlogs.appendChild(msg);
})

socket.on('changeName', (data) => {
    const user = document.createElement('h1');
    user.innerText = data;
    console.log(user);
    document.body.appendChild(user);
})