const frontend_url = process.env.FRONTEND_URL;
module.exports = {
  // CORS configuration for Socket.io
  cors: {
        origin: frontend_url || 'https://cloud9shinewash.top',
    methods: ['GET', 'POST'],
    credentials: true
  },

  // Room names
  rooms: {
    CAR_WASH_ROOM: 'car-wash-room',
    ADMIN_ROOM: 'admin-room',
    STAFF_ROOM: 'staff-room'
  },

  // Event names
  events: {
    RECORD_ADDED: 'record-added',
    RECORD_UPDATED: 'record-updated',
    RECORD_DELETED: 'record-deleted',
    COMMISSION_ADDED: 'commission-added',
    COMMISSION_UPDATED: 'commission-updated',
    COMMISSION_DELETED: 'commission-deleted',
    CONNECTION_STATUS: 'connection-status',
    PING: 'ping',
    PONG: 'pong'
  },

  // Connection settings
  connection: {
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  },

  // Logging
  logging: {
    enabled: true,
    level: 'info' // 'debug', 'info', 'warn', 'error'
  }
};
