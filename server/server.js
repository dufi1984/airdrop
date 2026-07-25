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

// Single global automatic discovery room
const GLOBAL_ROOM = 'default-airdrop-room';
const onlinePeers = new Map(); // socketId -> deviceInfo

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on('join-network', ({ deviceInfo }) => {
    socket.join(GLOBAL_ROOM);
    onlinePeers.set(socket.id, deviceInfo || 'Eszköz');

    // Broadcast updated online devices list to all connected clients
    const peerList = Array.from(onlinePeers.entries()).map(([id, info]) => ({
      id,
      deviceInfo: info
    }));

    io.to(GLOBAL_ROOM).emit('online-devices-updated', peerList);
    console.log(`👤 Client ${socket.id} (${deviceInfo}) joined network. Total online: ${onlinePeers.size}`);
  });

  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', {
      from: socket.id,
      signal
    });
  });

  socket.on('disconnect', () => {
    console.log(`👋 Client disconnected: ${socket.id}`);
    onlinePeers.delete(socket.id);

    const peerList = Array.from(onlinePeers.entries()).map(([id, info]) => ({
      id,
      deviceInfo: info
    }));

    io.to(GLOBAL_ROOM).emit('online-devices-updated', peerList);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
