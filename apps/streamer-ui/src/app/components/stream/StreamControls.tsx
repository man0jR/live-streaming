import { Stack, Button, IconButton } from '@mui/material';
import { Videocam, VideocamOff, Mic, MicOff, ScreenShare, StopScreenShare } from '@mui/icons-material';

interface StreamControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  onVideoToggle: () => void;
  onAudioToggle: () => void;
  onScreenShareToggle: () => void;
  onEndStream: () => void;
}

export const StreamControls = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  onVideoToggle,
  onAudioToggle,
  onScreenShareToggle,
  onEndStream,
}: StreamControlsProps) => {
  return (
    <Stack spacing={2}>
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

      <Button
        variant="contained"
        color="error"
        onClick={onEndStream}
      >
        End Stream
      </Button>
    </Stack>
  );
}; 