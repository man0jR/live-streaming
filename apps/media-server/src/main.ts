import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { StreamManager } from './stream-manager';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });
const streamManager = new StreamManager();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const streamId = req.url?.split('/').pop();
  if (!streamId) {
    ws.close();
    return;
  }

  streamManager.handleConnection(streamId, ws);
});

// API routes
app.post('/api/streams/start', (req, res) => {
  const streamId = `stream-${Date.now()}`;
  const wsUrl = `ws://localhost:${port}/stream/${streamId}`;
  const rtmpUrl = `rtmp://localhost/live/${streamId}`;

  res.json({
    streamId,
    wsUrl,
    rtmpUrl
  });
});

app.post('/api/streams/:streamId/end', (req, res) => {
  const { streamId } = req.params;
  streamManager.stopStream(streamId);
  res.sendStatus(200);
});

server.listen(port, () => {
  console.log(`Media server running on port ${port}`);
});
