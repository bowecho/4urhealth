export function isPlaywrightHarnessEnabled() {
	return (
		process.env.PLAYWRIGHT === "1" &&
		process.env.NODE_ENV !== "production" &&
		process.env.VERCEL !== "1"
	);
}
