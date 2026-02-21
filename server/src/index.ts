import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chartRoutes from './routes/chartRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', storage: 'browser-local' });
});

app.use('/api', chartRoutes);

app.get('/', (req, res) => {
  res.send('Lumenci AI Backend API is running...');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
