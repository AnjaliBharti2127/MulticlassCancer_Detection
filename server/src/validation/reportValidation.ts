import { z } from "zod";

export const createReportSchema = z.object({
    caseId: z.string().trim().min(1),
    pathologist: z.string().trim().min(2).max(120),
    diagnosis: z.string().trim().min(2).max(2000),
    findings: z.string().trim().min(2).max(5000),
    recommendation: z.string().trim().min(2).max(3000),
    status: z.enum(["draft", "finalized"]),
}).strict();
