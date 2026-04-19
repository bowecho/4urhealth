CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'light', 'moderate', 'active', 'very_active');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sex" "sex",
	"date_of_birth" date,
	"height_in" numeric(5, 2),
	"activity_level" "activity_level",
	"weight_goal_lbs_per_week" numeric(4, 2),
	"target_calories" integer,
	"target_protein_g" integer,
	"target_fat_g" integer,
	"target_carbs_g" integer,
	"timezone" text,
	"onboarded_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"serving_size" numeric(8, 2) NOT NULL,
	"serving_unit" text NOT NULL,
	"calories" integer NOT NULL,
	"protein_g" numeric(6, 1) NOT NULL,
	"fat_g" numeric(6, 1) NOT NULL,
	"carbs_g" numeric(6, 1) NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_log_user_date_type_unique" UNIQUE("user_id","date","meal_type")
);
--> statement-breakpoint
CREATE TABLE "meal_log_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_log_id" uuid NOT NULL,
	"food_item_id" uuid,
	"servings" numeric(6, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name_snapshot" text NOT NULL,
	"calories_snapshot" integer NOT NULL,
	"protein_g_snapshot" numeric(7, 1) NOT NULL,
	"fat_g_snapshot" numeric(7, 1) NOT NULL,
	"carbs_g_snapshot" numeric(7, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_meal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_meal_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saved_meal_id" uuid NOT NULL,
	"food_item_id" uuid NOT NULL,
	"servings" numeric(6, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"weight_lbs" numeric(5, 1) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weight_log_user_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_item" ADD CONSTRAINT "food_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log" ADD CONSTRAINT "meal_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_item" ADD CONSTRAINT "meal_log_item_meal_log_id_meal_log_id_fk" FOREIGN KEY ("meal_log_id") REFERENCES "public"."meal_log"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_item" ADD CONSTRAINT "meal_log_item_food_item_id_food_item_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_meal" ADD CONSTRAINT "saved_meal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_meal_item" ADD CONSTRAINT "saved_meal_item_saved_meal_id_saved_meal_id_fk" FOREIGN KEY ("saved_meal_id") REFERENCES "public"."saved_meal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_meal_item" ADD CONSTRAINT "saved_meal_item_food_item_id_food_item_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_log" ADD CONSTRAINT "weight_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_item_user_idx" ON "food_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "food_item_name_trgm_idx" ON "food_item" USING gin ("name" gin_trgm_ops) WHERE "food_item"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "meal_log_user_date_idx" ON "meal_log" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "meal_log_item_meal_idx" ON "meal_log_item" USING btree ("meal_log_id");--> statement-breakpoint
CREATE INDEX "saved_meal_user_idx" ON "saved_meal" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_meal_item_meal_idx" ON "saved_meal_item" USING btree ("saved_meal_id");--> statement-breakpoint
CREATE INDEX "weight_log_user_date_idx" ON "weight_log" USING btree ("user_id","date");