import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

interface Stream {
  id: string;
  streamKey: string;
  userId: string;
  startedAt: Date;
  isActive: boolean;
  viewerCount: number;
  lastPing: Date;
}

interface StreamStats {
  viewerCount: number;
  duration: number;
  bitrate: number;
}

const activeStreams = new Map<string, Stream>();

// Clean up inactive streams periodically
setInterval(() => {
  const now = new Date();
  for (const [streamId, stream] of activeStreams.entries()) {
    // If no ping received in last 30 seconds, consider stream inactive
    if (now.getTime() - stream.lastPing.getTime() > 30000) {
      activeStreams.delete(streamId);
    }
  }
}, 10000);

export const startStream = (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
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
      viewerCount: 0,
      lastPing: new Date()
    };

    activeStreams.set(streamId, stream);

    res.json({
      streamId,
      streamKey,
      rtmpUrl: `rtmp://${process.env.MEDIA_SERVER_HOST || 'localhost'}:1935/live/${streamKey}`,
      playbackUrl: `http://${process.env.MEDIA_SERVER_HOST || 'localhost'}:8080/live/${streamKey}/index.m3u8`,
    });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ error: 'Failed to start stream' });
  }
};

export const endStream = (req: Request, res: Response) => {
  const { streamId } = req.params;
  const stream = activeStreams.get(streamId);

  if (!stream) {
    return res.status(404).json({ error: 'Stream not found' });
  }

  try {
    stream.isActive = false;
    activeStreams.delete(streamId);
    res.json({ message: 'Stream ended successfully' });
  } catch (error) {
    console.error('Error ending stream:', error);
    res.status(500).json({ error: 'Failed to end stream' });
  }
};

export const keepAlive = (req: Request, res: Response) => {
  const { streamId } = req.params;
  const stream = activeStreams.get(streamId);

  if (!stream) {
    return res.status(404).json({ error: 'Stream not found' });
  }

  stream.lastPing = new Date();
  res.json({ status: 'ok' });
};

export const getStreamStats = (req: Request, res: Response) => {
  const { streamId } = req.params;
  const stream = activeStreams.get(streamId);

  if (!stream) {
    return res.status(404).json({ error: 'Stream not found' });
  }

  const stats: StreamStats = {
    viewerCount: stream.viewerCount,
    duration: (new Date().getTime() - stream.startedAt.getTime()) / 1000,
    bitrate: 0 // To be implemented with actual bitrate monitoring
  };

  res.json(stats);
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