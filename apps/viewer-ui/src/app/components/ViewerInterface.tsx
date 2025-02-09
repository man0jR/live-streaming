import { useEffect, useRef, useState } from 'react';
import 'shaka-player/dist/controls.css';
// Import the compiled library
// @ts-ignore
import * as shaka from 'shaka-player/dist/shaka-player.compiled'
import axios from 'axios';

import { Box, Typography, CircularProgress } from '@mui/material';

interface StreamInfo {
  streamId: string;
  playbackUrl: string;
}

interface ViewerInterfaceProps {
  streamId: string;
}

export const ViewerInterface = ({ streamId }: ViewerInterfaceProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // Initialize Shaka Player
  useEffect(() => {
    const initPlayer = async () => {
      try {
        // Check browser support
        const isSupportedBrowser = shaka.Player.isBrowserSupported();
        if (!isSupportedBrowser) {
          throw new Error('Browser not supported for video playback');
        }

        // Install polyfills
        await shaka.polyfill.installAll();

        if (videoRef.current) {
          // Create player instance
          const player = new shaka.Player(videoRef.current);
          playerRef.current = player;

          // Add error handler
          player.addEventListener('error', (event: any) => {
            setError(`Error: ${event.detail.message}`);
          });

          // Configure player
          player.configure({
            streaming: {
              bufferingGoal: 30,
              rebufferingGoal: 15,
              bufferBehind: 30,
              // Prefer HLS over DASH
              manifest: {
                dash: { enabled: true },
                hls: { enabled: true }
              }
            },
            abr: {
              enabled: true,
              defaultBandwidthEstimate: 1000000 // 1Mbps initial estimate
            }
          });

          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing player:', error);
        setError('Failed to initialize video player');
        setIsLoading(false);
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  const loadStream = async (retry = false) => {
    if (!playerRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check stream availability
      const response = await axios.get(`http://localhost:8081/api/streams/${streamId}`);
      
      if (!response.data.available) {
        throw new Error('Stream not found or unavailable');
      }

      const cacheServerUrl = `http://localhost:8081/live/${streamId}/index.m3u8`;
      
      await playerRef.current.load(cacheServerUrl);
      
      if (videoRef.current) {
        await videoRef.current.play();
        setRetryCount(0); // Reset retry count on successful load
      }
    } catch (error) {
      console.error('Error loading stream:', error);
      
      if (retry && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        retryTimeout.current = setTimeout(() => {
          loadStream(true);
        }, 2000 * Math.pow(2, retryCount)); // Exponential backoff
      } else {
        setError(error instanceof Error ? error.message : 'Failed to load stream');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, []);

  // Add network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      if (streamId) {
        loadStream(true);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [streamId]);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        >
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
        }}
        controls
      />
    </Box>
  );
}; 