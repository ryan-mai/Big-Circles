import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
app.use(express.static("public"));

const PORT = 3000
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: [
        'http://localhost:3000/'
    ]
});

io.on('connect', (socket) => {
    // console.log(socket.handshake)
  console.log(socket.id, "has joined the server!");
  // event name
  // socket.emit only emits to this socket
  socket.emit('welcome', 'big gyatt') // push the event, message/data
  // io.emit sends to all sockets connected to server because io is the Server
  io.emit('helloAll', socket.id)
  socket.on('disconnect', () => console.log('user has disconnected'));
  socket.on('thanks', (data) => {
    console.log('feedback from client:',data)
socket.on('chatlog', (data) => {
    console.log(data)
    const msg = `(${socket.id}) - ${data}`
    io.emit('recieveMsg', msg)
})
socket.on('nameChange', (data) => {
    console.log(data)
    io.emit('changeName', data)
})
socket.on('score', (data) => {
    console.log(data)
})
})

});


httpServer.listen(PORT, () => console.log(`listening to ${PORT}`));
