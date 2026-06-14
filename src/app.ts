import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config();

const app = express();

app.use(cors({
    origin: '*',
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: true, limit: '50mb'}));


app.get('/health', (req, res) => {

    res.status(200).json({
        message: "Server is healthy",
    });
});

export default app;
