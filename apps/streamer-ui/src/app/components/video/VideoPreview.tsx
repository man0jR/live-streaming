import { Box, Paper, Chip } from '@mui/material';
import { FiberManualRecord } from '@mui/icons-material';

interface VideoPreviewProps {
  isLive: boolean;
  streamDuration: string;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const VideoPreview = ({ isLive, streamDuration, videoRef }: VideoPreviewProps) => {
  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'black',
        position: 'relative',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      {isLive && (
        <Box sx={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 2 }}>
          <Chip
            icon={<FiberManualRecord sx={{ animation: 'pulse 1.5s infinite', color: 'error.main' }} />}
            label="LIVE"
            color="error"
          />
          <Chip
            label={streamDuration}
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white' }}
          />
        </Box>
      )}
    </Paper>
  );
}; 