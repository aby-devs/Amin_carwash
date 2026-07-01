const { Server } = require('socket.io');
const config = require('../websocket-config/websocket.config');

class SocketHandler {
  constructor(server) {
    this.io = new Server(server, {
      cors: config.cors,
      pingTimeout: config.connection.pingTimeout,
      pingInterval: config.connection.pingInterval,
      transports: config.connection.transports
    });
    
    this.config = config;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      if (this.config.logging.enabled) {
        console.log('Client connected:', socket.id);
      }
      
      // Join a room for real-time updates
      socket.on('join-room', (room) => {
        socket.join(room);
        if (this.config.logging.enabled) {
          console.log(`Client ${socket.id} joined room: ${room}`);
        }
      });

      socket.on('leave-room', (room) => {
        socket.leave(room);
        if (this.config.logging.enabled) {
          console.log(`Client ${socket.id} left room: ${room}`);
        }
      });
      
      socket.on('disconnect', () => {
        if (this.config.logging.enabled) {
          console.log('Client disconnected:', socket.id);
        }
      });

      // Handle custom events
      socket.on(this.config.events.PING, () => {
        socket.emit(this.config.events.PONG);
      });

      // Send connection status
      socket.emit(this.config.events.CONNECTION_STATUS, {
        connected: true,
        clientId: socket.id,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Emit record added event to all clients
  emitRecordAdded(record) {
    this.io.emit(this.config.events.RECORD_ADDED, record);
    this.io.to(this.config.rooms.CAR_WASH_ROOM).emit(this.config.events.RECORD_ADDED, record);
    if (this.config.logging.enabled) {
      console.log('Emitted record-added event:', record.id);
    }
  }

  // Emit record updated event to all clients
  emitRecordUpdated(record) {
    this.io.emit(this.config.events.RECORD_UPDATED, record);
    this.io.to(this.config.rooms.CAR_WASH_ROOM).emit(this.config.events.RECORD_UPDATED, record);
    if (this.config.logging.enabled) {
      console.log('Emitted record-updated event:', record.id);
    }
  }

  // Emit record deleted event to all clients
  emitRecordDeleted(recordId) {
    this.io.emit(this.config.events.RECORD_DELETED, recordId);
    this.io.to(this.config.rooms.CAR_WASH_ROOM).emit(this.config.events.RECORD_DELETED, recordId);
    if (this.config.logging.enabled) {
      console.log('Emitted record-deleted event:', recordId);
    }
  }

  // Emit custom event to specific room
  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  // Emit custom event to all clients
  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.io.engine.clientsCount;
  }

  // Get clients in specific room
  getClientsInRoom(room) {
    return this.io.sockets.adapter.rooms.get(room)?.size || 0;
  }

  // Get Socket.io instance
  getIO() {
    return this.io;
  }
}

module.exports = SocketHandler;
