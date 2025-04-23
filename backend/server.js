const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  pingTimeout: 60000, // Increase timeout to prevent premature disconnections
  pingInterval: 25000,
  cors: {
    origin: '*', // Allow all origins for development; restrict in production
  },
});

// In-memory store for messages and users (replace with MongoDB for persistence)
const messages = {}; // { room: [{ username, text, timestamp, id }] }
const users = {}; // { room: { socketId: { username, isTyping } } }
const recentMessages = new Set(); // For deduplication

// Serve a simple root endpoint
app.get('/', (req, res) => {
  res.send('Chat server is running');
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle user authentication
  socket.on('authenticate', ({ username, room }, callback) => {
    if (!username || !room) {
      return callback({ status: 'error', message: 'Username and room are required' });
    }
    if (Object.values(users[room] || {}).some(user => user.username === username)) {
      return callback({ status: 'error', message: 'Username already taken in this room' });
    }

    // Store user info
    if (!users[room]) users[room] = {};
    users[room][socket.id] = { username, isTyping: false };
    socket.join(room);

    // Initialize message store for the room if not exists
    if (!messages[room]) messages[room] = [];

    // Send welcome message and message history
    const welcomeMessage = {
      id: `${socket.id}-${Date.now()}`,
      username: 'System',
      text: `${username} has joined the chat`,
      timestamp: new Date().toLocaleTimeString(),
    };
    messages[room].push(welcomeMessage);
    io.to(room).emit('message', welcomeMessage);

    // Send message history (last 50 messages)
    socket.emit('messageHistory', messages[room].slice(-50));

    // Update presence indicators
    io.to(room).emit('presenceUpdate', Object.values(users[room]));

    callback({ status: 'success' });
  });

  // Handle incoming messages
  socket.on('message', ({ room, text, username }, callback) => {
    if (!room || !text || !username) {
      return callback({ status: 'error', message: 'Room, text, and username are required' });
    }
  
    const timestamp = new Date().toLocaleTimeString();
    const messageId = `${username}-${timestamp}-${text}-${Date.now()}`;
  
    // Deduplicate messages
    if (recentMessages.has(messageId)) {
      return callback({ status: 'duplicate' });
    }
    recentMessages.add(messageId);
    setTimeout(() => recentMessages.delete(messageId), 60000); // Clear after 1 minute
  
    const message = { id: messageId, username, text, timestamp };
  
    // Ensure messages[room] is initialized
    if (!messages[room]) messages[room] = [];
  
    messages[room].push(message);
    io.to(room).emit('message', message);
    callback({ status: 'delivered' });
  });

  // Handle typing indicators
  socket.on('typing', ({ room, isTyping }) => {
    if (users[room] && users[room][socket.id]) {
      users[room][socket.id].isTyping = isTyping;
      io.to(room).emit('presenceUpdate', Object.values(users[room]));
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Find the room and username of the disconnected user
    for (const room in users) {
      if (users[room][socket.id]) {
        const { username } = users[room][socket.id];
        delete users[room][socket.id];

        // Send leave message
        const leaveMessage = {
          id: `${socket.id}-${Date.now()}`,
          username: 'System',
          text: `${username} has left the chat`,
          timestamp: new Date().toLocaleTimeString(),
        };
        messages[room].push(leaveMessage);
        io.to(room).emit('message', leaveMessage);

        // Update presence indicators
        io.to(room).emit('presenceUpdate', Object.values(users[room]));

        // Clean up empty rooms
        if (Object.keys(users[room]).length === 0) {
          delete users[room];
          delete messages[room];
        }

        break;
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});