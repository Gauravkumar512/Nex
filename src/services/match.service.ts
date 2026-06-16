import anthropic from '../config/anthropic';

interface MatchResult {
  matchScore: number;
  matched: string[];
  missing: string[];
  reasoning: string;
}

export async function scoreJobMatch(
  profileSummary: string,
  skills: unknown,
  projects: unknown,
  jobDescription: string
): Promise<MatchResult> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `You are evaluating how well a candidate matches a job description. Respond with ONLY a JSON object — no preamble, no markdown.
        Important: Score ONLY based on technical skill and tool overlap between the candidate's background and the job requirements. Do NOT penalize for being full-stack vs backend-only. Do NOT make assumptions about culture fit or role alignment.

JSON shape:
{
  "matchScore": number (0-100, how well the candidate matches this job),
  "matched": string[] (specific requirements from the job that the candidate satisfies, be specific e.g. "Redis caching experience"),
  "missing": string[] (specific requirements the candidate does NOT appear to have),
  "reasoning": string (1-2 sentence explanation of the score)
}

Candidate summary:
${profileSummary}

Candidate skills:
${JSON.stringify(skills)}

Candidate projects:
${JSON.stringify(projects)}

Job description:
${jobDescription}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const cleaned = textBlock.text
    .replace(/```json/gi, '')
    .replace(/```/gi, '')
    .trim();

  try {
    return JSON.parse(cleaned) as MatchResult;
  } catch {
    console.error('Failed to parse match result:', textBlock.text);
    throw new Error('AI returned malformed match data');
  }
}
