import { NextFunction, Response } from 'express';
import client from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { extractProfileFromResume, saveProfile } from '../services/profile.service';

export async function uploadResume(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const { githubUrl } = req.body;

    const { rawText, structured } = await extractProfileFromResume(req.file.buffer);
    const profile = await saveProfile(req.userId!, rawText, structured, githubUrl);

    res.status(200).json({
      message: 'Profile extracted successfully',
      profile: {
        skills: profile.skills,
        projects: profile.projects,
        summary: profile.summary,
        githubUrl: profile.githubUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await client.profile.findUnique({
      where: { userId: req.userId! },
    });

    if (!profile) {
      res.status(400).json({ message: 'Profile not found. Upload a resume first.' });
      return;
    }

    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
}
