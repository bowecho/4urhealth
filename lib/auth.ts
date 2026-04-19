import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";

function extractHost(value: string): string | null {
	try {
		return new URL(value).host;
	} catch {
		return value;
	}
}

const canonicalAppUrl =
	process.env.BETTER_AUTH_URL ||
	process.env.NEXT_PUBLIC_APP_URL ||
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
	"http://localhost:3000";

const allowedHosts = Array.from(
	new Set(
		[
			"localhost:3000",
			"127.0.0.1:3000",
			process.env.BETTER_AUTH_URL,
			process.env.NEXT_PUBLIC_APP_URL,
			process.env.VERCEL_URL,
			process.env.VERCEL_PROJECT_PRODUCTION_URL,
		]
			.filter((value): value is string => Boolean(value))
			.map(extractHost)
			.filter((value): value is string => Boolean(value)),
	),
);

export const auth = betterAuth({
	baseURL: {
		allowedHosts,
		protocol: canonicalAppUrl.startsWith("http://localhost") ? "http" : "https",
		fallback: canonicalAppUrl,
	},
	database: drizzleAdapter(db, { provider: "pg" }),
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		disableSignUp: true,
		minPasswordLength: 10,
		requireEmailVerification: false,
	},
	rateLimit: {
		enabled: true,
		window: 60,
		max: 10,
		customRules: {
			"/sign-in/email": {
				window: 300,
				max: 5,
			},
			"/sign-up/email": {
				window: 3600,
				max: 1,
			},
		},
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
			themePreference: { type: "string", required: false, input: false },
			onboardedAt: { type: "date", required: false, input: false },
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30,
		updateAge: 60 * 60 * 24,
		// Cookie cache disabled: direct DB writes (e.g. onboardedAt updates)
		// need to be reflected on the next request without a 5-minute lag.
		cookieCache: { enabled: false },
	},
	advanced: {
		useSecureCookies: process.env.NODE_ENV === "production",
		trustedProxyHeaders: true,
		ipAddress: {
			ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
		},
	},
	plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
