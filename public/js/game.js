const socket = io()

let sentName = false;
function sendName() {
  if (sentName) return;
  const name = sessionStorage.getItem('username') || 'Unnamed cell';
  socket.emit('addPlayer', name, (ack) => {
    if (ack && ack.ok) sentName = true;
  });
}

socket.on('connect', () => {
  sendName();
});
document.addEventListener('DOMContentLoaded', (e) => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');

    if (ctx) {
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        ctx.font = "50px Arial";
        ctx.fillText("Hello World",10,80);
        const map = { width: 4000, height: 4000 };
        let player = { 
            x: Math.floor(Math.random() * 2000), 
            y: Math.floor(Math.random() * 2000), 
            radius: 15, 
            speed: 4, 
            name: sessionStorage.getItem('username') || 'Unnamed Cell'};
        let food = Array.from({ length: 500 }, () => ({
            x:  Math.random() * (map.width-10),
            y: Math.random() * (map.height-10),
            radius: 5 + Math.random(),
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        }));
        const cellSize = 100;
        const gridCols = Math.ceil(map.width / cellSize);
        const gridRows = Math.ceil(map.height / cellSize);
        
        let grid = Array.from({ length: gridCols }, () =>
            Array.from({ length:gridRows }, () => [])
        ) 
        let leaderboard = [];

    socket.on('welcome', data=>{
    console.log(data)
    })
    socket.on('score', (data) => {
        console.log(data)
    })
    socket.on('state', (state) => {
        window.serverState = state;
        leaderboard = state.leaderboard || [];
        const myServer = state.players.find(p => p.id == socket.id);
        if (myServer) {
            player.x = myServer.x;
            player.y = myServer.y
            player.radius = myServer.radius;
            player.name = myServer.name || sessionStorage.getItem('username') || 'Unnamed Cell';
        }
    })


    socket.on('playerEaten', data => {
        console.log(data);
    })
    socket.on('playerRespawn', data => {
        console.log(data);
    })        
        function spatialPartition() {
            for (let col = 0; col < gridCols; col ++) {
                for (let row = 0; row < gridRows; row++) {
                    grid[col][row] = [];
                }
            }
            food.forEach((f) => {
                const col = Math.floor(f.x / cellSize);
                const row = Math.floor(f.y / cellSize);
                grid[col][row].push(f);
            })
        }
        spatialPartition();

        let lastCursorPos = null;
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect(); 
            const canvasX = (e.clientX - rect.left);
            const canvasY = (e.clientY - rect.top);
            lastCursorPos = { x: canvasX, y: canvasY };
        })

        function updatePos() {
            if (!lastCursorPos) return;
            const globalX = player.x + (lastCursorPos.x - canvas.width / 2);
            const globalY = player.y + (lastCursorPos.y - canvas.height / 2);
            const cursor = {
                x: Math.max(0, Math.min(map.width, globalX)),
                y: Math.max(0, Math.min(map.height, globalY))
            };
            socket.emit('input', { cursor });
        }
        function roundedRect(ctx, x, y, width, height, radius, color) {
            ctx.beginPath();
            ctx.moveTo(x, y + radius);
            ctx.arcTo(x, y + height, x + radius, y + height, radius);
            ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
            ctx.arcTo(x + width, y, x + width - radius, y, radius);
            ctx.arcTo(x, y, x, y + radius, radius);
            ctx.fillStyle = color;
            ctx.fill();
        }
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let offsetX = canvas.width / 2 - player.x;
            let offsetY = canvas.height / 2 - player.y;
            const shapeOrder = [];

            const foods = (window.serverState && window.serverState.foods) || [];
            foods.forEach(f => {
                if (!f) return;
                ctx.fillStyle = f.color;
                ctx.beginPath();
                ctx.arc(f.x + offsetX, f.y + offsetY, f.radius, 0, Math.PI * 2);
                ctx.fill();
            })

            const others = (window.serverState && window.serverState.players) || [];
            others.forEach(p => {
                if (p.id == socket.id) return;
                shapeOrder.push({
                    type: 'player',
                    x: p.x,
                    y: p.y,
                    radius: p.radius,
                    color: p.color || 'orange',
                    z:p.radius                    
                })
            })
            shapeOrder.push({
                type: 'player',
                x: player.x,
                y: player.y,
                radius: player.radius,
                color: 'lime',
                z: player.radius                    
            })
            shapeOrder.sort((a, b) => a.z - b.z)
            shapeOrder.forEach(item => {
                ctx.fillStyle = item.color;
                ctx.beginPath();
                ctx.arc(item.x + offsetX, item.y + offsetY, item.radius, 0, Math.PI * 2)
                ctx.fill();
            })
        
            roundedRect(ctx, 75, canvas.height - 90, 200, 45,20, 'rgba(128, 128, 128, 0.5)');
            ctx.fillStyle = 'white';
            ctx.font = '18px Montserrat';
            ctx.fillText(`Player Score: ${Math.round(player.radius-14)}`, 95, canvas.height - 61);
            
            roundedRect(ctx, canvas.width - 325, 25, 300, 400,10, 'rgba(128, 128, 128, 0.5)');
            ctx.fillStyle = 'white';
            ctx.font = '24px Montserrat';
            ctx.fillText('Leaderboard', canvas.width - 250, 70);
            ctx.fillStyle = 'white';
            ctx.font = '12px Montserrat';
            ctx.fillText(player.name, canvas.width / 2 - 20, canvas.height / 2 + 3);
            ctx.fillStyle = 'white';
            ctx.font = '16px Montserrat';
            leaderboard.forEach(( k, i) => {
                ctx.fillText(`${i + 1}. ${k.name} - ${k.score}`, canvas.width - 300, 105 + i * 32);
            })
        }

        function gameLoop() {
            updatePos();
            draw();
            requestAnimationFrame(gameLoop);
        }

        gameLoop();
    } else {
        alert('The game doesn\'t support your outdated browser :( what are you using dawg');
    }

});