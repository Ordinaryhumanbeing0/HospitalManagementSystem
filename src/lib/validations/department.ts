import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().trim().min(2, { message: 'Department name must be at least 2 characters.' }),
  description: z.string().trim().optional().nullable(),
});

export const updateDepartmentSchema = departmentSchema.extend({
  id: z.string().min(1, { message: 'Department ID is required.' }),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
