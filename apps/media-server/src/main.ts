import express from 'express';
import cors from 'cors';
import streamsRouter from './app/streams/streams.routes';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Media Server API' });
});

app.use('/api/streams', streamsRouter);

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
