import './config/env';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import passport from './config/passport';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import authRouter from './routes/auth.routes';
import jobRouter from './routes/job.routes';
import profileRouter from './routes/profile.routes';
import './workers/email.worker';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.set('trust proxy', 1);

app.use(passport.initialize());

app.use(generalLimiter);

app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/jobs', jobRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy' });
});

app.use(errorHandler);

export default app;
