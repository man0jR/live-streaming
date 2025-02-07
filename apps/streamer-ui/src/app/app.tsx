import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { StreamerInterface } from './components/StreamerInterface';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', width: '100vw' }}>
        <StreamerInterface />
      </Box>
    </ThemeProvider>
  );
}

export default App;
