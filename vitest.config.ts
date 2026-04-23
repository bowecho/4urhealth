import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./tests/setup.ts"],
		include: ["tests/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
		exclude: ["e2e/**", "node_modules/**", ".next/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary", "html"],
			include: [
				"app/**/*.{ts,tsx}",
				"components/**/*.{ts,tsx}",
				"lib/**/*.{ts,tsx}",
			],
			exclude: [
				"**/*.test.{ts,tsx}",
				"app/globals.css",
				"app/favicon.ico",
				"tests/**",
				"e2e/**",
				".next/**",
				"node_modules/**",
			],
		},
	},
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./", import.meta.url)),
			"server-only": fileURLToPath(
				new URL("./tests/server-only-stub.ts", import.meta.url),
			),
		},
	},
});
