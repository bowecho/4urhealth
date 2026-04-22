import { z } from "zod";

export const FoodSchema = z.object({
	name: z.string().trim().min(1).max(120),
	brand: z
		.string()
		.trim()
		.max(120)
		.optional()
		.transform((v) => (v ? v : null)),
	servingSize: z.number().min(0.01).max(1000),
	servingUnit: z.string().trim().min(1).max(40),
	calories: z.number().int().min(0).max(10000),
	proteinG: z.number().min(0).max(500),
	fatG: z.number().min(0).max(500),
	carbsG: z.number().min(0).max(1000),
});

export type FoodInput = z.input<typeof FoodSchema>;
