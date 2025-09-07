import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
app.use(express.static("public"));

const PORT = 3000

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: 'http://localhost:3000' }
});

const MAP = { width: 4000, height: 4000 };
const CELLSIZE = 200;
const TICK = 30;

const gridCols = Math.ceil(MAP.width / CELLSIZE);
const gridRows = Math.ceil(MAP.height / CELLSIZE);

let grid = Array.from({ length: gridCols }, () =>
    Array.from({ length:gridRows }, () => [])
) 

let food = Array.from({ length: 500 }, () => ({
    x:  Math.random() * (MAP.width-10),
    y: Math.random() * (MAP.height-10),
    radius: 5 + Math.random(),
    color: `hsl(${Math.random() * 360}, 70%, 50%)`
}));

const players = new Map();


io.on('connection', (socket) => {
    const player = { 
        id: socket.id,
        x: Math.floor(Math.random() * MAP.width),
        y: Math.floor(Math.random() * MAP.height),
        radius: 15,
        speed: 4,
        input: { cursor: null }
    };
    players.set(socket.id, player)
    console.log(socket.id, "has joined the server! YAYYYY!");
    socket.emit('welcome', { id: socket.id });
    socket.on('input', (data) => { 
        const p = players.get(socket.id);
        if (p && data && typeof data == 'object') {
            p.input = data;
        }
    });
    
    
    socket.on('disconnect', () => {
        players.delete(socket.id)
        console.log(`${player} left my amazing game :(`);
    });
})
function eatPlayer() {
    for (const player of players.values()) {
        console.log(player.radius);
    }
}
function move() {
    for (const player of players.values()) {
        const input = player.input || {};
        const cursor = input.cursor;
        if (cursor && typeof cursor.x == 'number' && typeof cursor.y == 'number') {
            let dx = cursor.x - player.x;
            let dy = cursor.y - player.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                dx /= dist;
                dy /= dist;
            }
            player.x += dx * player.speed;
            player.y += dy* player.speed;
            if (dist < player.speed) {
                player.x = cursor.x;
                player.y = cursor.y;
            }            
        }
        player.x = Math.max(player.radius, Math.min(MAP.width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(MAP.height - player.radius, player.y));
    }
}


function respawnFood(n = 1) {
    for (let i = 0 ; i < n; i++) {
        const f = {
            x:  Math.random() * (MAP.width-10),
            y: Math.random() * (MAP.height-10),
            radius: 5 + Math.random(),
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        }
        food.push(f)
        const col = Math.floor(f.x / CELLSIZE);
        const row = Math.floor(f.y / CELLSIZE);
        if (col >= 0 && col < gridCols && row >= 0 && row < gridRows) {
            grid[col][row].push(f);
        }
    }
}

function spatialPartition() {
    for (let col = 0; col < gridCols; col ++) {
        for (let row = 0; row < gridRows; row++) {
            grid[col][row] = [];
        }
    }
    food.forEach((f) => {
        const col = Math.floor(f.x / CELLSIZE);
        const row = Math.floor(f.y / CELLSIZE);
        if (col >= 0 && col < gridCols && row >= 0 && row < gridRows){ grid[col][row].push(f); }
    })
}

spatialPartition();
eatPlayer()        

function checkCollision() {
    for (const player of players.values()) {
    const playerCol = Math.floor(player.x / CELLSIZE);
    const playerRow = Math.floor(player.y / CELLSIZE);

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
                            io.emit('score', { id: player.id, radius: player.radius })
                            respawnFood(1)
                        }
                    }
                }
            }
        }
    }
}

function step() {
    move();
    checkCollision();

    const snap = { 
        players: Array.from(players.values()).map(p=> ({ 
            id: p.id,
            x: p.x,
            y: p.y,
            radius: p.radius,
        })),
        foods: food
    }
    io.emit('state', snap);
}
setInterval(step, TICK);
httpServer.listen(PORT, () => console.log(`listening to ${PORT}`));
