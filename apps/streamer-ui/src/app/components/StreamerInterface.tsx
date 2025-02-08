import { useCallback, useRef, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  ScreenShare,
  StopScreenShare,
} from '@mui/icons-material';
import axios from 'axios';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

interface StreamDetails {
  streamId: string;
  streamKey: string;
  rtmpUrl: string;
  wsUrl?: string;
  playbackUrl: string;
}

interface VideoQuality {
  width: number;
  height: number;
  frameRate: number;
}

export const StreamerInterface = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>({
    width: 1280,
    height: 720,
    frameRate: 30
  });
  const [streamDetails, setStreamDetails] = useState<StreamDetails | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;
      
      try {
        setIsLoading(true);
        // Load FFmpeg WASM
        await ffmpeg.load({
          coreURL: await toBlobURL(`/ffmpeg-core.wasm`, 'application/wasm'),
          wasmURL: await toBlobURL(`/ffmpeg.wasm`, 'application/wasm'),
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading FFmpeg:', error);
        setIsLoading(false);
      }
    };

    loadFFmpeg();
  }, []);

  const startVideoStream = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: videoQuality.width },
          height: { ideal: videoQuality.height },
          frameRate: { ideal: videoQuality.frameRate }
        },
        audio: isAudioEnabled,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setIsVideoEnabled(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  }, [isAudioEnabled, videoQuality]);

  const stopVideoStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
      setIsVideoEnabled(false);
    }
  }, [stream]);

  const toggleAudio = useCallback(async () => {
    if (isAudioEnabled) {
      if (stream) {
        stream.getAudioTracks().forEach((track) => track.stop());
      }
      setIsAudioEnabled(false);
    } else {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (stream) {
          audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
        }
        setIsAudioEnabled(true);
      } catch (error) {
        console.error('Error accessing audio:', error);
      }
    }
  }, [isAudioEnabled, stream]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (stream) {
        stream.getTracks().forEach((track) => {
          if (track.kind === 'video') track.stop();
        });
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        setStream(screenStream);
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    }
  }, [isScreenSharing, stream]);

  const startStreaming = useCallback(async () => {
    if (!stream || !ffmpegRef.current) return;

    const ffmpeg = ffmpegRef.current;

    try {
      // First, get stream details from API
      const response = await axios.post('http://localhost:3001/api/streams/start', {
        userId: 'test-user-id',
        clientType: 'browser'
      });

      const details: StreamDetails = response.data;
      setStreamDetails(details);

      if (!details.wsUrl) {
        throw new Error('WebSocket URL not provided');
      }

      // Create WebSocket connection
      const ws = new WebSocket(details.wsUrl);
      wsRef.current = ws;

      // Set up MediaRecorder with optimal settings for RTMP
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=h264,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000   // 128 kbps
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Handle incoming data chunks
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          try {
            // Convert WebM chunk to FLV for RTMP
            const webmBlob = event.data;
            const arrayBuffer = await webmBlob.arrayBuffer();
            const inputData = new Uint8Array(arrayBuffer);

            // Write input file
            await ffmpeg.writeFile('input.webm', inputData);

            // Convert to FLV
            await ffmpeg.exec([
              '-i', 'input.webm',
              '-c:v', 'copy',
              '-c:a', 'aac',
              '-f', 'flv',
              'output.flv'
            ]);

            // Read output file
            const flvData = await ffmpeg.readFile('output.flv');
            
            // Send FLV data through WebSocket
            ws.send(flvData);

            // Clean up temporary files
            await ffmpeg.deleteFile('input.webm');
            await ffmpeg.deleteFile('output.flv');
          } catch (error) {
            console.error('Error processing media chunk:', error);
          }
        }
      };

      ws.onopen = () => {
        mediaRecorder.start(1000); // Capture in 1-second chunks
        setIsStreaming(true);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        stopStreaming();
      };

      ws.onclose = () => {
        stopStreaming();
      };

    } catch (error) {
      console.error('Error starting stream:', error);
    }
  }, [stream]);

  const stopStreaming = useCallback(async () => {
    if (!streamDetails) return;

    try {
      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // End stream on server
      await axios.post(`http://localhost:3001/api/streams/${streamDetails.streamId}/end`);
      setStreamDetails(null);
      setIsStreaming(false);
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
  }, [streamDetails]);

  return (
    <Box sx={{ p: 3, height: '100%' }}>
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Typography>Loading FFmpeg...</Typography>
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ height: '100%' }}>
          <Grid item xs={12} md={9}>
            <Paper
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'black',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack spacing={2}>
              <Typography variant="h6">Streaming Controls</Typography>
              <FormControl fullWidth>
                <InputLabel>Quality</InputLabel>
                <Select
                  value={`${videoQuality.height}p`}
                  onChange={(e) => {
                    const quality: VideoQuality = {
                      '720p': { width: 1280, height: 720, frameRate: 30 },
                      '1080p': { width: 1920, height: 1080, frameRate: 30 },
                      '480p': { width: 854, height: 480, frameRate: 30 },
                    }[e.target.value] || { width: 1280, height: 720, frameRate: 30 };
                    setVideoQuality(quality);
                  }}
                >
                  <MenuItem value="480p">480p</MenuItem>
                  <MenuItem value="720p">720p</MenuItem>
                  <MenuItem value="1080p">1080p</MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={1}>
                <IconButton
                  color={isVideoEnabled ? 'primary' : 'default'}
                  onClick={isVideoEnabled ? stopVideoStream : startVideoStream}
                >
                  {isVideoEnabled ? <Videocam /> : <VideocamOff />}
                </IconButton>
                <IconButton
                  color={isAudioEnabled ? 'primary' : 'default'}
                  onClick={toggleAudio}
                >
                  {isAudioEnabled ? <Mic /> : <MicOff />}
                </IconButton>
                <IconButton
                  color={isScreenSharing ? 'primary' : 'default'}
                  onClick={toggleScreenShare}
                >
                  {isScreenSharing ? <ScreenShare /> : <StopScreenShare />}
                </IconButton>
              </Stack>
              <Button
                variant="contained"
                color={isStreaming ? "error" : "primary"}
                disabled={!stream}
                onClick={isStreaming ? stopStreaming : startStreaming}
              >
                {isStreaming ? "Stop Streaming" : "Start Streaming"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}; 