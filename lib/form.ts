export function parseRequiredNumber(value: string, label: string) {
	if (value.trim() === "") throw new Error(`${label} is required`);
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) throw new Error(`${label} is invalid`);
	return parsed;
}
