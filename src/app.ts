import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import passport from './config/passport';
import authRouter from './routes/auth.routes';
import jobRouter from './routes/job.routes';
import profileRouter from './routes/profile.routes';
import './workers/email.worker'

dotenv.config();

const app = express();

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(passport.initialize());

app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/jobs', jobRouter);

app.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Server is healthy',
  });
});

export default app;
