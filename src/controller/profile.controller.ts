import { NextFunction, Response } from 'express';
import { z } from 'zod';
import client from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { extractProfileFromResume, saveProfile } from '../services/profile.service';

const uploadBodySchema = z.object({
  githubUrl: z.string().url().optional(),
});

export async function uploadResume(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const bodyParse = uploadBodySchema.safeParse(req.body);
    if (!bodyParse.success) {
      res.status(400).json({ message: 'Invalid githubUrl', errors: bodyParse.error.issues });
      return;
    }

    const { githubUrl } = bodyParse.data;
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
      select: {
        id: true,
        skills: true,
        projects: true,
        summary: true,
        githubUrl: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      res.status(404).json({ message: 'Profile not found. Upload a resume first.' });
      return;
    }

    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
}
