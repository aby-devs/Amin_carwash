let socketHandler = null;

// Initialize the socket handler
const initializeSocket = (server) => {
  const SocketHandler = require('./socketHandler');
  socketHandler = new SocketHandler(server);
  return socketHandler;
};

// Get the socket handler instance
const getSocketHandler = () => {
  if (!socketHandler) {
    throw new Error('Socket handler not initialized. Call initializeSocket() first.');
  }
  return socketHandler;
};

// Convenience methods for emitting events
const emitRecordAdded = (record) => {
  const handler = getSocketHandler();
  handler.emitRecordAdded(record);
};

const emitRecordUpdated = (record) => {
  const handler = getSocketHandler();
  handler.emitRecordUpdated(record);
};

const emitRecordDeleted = (recordId) => {
  const handler = getSocketHandler();
  handler.emitRecordDeleted(recordId);
};

const emitToRoom = (room, event, data) => {
  const handler = getSocketHandler();
  handler.emitToRoom(room, event, data);
};

const emitToAll = (event, data) => {
  const handler = getSocketHandler();
  handler.emitToAll(event, data);
};

const getConnectedClientsCount = () => {
  const handler = getSocketHandler();
  return handler.getConnectedClientsCount();
};

const getClientsInRoom = (room) => {
  const handler = getSocketHandler();
  return handler.getClientsInRoom(room);
};

module.exports = {
  initializeSocket,
  getSocketHandler,
  emitRecordAdded,
  emitRecordUpdated,
  emitRecordDeleted,
  emitToRoom,
  emitToAll,
  getConnectedClientsCount,
  getClientsInRoom
};
