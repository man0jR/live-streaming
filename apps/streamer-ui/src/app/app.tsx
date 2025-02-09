import { useState } from 'react';
import { Box, createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { StreamerInterface } from './components/StreamerInterface';
import { LandingPage } from './components/landing/LandingPage';

export function App() {

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

  const [isStarting, setIsStarting] = useState(false);

  return (
    <ThemeProvider theme={darkTheme}>
    <CssBaseline />
    <Box sx={{ height: '100vh', bgcolor: 'background.default' }}>
      {!isStarting ? (
        <LandingPage onStartStreaming={() => setIsStarting(true)} />
      ) : (
        <StreamerInterface onCancel={() => setIsStarting(false)} />
      )}
    </Box>
    </ThemeProvider>
  );
}

export default App;
