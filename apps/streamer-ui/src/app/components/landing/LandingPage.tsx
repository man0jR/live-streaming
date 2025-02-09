import { Container, Paper, Typography, Button } from '@mui/material';

interface LandingPageProps {
  onStartStreaming: () => void;
}

export const LandingPage = ({ onStartStreaming }: LandingPageProps) => {
  return (
    <Container maxWidth="sm" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
        <Typography variant="h4" gutterBottom align="center">
          Welcome to Live Streaming Studio!
        </Typography>
        <Typography variant="body1" align="center" sx={{ mb: 4 }}>
          Start your live stream with just a few clicks. Make sure you have your camera and microphone ready.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onStartStreaming}
          sx={{ mt: 2 }}
        >
          Start Streaming
        </Button>
      </Paper>
    </Container>
  );
}; 