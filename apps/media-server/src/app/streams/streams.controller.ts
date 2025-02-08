import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

interface Stream {
  id: string;
  streamKey: string;
  userId: string;
  startedAt: Date;
  isActive: boolean;
  clientType: string;
}

interface StreamResponse {
  streamId: string;
  streamKey: string;
  rtmpUrl: string;
  wsUrl?: string;
  playbackUrl: string;
}

// In-memory store for active streams (replace with a database in production)
const activeStreams = new Map<string, Stream>();

export const startStream = (req: Request, res: Response) => {
  const { userId, clientType = 'browser' } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const streamId = uuidv4();
  const streamKey = createHash('sha256')
    .update(streamId + process.env.STREAM_KEY_SECRET)
    .digest('hex')
    .substring(0, 16);

  const stream: Stream = {
    id: streamId,
    streamKey,
    userId,
    startedAt: new Date(),
    isActive: true,
    clientType,
  };

  activeStreams.set(streamId, stream);

  const response: StreamResponse = {
    streamId,
    streamKey,
    rtmpUrl: `rtmp://${process.env.MEDIA_SERVER_HOST || 'localhost'}:1935/live/${streamKey}`,
    playbackUrl: `http://${process.env.MEDIA_SERVER_HOST || 'localhost'}:8080/live/${streamKey}/index.m3u8`,
  };

  // Add WebSocket URL for browser-based streaming
  if (clientType === 'browser') {
    response.wsUrl = `ws://${process.env.MEDIA_SERVER_HOST || 'localhost'}:8080/ws/${streamKey}`;
  }

  res.json(response);
};

export const endStream = (req: Request, res: Response) => {
  const { streamId } = req.params;
  const stream = activeStreams.get(streamId);

  if (!stream) {
    return res.status(404).json({ error: 'Stream not found' });
  }

  stream.isActive = false;
  activeStreams.delete(streamId);

  res.json({ message: 'Stream ended successfully' });
};

export const verifyStreamKey = (req: Request, res: Response) => {
  const { streamKey } = req.params;
  
  const stream = Array.from(activeStreams.values()).find(
    (s) => s.streamKey === streamKey && s.isActive
  );

  if (!stream) {
    return res.status(403).json({ error: 'Invalid stream key' });
  }

  res.json({ allowed: true });
}; 