import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'member']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    role: UserRoleSchema,
    created_at: z.string(),
    updated_at: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    email: z.string().trim().toLowerCase().email('Valid email is required').max(254),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128),
    role: UserRoleSchema.default('member'),
});

export type CreateUserInput = z.input<typeof CreateUserSchema>;

export const UpdateUserSchema = z
    .object({
        name: z.string().trim().min(1, 'Name cannot be empty').max(120).optional(),
        email: z.string().trim().toLowerCase().email('Valid email is required').max(254).optional(),
        password: z.string().min(6, 'Password must be at least 6 characters').max(128).optional(),
        role: UserRoleSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided for update',
    });

export type UpdateUserInput = z.input<typeof UpdateUserSchema>;

export const LoginSchema = z.object({
    email: z.string().trim().toLowerCase().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
