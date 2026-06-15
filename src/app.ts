import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport';
import authRouter from './routes/auth.routes';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(passport.initialize());

app.use('/auth', authRouter);

app.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Server is healthy',
  });
});

export default app;
