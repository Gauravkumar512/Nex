import { Router } from "express";
import passport from '../config/passport';
import { googleAuth, generateTokens } from "../services/auth.service";


const router = Router();

router.get('/google', passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'],
    accessType: 'offline',
    prompt: 'consent'
})
)

router.get('/google/callback', passport.authenticate('google',{
    session: false,
    failureRedirect: '/auth/failure',
}),
 async( req, res, next) => {
    try {
        const data = req.user as {
            profile: any,
            accessToken: string,
            refreshToken: string,
        }
        
        const user = await googleAuth(data);
        const { accessToken, refreshToken } = generateTokens(user.id)

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 min
        })

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })

        const frontendUrl = process.env.FRONTEND_URL;
        if (!frontendUrl) throw new Error('FRONTEND_URL is not set');
        res.redirect(`${frontendUrl}/dashboard`)

    } catch (error) {
        next(error);
    }
  })

router.get('/failure',( req, res ) => {
    res.status(401).json({message: 'Google authentication failed'});
})

export default router;