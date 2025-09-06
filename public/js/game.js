const socket = io('http://localhost:3000', {
    auth: {
        secret: "Shhh"
    },
    query: {
        meaningOfLife: 42,
    }
})
socket.on('welcome', data=>{
console.log(data)
socket.emit('thanks', 'skibdi gyatttt')
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
                                console.log(player.radius, player.speed)
                                socket.emit('score', player.radius)
                                respawnFood(1)
                            }
                        }
                    }
                }
            }
        }
        console.log(player)
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

            // console.log(`Cursor: (${lastCursorPos.x.toFixed(2)}, ${lastCursorPos.y.toFixed(2)}`)
            // console.log(`Player: (${player.x}, ${player.y})`)
            // cursor = true;
        })

        function getCursorPos() {
            return lastCursorPos;
        }

        function updatePos() {
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

            food.forEach(f => {
                ctx.fillstyle = f.color;
                ctx.beginPath();
                ctx.arc(f.x + offsetX, f.y + offsetY, f.radius, 0, Math.PI * 2);
                ctx.fill();
            })

            ctx.fillStyle = "lime";
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, player.radius, 0, Math.PI*2)
            ctx.fill();
        }

        // function eat() {
        //     food.forEach((food) => {
        //         x1 = food.x;
        //         y1 = food.y;
        //         x2 = player.x;
        //         y2 = player.y;

        //         d = Math.SQRT2(Math.pow((x2-x1), 2)+Math.pow((y2-y1), 2));
        //         if (player.radius > (food.radius + d)){
        //             console.log('Ate food!')
        //         }
        //     });
        // }

        function gameLoop() {
            updatePos();
            checkCollision();
            draw();
            requestAnimationFrame(gameLoop);
        }

        gameLoop();
    } else {
        alert('The game doesn\'t support your outdated browser :(');
    }

});