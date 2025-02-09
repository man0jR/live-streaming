import { WebSocket } from 'ws';
import { Readable } from 'stream';
import { spawn } from 'child_process';

interface Stream {
  inputStream: Readable;
  ffmpegProcess: ReturnType<typeof spawn>;
  ws: WebSocket;
}

export class StreamManager {
  private streams = new Map<string, Stream>();

  handleConnection(streamId: string, ws: WebSocket) {
    console.log(`New stream connection: ${streamId}`);

    // Create input stream
    const inputStream = new Readable({
      read() {} // noop as we'll manually push data
    });

    // Pipe WebM stream to RTMP using FFmpeg
    const ffmpegProcess = spawn('ffmpeg', [
      '-i', 'pipe:0',           // Read from stdin
      '-c:v', 'copy',          // Copy VP9 video (no transcoding)
      '-c:a', 'copy',          // Copy Opus audio (no transcoding)
      '-f', 'flv',             // Output format
      `rtmp://localhost:1935/live/${streamId}` // NGINX RTMP endpoint
    ]);

    // Pipe input stream to FFmpeg's stdin
    inputStream.pipe(ffmpegProcess.stdin);

    // Handle FFmpeg process events
    ffmpegProcess.stderr.on('data', (data) => {
      console.log(`FFmpeg ${streamId}:`, data.toString());
    });

    ffmpegProcess.on('error', (error) => {
      console.error(`FFmpeg process error for stream ${streamId}:`, error);
      this.stopStream(streamId);
    });

    ffmpegProcess.on('exit', (code) => {
      console.log(`FFmpeg process exited for stream ${streamId} with code ${code}`);
      this.stopStream(streamId);
    });

    // Store stream info
    this.streams.set(streamId, {
      inputStream,
      ffmpegProcess,
      ws
    });

    // Handle incoming WebM chunks
    ws.on('message', (chunk: Buffer) => {
      inputStream.push(chunk);
    });

    // Handle WebSocket closure
    ws.on('close', () => {
      this.stopStream(streamId);
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for stream ${streamId}:`, error);
      this.stopStream(streamId);
    });
  }

  stopStream(streamId: string) {
    const stream = this.streams.get(streamId);
    if (stream) {
      const { inputStream, ffmpegProcess, ws } = stream;

      // Clean up resources
      inputStream.push(null);
      ffmpegProcess.kill();
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }

      this.streams.delete(streamId);
      console.log(`Stopped stream ${streamId}`);
    }
  }
} 