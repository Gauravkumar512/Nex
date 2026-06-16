import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from 'pdf-lib';
import pdfParse from 'pdf-parse';
import anthropic from '../config/anthropic';
import client from '../config/db';

interface ExtractedProfile {
  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
  };
  projects: {
    name: string;
    description: string;
    techStack: string[];
    githubUrl?: string;
  }[];
  summary: string;
}

function cleanJsonResponse(rawText: string): string {
  return rawText
    .replace(/```json/gi, '')
    .replace(/```/gi, '')
    .trim();
}

async function extractHyperlinks(pdfBuffer: Buffer): Promise<string[]> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  const urls = new Set<string>();

  for (const page of pdfDoc.getPages()) {
    const annots = page.node.lookup(PDFName.of('Annots'));

    if (!(annots instanceof PDFArray)) continue;

    for (let i = 0; i < annots.size(); i++) {
      const annot = annots.lookup(i);

      if (!(annot instanceof PDFDict)) continue;

      const action = annot.lookup(PDFName.of('A'));

      if (!(action instanceof PDFDict)) continue;

      const uri = action.lookup(PDFName.of('URI'));

      if (uri instanceof PDFString) {
        urls.add(uri.asString());
      }
    }
  }

  return Array.from(urls);
}

export async function extractProfileFromResume(
  pdfBuffer: Buffer
): Promise<{ rawText: string; structured: ExtractedProfile }> {
  // Step 1: Extract raw text from PDF
  const parsed = await pdfParse(pdfBuffer);
  const rawText = parsed.text;

  const hyperlinks = await extractHyperlinks(pdfBuffer);

  const linksSection = hyperlinks.length > 0 ? `Links found embedded in this document:${hyperlinks.join('\n')}` : '';

  // Step 2: Send to Claude with a strict JSON-only instruction
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: `You are extracting structured data from a resume. Read the resume text below and respond with ONLY a JSON object — no preamble, no markdown code blocks, no explanation. Just the raw JSON.

The JSON must match this exact shape:
{
  "skills": {
    "languages": string[],
    "frameworks": string[],
    "tools": string[]
  },
  "projects": [
    {
      "name": string,
      "description": string,
      "techStack": string[],
      "githubUrl": string (optional — only include if you find a real, specific URL for this project. Do NOT guess or use placeholder URLs like "https://github.com)
    }
  ],
  "summary": string (2-3 sentence professional summary of this candidate)
}

Resume text:
${rawText}${linksSection}`,
      },
    ],
  });

  // Step 3: Parse Claude's response as JSON
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }
  let structured: ExtractedProfile;

  try {
    const cleanedText = cleanJsonResponse(textBlock.text);

    structured = JSON.parse(cleanedText);
  } catch (error) {
    console.error('Failed to parse Claude response:', textBlock.text);
    throw new Error('AI returned malformed data. Please try again.');
  }

  return { rawText, structured };
}

export async function saveProfile(userId: string, rawText: string, structured: ExtractedProfile, githubUrl?: string) {
  return await client.profile.upsert({
    where: { userId },
    update: {
      resume: rawText,
      skills: structured.skills,
      projects: structured.projects,
      summary: structured.summary,
      ...(githubUrl && { githubUrl }),
    },
    create: {
      userId,
      resume: rawText,
      skills: structured.skills,
      projects: structured.projects,
      summary: structured.summary,
      githubUrl: githubUrl ?? null,
    },
  });
}
