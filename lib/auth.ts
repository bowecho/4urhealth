import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";

const trustedOrigins = [
	process.env.NEXT_PUBLIC_APP_URL,
	process.env.BETTER_AUTH_URL,
	process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter((o): o is string => Boolean(o));

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		minPasswordLength: 10,
		requireEmailVerification: false,
	},
	user: {
		additionalFields: {
			sex: { type: "string", required: false, input: false },
			dateOfBirth: { type: "string", required: false, input: false },
			heightIn: { type: "number", required: false, input: false },
			activityLevel: { type: "string", required: false, input: false },
			weightGoalLbsPerWeek: { type: "number", required: false, input: false },
			targetCalories: { type: "number", required: false, input: false },
			targetProteinG: { type: "number", required: false, input: false },
			targetFatG: { type: "number", required: false, input: false },
			targetCarbsG: { type: "number", required: false, input: false },
			timezone: { type: "string", required: false, input: false },
			onboardedAt: { type: "date", required: false, input: false },
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30,
		updateAge: 60 * 60 * 24,
		cookieCache: { enabled: true, maxAge: 5 * 60 },
	},
	advanced: {
		useSecureCookies: process.env.NODE_ENV === "production",
	},
	trustedOrigins,
	plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
