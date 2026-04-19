CREATE TYPE "public"."theme_preference" AS ENUM('light', 'dark');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "theme_preference" "theme_preference";