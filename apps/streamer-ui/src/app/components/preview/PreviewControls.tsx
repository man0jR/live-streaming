import { useEffect, useState, useCallback } from 'react';
import { IconButton, Stack, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Videocam, VideocamOff, Mic, MicOff, ScreenShare, StopScreenShare } from '@mui/icons-material';

interface VideoQuality {
  width: number;
  height: number;
  frameRate: number;
}

interface DeviceOption {
  deviceId: string;
  label: string;
}

interface PreviewControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  videoQuality: VideoQuality;
  hasStream: boolean;
  onVideoToggle: () => void;
  onAudioToggle: () => void;
  onScreenShareToggle: () => void;
  onQualityChange: (quality: VideoQuality) => void;
  onDeviceChange: (type: 'video' | 'audio', deviceId: string) => void;
  onGoLive: () => void;
  onCancel: () => void;
}

export const PreviewControls = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  videoQuality,
  hasStream,
  onVideoToggle,
  onAudioToggle,
  onScreenShareToggle,
  onQualityChange,
  onDeviceChange,
  onGoLive,
  onCancel,
}: PreviewControlsProps) => {
  const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
  const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');

  const loadDevices = useCallback(async () => {
    try {
      // Request permission to access devices
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Stop the temporary stream
      stream.getTracks().forEach(track => track.stop());
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoInputs = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`
        }));

      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${index + 1}`
        }));

      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);

      // Set default devices if available
      if (videoInputs.length > 0 && !selectedVideo) {
        setSelectedVideo(videoInputs[0].deviceId);
        onDeviceChange('video', videoInputs[0].deviceId);
      }
      if (audioInputs.length > 0 && !selectedAudio) {
        setSelectedAudio(audioInputs[0].deviceId);
        onDeviceChange('audio', audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      // Handle error gracefully - maybe show a message to user
    }
  }, [onDeviceChange, selectedVideo, selectedAudio]);

  useEffect(() => {
    loadDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, [loadDevices]);

  const handleVideoDeviceChange = useCallback((deviceId: string) => {
    setSelectedVideo(deviceId);
    onDeviceChange('video', deviceId);
  }, [onDeviceChange]);

  const handleAudioDeviceChange = useCallback((deviceId: string) => {
    setSelectedAudio(deviceId);
    onDeviceChange('audio', deviceId);
  }, [onDeviceChange]);

  return (
    <Stack spacing={2}>
      <FormControl fullWidth>
        <InputLabel>Camera</InputLabel>
        <Select
          value={selectedVideo}
          onChange={(e) => handleVideoDeviceChange(e.target.value)}
          disabled={!isVideoEnabled}
        >
          {videoDevices.map((device) => (
            <MenuItem key={device.deviceId} value={device.deviceId}>
              {device.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Microphone</InputLabel>
        <Select
          value={selectedAudio}
          onChange={(e) => handleAudioDeviceChange(e.target.value)}
          disabled={!isAudioEnabled}
        >
          {audioDevices.map((device) => (
            <MenuItem key={device.deviceId} value={device.deviceId}>
              {device.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Quality</InputLabel>
        <Select
          value={`${videoQuality.height}p`}
          onChange={(e) => {
            const quality = {
              '720p': { width: 1280, height: 720, frameRate: 30 },
              '1080p': { width: 1920, height: 1080, frameRate: 30 },
              '480p': { width: 854, height: 480, frameRate: 30 },
            }[e.target.value] || { width: 1280, height: 720, frameRate: 30 };
            onQualityChange(quality);
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
          onClick={onVideoToggle}
        >
          {isVideoEnabled ? <Videocam /> : <VideocamOff />}
        </IconButton>
        <IconButton
          color={isAudioEnabled ? 'primary' : 'default'}
          onClick={onAudioToggle}
        >
          {isAudioEnabled ? <Mic /> : <MicOff />}
        </IconButton>
        <IconButton
          color={isScreenSharing ? 'primary' : 'default'}
          onClick={onScreenShareToggle}
        >
          {isScreenSharing ? <ScreenShare /> : <StopScreenShare />}
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          color="error"
          fullWidth
          disabled={!hasStream}
          onClick={onGoLive}
        >
          Go Live
        </Button>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}; 