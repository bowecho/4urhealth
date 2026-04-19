import {
	boolean,
	date,
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const activityLevelEnum = pgEnum("activity_level", [
	"sedentary",
	"light",
	"moderate",
	"active",
	"very_active",
]);

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),

	// App-specific profile fields (additionalFields on Better Auth's user object)
	sex: sexEnum("sex"),
	dateOfBirth: date("date_of_birth"),
	heightIn: numeric("height_in", { precision: 5, scale: 2 }),
	activityLevel: activityLevelEnum("activity_level"),
	weightGoalLbsPerWeek: numeric("weight_goal_lbs_per_week", {
		precision: 4,
		scale: 2,
	}),
	targetCalories: integer("target_calories"),
	targetProteinG: integer("target_protein_g"),
	targetFatG: integer("target_fat_g"),
	targetCarbsG: integer("target_carbs_g"),
	timezone: text("timezone"),
	onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", {
		withTimezone: true,
	}),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
		withTimezone: true,
	}),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
