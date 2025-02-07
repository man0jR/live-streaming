import { useCallback, useRef, useState } from 'react';
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

export const StreamerInterface = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoQuality, setVideoQuality] = useState({
    width: 1280,
    height: 720,
    frameRate: 30
  });

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

  return (
    <Box sx={{ p: 3, height: '100%' }}>
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
                  const quality = {
                    '720p': { width: 1280, height: 720, frameRate: 30 },
                    '1080p': { width: 1920, height: 1080, frameRate: 30 },
                    '480p': { width: 854, height: 480, frameRate: 30 },
                  }[e.target.value] || quality['720p'];
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
              color="error"
              disabled={!stream}
            >
              Start Streaming
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}; 