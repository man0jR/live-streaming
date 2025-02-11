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

  private async waitForRTMP(): Promise<void> {
    const maxRetries = 5;
    const retryDelay = 1000; // 1 second

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try to connect to NGINX RTMP using netcat
        const result = await new Promise<boolean>((resolve) => {
          const nc = spawn('nc', ['-z', '127.0.0.1', '1935']);
          nc.on('close', (code) => resolve(code === 0));
        });

        if (result) {
          console.log('RTMP server is ready');
          return;
        }
      } catch (error) {
        console.log('Waiting for RTMP server...');
      }

      if (i === maxRetries - 1) {
        throw new Error('RTMP server not ready after retries');
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  async handleConnection(streamId: string, ws: WebSocket) {
    console.log(`New stream connection: ${streamId}`);

    try {
      // Wait for RTMP server to be ready
      await this.waitForRTMP();

      // Create input stream
      const inputStream = new Readable({
        read() {} // noop as we'll manually push data
      });

      // Pipe WebM stream to RTMP using FFmpeg
      const ffmpegProcess = spawn('ffmpeg', [
        '-i', 'pipe:0',           // Read from stdin
        '-c:v', 'libx264',       // Transcode VP9 to H.264
        '-preset', 'veryfast',    // Fast encoding preset
        '-tune', 'zerolatency',   // Tune for low latency
        '-c:a', 'aac',           // Transcode Opus to AAC
        '-ar', '44100',          // Audio sample rate
        '-b:a', '128k',          // Audio bitrate
        '-f', 'flv',             // Output format
        `rtmp://127.0.0.1:1935/live/${streamId}` // Send to RTMP server
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

    } catch (error) {
      console.error(`Failed to initialize stream ${streamId}:`, error);
      ws.close();
    }
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