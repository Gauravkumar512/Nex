import z from 'zod';

export const createJobSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyWebsite: z.string().url().optional(),
  role: z.string().min(1, 'Role is required'),
  jobDescription: z.string().min(15, 'Job description seems too short'),
  hrEmail: z.string().email().optional(),
  hrName: z.string().optional(),
  source: z.enum(['WELLFOUND', 'LINKEDIN', 'INDEED', 'REFERRAL', 'COLD', 'OTHER']).default('OTHER'),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
