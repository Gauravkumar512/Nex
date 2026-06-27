import { Job, Worker } from 'bullmq';
import anthropic from '../config/anthropic';
import client from '../config/db';
import type { EmailDraft } from '../config/emailQueue';
import { closeSSEClient, sendSSEEvent } from '../utils/sseManager';

const connection = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT!),
};

export const worker = new Worker<EmailDraft>(
  'email-draft',
  async (job: Job<EmailDraft>) => {
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
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `You are writing a professional cold outreach email from a job seeker to a hiring manager.

Follow this EXACT structure — do not deviate:

1. Greeting: "Hi [HR_NAME],"
2. Intro line: "I'm [FIRST_NAME], a [short role description derived from the candidate's summary — e.g. 'backend-focused engineering student' or 'full-stack developer']."
3. Opening: "I came across the opening for the [ROLE] role and wanted to reach out."
4. Skills paragraph: One sentence listing the most relevant technologies and focus areas from the candidate's skill set that align with this role. Do not invent skills. Only use what is in the candidate data.
5. Project highlight: "One of my recent projects is [MOST_RELEVANT_PROJECT], [one sentence describing what was built, keeping it specific to what is in the candidate data]."
6. GitHub line (on its own line): "GitHub: [GITHUB_URL]"
7. Ask: "If you think my profile could be a good fit for your team, I'd be grateful for the opportunity to interview or discuss how I can contribute."
8. Closing: "Thank you for your time, and I look forward to hearing from you."
9. Sign-off: "Best," followed by first name only on the next line.

RULES:
- Use HR name if provided, otherwise use "there"
- First name is the first word of the candidate's name in the summary
- Pick the single most relevant project based on the role
- Skills in step 4 must come ONLY from the candidate's actual skills — pick whichever are most relevant to the role
- Do NOT add any information not present in the candidate data
- Do NOT add a subject line inside the body
- The body should read naturally — no bullet points, no headers

For the subject line: short and direct, like "Backend Engineer Intern Application" or "Frontend Role — [First Name]". Max 8 words.

Output ONLY this JSON (no markdown, no preamble):
{
  "subject": string,
  "body": string
}

--- CANDIDATE DATA ---
Name: ${profile.summary?.split(' ')[0] ?? 'Candidate'}
Summary: ${profile.summary ?? 'Not provided'}
Skills: ${JSON.stringify(profile.skills)}
Projects: ${JSON.stringify(profile.projects)}
GitHub: ${profile.githubUrl ?? 'Not provided'}

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

    sendSSEEvent(jobId, 'done', { draft: { subject, body } });

    closeSSEClient(jobId);
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`Email draft job failed for ${job?.data.jobId}:`, err.message);

  if (job?.data.jobId) {
    sendSSEEvent(job.data.jobId, 'error', { message: 'Failed to draft email. Please try again.' });
    closeSSEClient(job.data.jobId);
  }
});

console.log('Email draft worker started');
