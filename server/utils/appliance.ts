import { z } from 'zod'

export const applianceCategories = ['wet', 'heating', 'ev', 'cooking', 'leisure', 'other'] as const
export const applianceFlexibilities = ['high', 'medium', 'low'] as const

// Shared validation for the admin create/update appliance endpoints.
export const applianceInputSchema = z.object({
  name: z.string().min(2, 'Name is too short').max(60),
  icon: z.string().min(1, 'Icon is required'),
  category: z.enum(applianceCategories),
  flexibility: z.enum(applianceFlexibilities),
  typicalPowerKw: z.number().positive().nullable().optional(),
  typicalDurationMin: z.number().int().positive().nullable().optional(),
  description: z.string().max(200).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
})

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
