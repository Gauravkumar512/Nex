import { JobStatus } from '@prisma/client';
import client from '../config/db';
import { CreateJobInput } from '../schemas/job.schema';
import { scoreJobMatch } from './match.service';

export async function createJob(userId: string, input: CreateJobInput) {
  const company = await client.company.upsert({
    where: {
      name_website: {
        name: input.companyName,
        website: input.companyWebsite ?? '',
      },
    },
    update: {},
    create: {
      name: input.companyName,
      website: input.companyWebsite ?? '',
    },
  });

  const profile = await client.profile.findUnique({
    where: { userId },
  });
  if (!profile) {
    throw new Error('Profile not found. Upload a resume before adding jobs.');
  }

  const job = await client.job.create({
    data: {
      userId,
      companyId: company.id,
      role: input.role,
      jobDescription: input.jobDescription,
      hrEmail: input.hrEmail ?? null,
      hrName: input.hrName ?? null,
      source: input.source,

      statusHistory: {
        create: { status: 'SAVED' },
      },
    },
  });

  const matchResult = await scoreJobMatch(
    profile.summary ?? '',
    profile.skills,
    profile.projects,
    input.jobDescription
  );

  const updatedJob = await client.job.update({
    where: { id: job.id },
    data: {
      matchScore: matchResult.matchScore,
      matchBreakdown: {
        matched: matchResult.matched,
        missing: matchResult.missing,
        reasoning: matchResult.reasoning,
      },
    },
    include: { company: true },
  });

  return updatedJob;
}

export async function getJobs(userId: string) {
  return await client.job.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateJobStatus(userId: string, jobId: string, newStatus: JobStatus) {
  const job = await client.job.findUnique({
    where: { id: jobId },
  });

  if (!job || job.userId !== userId) {
    throw new Error('Job not found');
  }

  const [updatedJob] = await client.$transaction([
    client.job.update({
      where: { id: jobId },
      data: {
        status: newStatus,
        ...(newStatus === 'APPLIED' && { appliedAt: new Date() }),
      },
      include: { company: true },
    }),
    client.jobStatusHistory.create({
      data: {
        jobId,
        status: newStatus,
      },
    }),
  ]);

  return updatedJob;
}
