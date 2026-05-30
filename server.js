const express = require("express");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const path = require("path");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// 1. Make sure CORS allows your frontend
app.use(cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "DELETE"]
}));

app.use(express.json());

// 2. Create HTTP Server wrapping Express
const server = http.createServer(app);

// 3. Initialize Socket.io with CORS rules matching your frontend
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL, 
        methods: ["GET", "POST"]
    }
});

// 4. Share the io instance with your Express routes/controllers
app.set('socketio', io);
// Or attach to global if you prefer: global.io = io;

// 5. Setup the Socket connection & room joining logic
io.on('connection', (socket) => {
    console.log(`🔌 Client connected to socket: ${socket.id}`);

    // Listen for the frontend joining its specific training room
    socket.on('join_session', (sessionId) => {
        socket.join(sessionId);
        console.log(`🏠 Client joined training room: ${sessionId}`);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});


const submissionsRoutes = require("./routes/submissionsRoutes");
const modelsRoutes = require("./routes/modelsRoutes");
const profileRoutes = require("./routes/profileRoutes");
const languageRoutes = require("./routes/languageRoutes");
const roomRoutes = require("./routes/roomsRoutes");

const openapiPath = path.join(__dirname, "openapi.yaml");
const openapiDoc = YAML.load(openapiPath);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));

app.use("/api/submissions", submissionsRoutes);
app.use("/api/models", modelsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/rooms", roomRoutes);
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});