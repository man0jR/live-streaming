import { useState } from 'react';
import { Box, Container, TextField, Button, Typography, Paper } from '@mui/material';
import { ViewerInterface } from './components/ViewerInterface';

export function App() {
  const [streamId, setStreamId] = useState('');
  const [isWatching, setIsWatching] = useState(false);

  const handleWatch = () => {
    if (streamId.trim()) {
      setIsWatching(true);
    }
  };

  const handleBack = () => {
    setIsWatching(false);
    setStreamId('');
  };

  if (isWatching) {
    return (
      <Box sx={{ height: '100vh', bgcolor: 'background.default' }}>
        <Button 
          onClick={handleBack}
          sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1 }}
        >
          Back to Home
        </Button>
        <ViewerInterface streamId={streamId} />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
        <Typography variant="h4" gutterBottom align="center">
          Live Stream Viewer
        </Typography>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleWatch(); }}>
          <TextField
            fullWidth
            label="Enter Stream ID"
            value={streamId}
            onChange={(e) => setStreamId(e.target.value)}
            margin="normal"
            variant="outlined"
            placeholder="e.g., abc123"
          />
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleWatch}
            disabled={!streamId.trim()}
            sx={{ mt: 2 }}
          >
            Watch Stream
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default App;
