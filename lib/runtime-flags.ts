export function isPlaywrightHarnessEnabled() {
	return process.env.PLAYWRIGHT === "1";
}
