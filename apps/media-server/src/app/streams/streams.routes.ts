import express from 'express';
import { startStream, endStream, verifyStreamKey } from './streams.controller';

const router = express.Router();

router.post('/start', startStream);
router.post('/:streamId/end', endStream);
router.get('/verify/:streamKey', verifyStreamKey);

export default router; 