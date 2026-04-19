import { sql } from "drizzle-orm";
import {
	date,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);

export const weightLog = pgTable(
	"weight_log",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		date: date("date").notNull(),
		weightLbs: numeric("weight_lbs", { precision: 5, scale: 1 }).notNull(),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		unique("weight_log_user_date_unique").on(t.userId, t.date),
		index("weight_log_user_date_idx").on(t.userId, t.date),
	],
);

export const foodItem = pgTable(
	"food_item",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		brand: text("brand"),
		servingSize: numeric("serving_size", { precision: 8, scale: 2 }).notNull(),
		servingUnit: text("serving_unit").notNull(),
		calories: integer("calories").notNull(),
		proteinG: numeric("protein_g", { precision: 6, scale: 1 }).notNull(),
		fatG: numeric("fat_g", { precision: 6, scale: 1 }).notNull(),
		carbsG: numeric("carbs_g", { precision: 6, scale: 1 }).notNull(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("food_item_user_idx").on(t.userId),
		index("food_item_name_trgm_idx")
			.using("gin", sql`${t.name} gin_trgm_ops`)
			.where(sql`${t.archivedAt} IS NULL`),
	],
);

export const savedMeal = pgTable(
	"saved_meal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [index("saved_meal_user_idx").on(t.userId)],
);

export const savedMealItem = pgTable(
	"saved_meal_item",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		savedMealId: uuid("saved_meal_id")
			.notNull()
			.references(() => savedMeal.id, { onDelete: "cascade" }),
		foodItemId: uuid("food_item_id")
			.notNull()
			.references(() => foodItem.id, { onDelete: "restrict" }),
		servings: numeric("servings", { precision: 6, scale: 2 }).notNull(),
		sortOrder: integer("sort_order").notNull().default(0),
	},
	(t) => [index("saved_meal_item_meal_idx").on(t.savedMealId)],
);

export const mealLog = pgTable(
	"meal_log",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		date: date("date").notNull(),
		mealType: mealTypeEnum("meal_type").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		unique("meal_log_user_date_type_unique").on(t.userId, t.date, t.mealType),
		index("meal_log_user_date_idx").on(t.userId, t.date),
	],
);

export const mealLogItem = pgTable(
	"meal_log_item",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		mealLogId: uuid("meal_log_id")
			.notNull()
			.references(() => mealLog.id, { onDelete: "cascade" }),
		foodItemId: uuid("food_item_id").references(() => foodItem.id, { onDelete: "set null" }),
		servings: numeric("servings", { precision: 6, scale: 2 }).notNull(),
		sortOrder: integer("sort_order").notNull().default(0),

		// Snapshots so historical logs stay accurate when the source food is edited
		nameSnapshot: text("name_snapshot").notNull(),
		caloriesSnapshot: integer("calories_snapshot").notNull(),
		proteinGSnapshot: numeric("protein_g_snapshot", { precision: 7, scale: 1 }).notNull(),
		fatGSnapshot: numeric("fat_g_snapshot", { precision: 7, scale: 1 }).notNull(),
		carbsGSnapshot: numeric("carbs_g_snapshot", { precision: 7, scale: 1 }).notNull(),

		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [index("meal_log_item_meal_idx").on(t.mealLogId)],
);
