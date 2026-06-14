import passport from "passport";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import dotenv from 'dotenv';

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/gmail.readonly',
    ],
},
(accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
    
    done(null, {profile, accessToken, refreshToken})
}
))

export default passport