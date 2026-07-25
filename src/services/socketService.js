import { io } from 'socket.io-client';
import { detectDeviceName } from '../utils/formatters';

class SocketService {
  constructor() {
    this.socket = null;
    this.serverUrl = localStorage.getItem('airdrop_signaling_url') || 'https://airdrop-signaling.onrender.com';
    this.callbacks = {};
    this.myId = null;
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
      this.myId = this.socket.id;
      console.log('⚡ Socket.io connected:', this.socket.id);
      
      // Auto-join global discovery network
      const deviceInfo = detectDeviceName();
      this.socket.emit('join-network', { deviceInfo });

      if (this.callbacks.onConnect) this.callbacks.onConnect(this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.io disconnected:', reason);
      if (this.callbacks.onDisconnect) this.callbacks.onDisconnect(reason);
    });

    this.socket.on('online-devices-updated', (peerList) => {
      console.log('🌐 Online devices updated:', peerList);
      if (this.callbacks.onOnlineDevicesUpdated) {
        this.callbacks.onOnlineDevicesUpdated(peerList);
      }
    });

    this.socket.on('signal', (data) => {
      if (this.callbacks.onSignal) this.callbacks.onSignal(data);
    });
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
