const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Health check endpoint for Render.com / Glitch keep-alive
app.get('/', (req, res) => {
  res.send('⚡ Airdrop P2P Signaling Server is Running!');
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  let currentRoom = null;

  socket.on('join-room', (roomId) => {
    currentRoom = roomId;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const roomClients = rooms.get(roomId);
    
    // Notify other peers in room about new user
    socket.to(roomId).emit('user-connected', socket.id);
    
    roomClients.add(socket.id);
    console.log(`👤 Client ${socket.id} joined room ${roomId} (Total: ${roomClients.size})`);
  });

  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', {
      from: socket.id,
      signal
    });
  });

  socket.on('disconnect', () => {
    console.log(`👋 Client disconnected: ${socket.id}`);
    if (currentRoom && rooms.has(currentRoom)) {
      const roomClients = rooms.get(currentRoom);
      roomClients.delete(socket.id);
      socket.to(currentRoom).emit('user-disconnected', socket.id);

      if (roomClients.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
