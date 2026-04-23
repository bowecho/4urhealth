export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export type MacroTotals = {
	calories: number;
	proteinG: number;
	fatG: number;
	carbsG: number;
};

export type MealItem = MacroTotals & {
	id: string;
	foodItemId: string | null;
	servings: number;
	name: string;
};

export type FoodOption = MacroTotals & {
	id: string;
	name: string;
	brand: string | null;
	servingSize: number;
	servingUnit: string;
};

export type SavedMealItem = MacroTotals & {
	foodId: string;
	foodName: string;
	servings: number;
};

export type SavedMealDetail = {
	id: string;
	name: string;
	items: SavedMealItem[];
	totals: MacroTotals;
};
