import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.serverUrl = localStorage.getItem('airdrop_signaling_url') || 'https://airdrop-signaling.onrender.com';
    this.callbacks = {};
  }

  setServerUrl(url) {
    this.serverUrl = url;
    localStorage.setItem('airdrop_signaling_url', url);
    if (this.socket) {
      this.disconnect();
      this.connect();
    }
  }

  getServerUrl() {
    return this.serverUrl;
  }

  connect() {
    if (this.socket && this.socket.connected) return;

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Socket.io connected:', this.socket.id);
      if (this.callbacks.onConnect) this.callbacks.onConnect(this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.io disconnected:', reason);
      if (this.callbacks.onDisconnect) this.callbacks.onDisconnect(reason);
    });

    this.socket.on('user-connected', (peerId) => {
      console.log('👤 Peer connected:', peerId);
      if (this.callbacks.onPeerJoined) this.callbacks.onPeerJoined(peerId);
    });

    this.socket.on('user-disconnected', (peerId) => {
      console.log('👋 Peer disconnected:', peerId);
      if (this.callbacks.onPeerLeft) this.callbacks.onPeerLeft(peerId);
    });

    this.socket.on('signal', (data) => {
      if (this.callbacks.onSignal) this.callbacks.onSignal(data);
    });
  }

  joinRoom(roomId) {
    if (!this.socket) this.connect();
    this.socket.emit('join-room', roomId);
  }

  sendSignal(to, signal) {
    if (this.socket) {
      this.socket.emit('signal', { to, signal });
    }
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
