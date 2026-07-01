const express = require('express');
const router = express.Router();

// Get WebSocket connection status
router.get('/status', (req, res) => {
  try {
    const socketService = req.app.get('socketService');
    
    if (!socketService) {
      return res.status(503).json({
        success: false,
        message: 'WebSocket service not available'
      });
    }

    const connectedClients = socketService.getConnectedClientsCount();
    const carWashRoomClients = socketService.getClientsInRoom('car-wash-room');

    res.json({
      success: true,
      data: {
        connectedClients,
        carWashRoomClients,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Error getting WebSocket status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting WebSocket status',
      error: error.message
    });
  }
});

// Emit custom event (for testing)
router.post('/emit', (req, res) => {
  try {
    const { event, data, room } = req.body;
    const socketService = req.app.get('socketService');
    
    if (!socketService) {
      return res.status(503).json({
        success: false,
        message: 'WebSocket service not available'
      });
    }

    if (room) {
      socketService.emitToRoom(room, event, data);
    } else {
      socketService.emitToAll(event, data);
    }

    res.json({
      success: true,
      message: `Event '${event}' emitted successfully`
    });
  } catch (error) {
    console.error('Error emitting event:', error);
    res.status(500).json({
      success: false,
      message: 'Error emitting event',
      error: error.message
    });
  }
});

module.exports = router;
