import { Job, Worker } from 'bullmq';
import dotenv from 'dotenv';
import anthropic from '../config/anthropic';
import client from '../config/db';
import { EmailDraft } from '../config/emailQueue';
import { closeSSEClient, sendSSEEvent } from '../utils/sseManager';

dotenv.config();

const templates = [
  {
    tone: 'direct',
    instruction:
      'Open with your name and what you build in one sentence. Then one project with one specific metric or outcome. Then GitHub link. Then a one-line ask. No filler between any of these.',
  },
  {
    tone: 'confident',
    instruction:
      'Lead immediately with your strongest project and its most concrete outcome — before even introducing yourself. Then say who you are in one line. Then GitHub link. Then a casual ask.',
  },
  {
    tone: 'casual',
    instruction:
      'Open with your name and a one-line description of the kind of problems you like solving — derive this only from the candidate data, do not invent. Then one project with one outcome. Then GitHub link. Then a soft, low-pressure closing line.',
  },
];

const connection = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT!),
};

export const worker = new Worker<EmailDraft>(
  'email-draft',
  async (job: Job<EmailDraft>) => {
    // Select tone fresh per job so each draft can vary.
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)]!;

    const { jobId, userId } = job.data;

    const [jobRecord, profile] = await Promise.all([
      client.job.findUnique({
        where: { id: jobId },
        include: { company: true },
      }),
      client.profile.findUnique({ where: { userId } }),
    ]);

    if (!jobRecord || !profile) {
      throw new Error('Job or Profile not found');
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are writing a cold email from a job seeker to a hiring manager.

The email must feel like it was written by a real person — casual, direct, human. Not a cover letter. Not a template. One person reaching out to another.

Today's tone: ${selectedTemplate.tone}
Structure instruction: ${selectedTemplate.instruction}

STRICT RULES:
- 60 to 90 words maximum in the body, excluding signature
- Mention ONE project only — pick the most relevant to this role — with ONE specific metric or outcome
- Do NOT include any project GitHub links in the body
- Include candidate's main GitHub profile link once, naturally, before the signature
- Do NOT explicitly list any technologies, tools, or skills
- Do NOT say: passionate, excited, love to, would be a great fit, quick learner, team player, I came across, I've been following, I am interested in your company
- Do NOT compliment the company or say anything about how impressive they are
- Do NOT mention the job posting or job description
- Do NOT add or invent anything not present in the candidate data below
- End with ONE casual low-pressure closing line
- Signature: first name only

Output — ONLY this JSON, no markdown, no preamble, no explanation:
{
  "subject": string (5 words max, simple — like "Backend Internship" or "Internship Opportunity"),
  "body": string
}

--- CANDIDATE DATA ---
Name: ${profile.summary?.split(' ')[0]}
Summary: ${profile.summary}
Projects: ${JSON.stringify(profile.projects)}
GitHub: ${profile.githubUrl}

--- JOB DATA ---
HR Name: ${jobRecord.hrName ?? 'there'}
Company: ${jobRecord.company.name}
Role: ${jobRecord.role}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No response from Claude');
    }

    const cleaned = textBlock.text
      .replace(/```json/gi, '')
      .replace(/```/gi, '')
      .trim();

    const { subject, body } = JSON.parse(cleaned);

    sendSSEEvent(jobId, {
      status: 'completed',
      template: selectedTemplate.tone,
      email: { subject, body },
    });

    closeSSEClient(jobId);
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`Email draft job failed for ${job?.data.jobId}:`, err.message);

  if (job?.data.jobId) {
    sendSSEEvent(job.data.jobId, {
      status: 'failed',
      error: 'Failed to draft email. Please try again.',
    });
    closeSSEClient(job.data.jobId);
  }
});

console.log('Email draft worker started');
