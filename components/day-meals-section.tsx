"use client";

import type { FoodOption, MealItem } from "@/components/day-view";
import { MealCard } from "@/components/meal-card";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type DayMealSection = {
	mealType: MealType;
	label: string;
	items: MealItem[];
};

export function DayMealsSection({
	date,
	foods,
	meals,
}: {
	date: string;
	foods: FoodOption[];
	meals: DayMealSection[];
}) {
	return meals.map((meal) => (
		<MealCard
			key={meal.mealType}
			date={date}
			mealType={meal.mealType}
			label={meal.label}
			items={meal.items}
			foods={foods}
		/>
	));
}
