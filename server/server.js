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

app.get('/', (req, res) => {
  res.send('⚡ Airdrop P2P Signaling Server is Running!');
});

// Map of roomId -> Map of socketId -> deviceInfo
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  let currentRoom = null;

  socket.on('join-room', ({ roomId, deviceInfo }) => {
    currentRoom = roomId;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }

    const roomPeers = rooms.get(roomId);
    
    // Send list of existing peers in room to newly connected client
    const existingPeers = Array.from(roomPeers.entries()).map(([id, info]) => ({
      id,
      deviceInfo: info
    }));
    socket.emit('room-peers', existingPeers);

    // Add new peer
    const peerData = { id: socket.id, deviceInfo: deviceInfo || 'Eszköz' };
    roomPeers.set(socket.id, peerData);

    // Notify other peers in room about new user
    socket.to(roomId).emit('user-connected', peerData);
    console.log(`👤 Client ${socket.id} joined room ${roomId} (Total: ${roomPeers.size})`);
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
      const roomPeers = rooms.get(currentRoom);
      roomPeers.delete(socket.id);
      socket.to(currentRoom).emit('user-disconnected', socket.id);

      if (roomPeers.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
