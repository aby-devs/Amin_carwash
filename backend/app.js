const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketService = require('./websocket/socketService');

dotenv.config();
const app = express();

// Required on Render/reverse proxies
app.set('trust proxy', 1);

const server = http.createServer(app);

// Initialize Socket.io
const socketHandler = socketService.initializeSocket(server);

// Make socket service available globally for use in routes
app.set('socketService', socketService);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://car-wash-vjej.onrender.com',
  'http://localhost:8080',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || allowedOrigins[0]);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'dist')));

// Import routes
const recordsRoutes = require('./routes/records');
const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');
const websocketRoutes = require('./routes/websocket');

// API Routes
app.use('/api/records', recordsRoutes);  // /api/records/*
app.use('/api/auth', authRoutes);         // /api/auth/*
app.use('/api/staff', staffRoutes);       // /api/staff/*
app.use('/api/websocket', websocketRoutes); // /api/websocket/*


// Catch all handler: send back React's index.html file for any non-API routes
app.get(/^(?!\/(api)).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Socket.io server is ready for connections`);
    console.log(`WebSocket handler initialized`);
});
