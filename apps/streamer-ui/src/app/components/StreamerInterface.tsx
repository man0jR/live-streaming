import { useCallback, useRef, useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { VideoPreview } from './video/VideoPreview';
import { PreviewControls } from './preview/PreviewControls';
import { StreamControls } from './stream/StreamControls';

interface StreamDetails {
  streamId: string;
  streamKey: string;
  rtmpUrl: string;
  wsUrl?: string;
}

interface VideoQuality {
  width: number;
  height: number;
  frameRate: number;
}

interface StreamerInterfaceProps {
  onCancel: () => void;
}

// Get environment variables
const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

export const StreamerInterface = ({ onCancel }: StreamerInterfaceProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>({
    width: 1280,
    height: 720,
    frameRate: 30
  });
  const [streamDetails, setStreamDetails] = useState<StreamDetails | null>(null);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  const startVideoStream = useCallback(async (deviceId?: string) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          // deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: videoQuality.width },
          height: { ideal: videoQuality.height },
          frameRate: { ideal: videoQuality.frameRate }
        },
        audio: isAudioEnabled ? { deviceId: selectedAudioDevice || undefined } : false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setIsVideoEnabled(true);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'OverconstrainedError') {
        // OverconstrainedError has a constraint property but TS doesn't know about it
        const overconstrainedError = error as { constraint: string };
        console.error('Constraints not satisfied:', overconstrainedError.constraint);
        console.error(deviceId);
        // Display a message to the user explaining the issue
      } else {
        console.error('getUserMedia error:', error);
      }
      console.error('Error accessing media devices:', error);
    }
  }, [isAudioEnabled, selectedAudioDevice, videoQuality]);

  const toggleAudio = useCallback(async (deviceId?: string) => {
    if (isAudioEnabled) {
      if (stream) {
        stream.getAudioTracks().forEach((track) => track.stop());
      }
      setIsAudioEnabled(false);
    } else {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            // deviceId: deviceId ? { exact: deviceId } : undefined
          },
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

  const handleDeviceChange = useCallback(async (type: 'video' | 'audio', deviceId: string) => {
    if (type === 'video') {
      setSelectedVideoDevice(deviceId);
      if (isVideoEnabled) {
        await stopVideoStream();
        await startVideoStream(deviceId);
      }
    } else {
      setSelectedAudioDevice(deviceId);
      if (isAudioEnabled) {
        await toggleAudio(deviceId);
      }
    }
  }, [isVideoEnabled, isAudioEnabled, stopVideoStream, startVideoStream, toggleAudio]);

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

  const startLiveStream = async () => {
    try {
      if (!stream) {
        throw new Error('No media stream available');
      }

      // Get stream details from API
      const response = await axios.post(`${API_URL}/api/streams/start`, {
        userId: 'test-user-id',
        clientType: 'browser'
      });
      console.log(response);
      const details: StreamDetails = response.data;
      setStreamDetails(details);

      if (!details.wsUrl) {
        throw new Error('WebSocket URL not provided');
      }
      
      // Create WebSocket connection
      const ws = new WebSocket(details.wsUrl);
      wsRef.current = ws;

      // Set up MediaRecorder with VP9 and Opus
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000,  // 2.5 Mbps
        audioBitsPerSecond: 128000    // 128 kbps
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Directly send WebM chunks to server
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      ws.onopen = () => {
        mediaRecorder.start(1000); // Send chunks every second
        setIsPreviewMode(false);
        setIsLive(true);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        stopLiveStream();
      };

      ws.onclose = () => {
        stopLiveStream();
      };

    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  };

  const stopLiveStream = async () => {
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
      if (streamDetails) {
        await axios.post(`${API_URL}/api/streams/${streamDetails.streamId}/end`);
        setStreamDetails(null);
      }

      setIsLive(false);
      setStreamDuration(0);
      onCancel();
    } catch (error) {
      console.error('Failed to stop stream:', error);
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%' }}>
      <Grid container spacing={3} sx={{ height: '100%' }}>
        <Grid item xs={12} md={9}>
          <VideoPreview
            isLive={isLive}
            streamDuration={formatDuration(streamDuration)}
            videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <Stack spacing={2}>
            <Typography variant="h6">
              {isPreviewMode ? 'Preview Settings' : 'Stream Controls'}
            </Typography>
            
            {isPreviewMode ? (
              <PreviewControls
                isVideoEnabled={isVideoEnabled}
                isAudioEnabled={isAudioEnabled}
                isScreenSharing={isScreenSharing}
                videoQuality={videoQuality}
                hasStream={!!stream}
                onVideoToggle={isVideoEnabled ? stopVideoStream : startVideoStream}
                onAudioToggle={toggleAudio}
                onScreenShareToggle={toggleScreenShare}
                onQualityChange={setVideoQuality}
                onDeviceChange={handleDeviceChange}
                onGoLive={startLiveStream}
                onCancel={onCancel}
              />
            ) : (
              <StreamControls
                isVideoEnabled={isVideoEnabled}
                isAudioEnabled={isAudioEnabled}
                isScreenSharing={isScreenSharing}
                onVideoToggle={isVideoEnabled ? stopVideoStream : startVideoStream}
                onAudioToggle={toggleAudio}
                onScreenShareToggle={toggleScreenShare}
                onEndStream={stopLiveStream}
              />
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}; 