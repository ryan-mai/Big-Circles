const socket = io('http://localhost:3000', {
    auth: {
        secret: "Shhh"
    },
    query: {
        meaningOfLife: 42,
    }
})
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
        let player = { x: Math.floor(Math.random() * 2000), y: Math.floor(Math.random() * 2000), radius: 15, speed: 4};
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

    socket.on('welcome', data=>{
    console.log(data)
    })
    socket.on('score', (data) => {
        console.log(data)
    })
    socket.on('state', (state) => {
        window.serverState = state;
        const myServer = state.players.find(p => p.id == socket.id);
        if (myServer) {
            player.x = myServer.x;
            player.y = myServer.y
            player.radius = myServer.radius;
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

        function respawnFood(n = 1) {
            for (let i = 0 ; i < n; i++) {
                const f = {
                    x:  Math.random() * (map.width-10),
                    y: Math.random() * (map.height-10),
                    radius: 5 + Math.random(),
                    color: `hsl(${Math.random() * 360}, 70%, 50%)`
                }
                food.push(f)
                const col = Math.floor(f.x / cellSize);
                const row = Math.floor(f.y / cellSize);
                if (col >= 0 && col < gridCols && row >= 0 && row < gridRows) {
                    grid[col][row].push(f);
                }
            }
        }

        function checkCollision() {
            const playerCol = Math.floor(player.x / cellSize);
            const playerRow = Math.floor(player.y / cellSize);

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const col = playerCol + dx;
                    const row = playerRow + dy;
                    if (col >= 0 && col < gridCols && row >= 0 && row < gridRows) {
                        const cell = grid[col][row];
                        for (let j = cell.length - 1; j >= 0; j --){
                            const f = cell[j]
                            const dist = Math.hypot(player.x - f.x, player.y -f.y);
                            if (player.radius >= f.radius + dist) {
                                const index = food.indexOf(f);
                                if (index > -1) {
                                    food.splice(index, 1);
                                    cell.splice(j, 1);
                                } 
                                
                                const k = 30;
                                const minFactor = 0.05;
                                const maxFactor = 0.1;
                                const growthFactor = Math.max(minFactor, Math.min(maxFactor, k/ player.radius));
                                player.radius += f.radius * growthFactor
                                player.speed -= growthFactor * 0.01
                                respawnFood(1)
                            }
                        }
                    }
                }
            }
        }
        let lastCursorPos = null;
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect(); 
            const canvasX = (e.clientX - rect.left);
            const canvasY = (e.clientY - rect.top);
            const globalX = player.x + (canvasX - canvas.width / 2);
            const globalY = player.y + (canvasY - canvas.height / 2);
            lastCursorPos = {
                x: Math.max(0, Math.min(map.width, globalX)),
                y: Math.max(0, Math.min(map.height, globalY))
            }
        })

        function getCursorPos() {
            return lastCursorPos;
        }

        function updatePos() {
            socket.emit('input', { cursor: lastCursorPos })
            const cursorPos = getCursorPos();
            if (cursorPos) {
                let dx = cursorPos.x - player.x;
                let dy = cursorPos.y - player.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 0) {
                    dx /= dist;
                    dy /= dist;
                }
                player.x += dx * player.speed;
                player.y += dy* player.speed;
                if (dist < player.speed) {
                    player.x = cursorPos.x;
                    player.y = cursorPos.y;
                }            
            }
            player.x = Math.max(player.radius, Math.min(map.width - player.radius, player.x));
            player.y = Math.max(player.radius, Math.min(map.height - player.radius, player.y));
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
        }

        function gameLoop() {
            updatePos();
            checkCollision();
            draw();
            requestAnimationFrame(gameLoop);
        }

        gameLoop();
    } else {
        alert('The game doesn\'t support your outdated browser :( what are you using dawg');
    }

});