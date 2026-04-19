import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
	swSrc: "app/sw.ts",
	swDest: "public/sw.js",
	disable: process.env.NODE_ENV === "development",
	cacheOnNavigation: true,
});

const isDevelopment = process.env.NODE_ENV === "development";

const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	"base-uri 'self'",
	"frame-ancestors 'none'",
	"object-src 'none'",
	`script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"font-src 'self' data:",
	`connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
	"manifest-src 'self'",
	"worker-src 'self' blob:",
	"form-action 'self'",
	"upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=()",
	},
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
];

const nextConfig: NextConfig = {
	async headers() {
		return [
			{
				source: "/:path*",
				headers: SECURITY_HEADERS,
			},
		];
	},
};

export default withSerwist(nextConfig);
