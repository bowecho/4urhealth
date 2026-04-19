const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string): boolean {
	return DATE_RE.test(s);
}

export function todayInTz(timezone: string): string {
	const fmt = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	return fmt.format(new Date());
}

export function addDays(date: string, delta: number): string {
	const [y, m, d] = date.split("-").map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	dt.setUTCDate(dt.getUTCDate() + delta);
	return dt.toISOString().slice(0, 10);
}

export function formatFriendlyDate(date: string, today: string): string {
	if (date === today) return "Today";
	if (date === addDays(today, -1)) return "Yesterday";
	if (date === addDays(today, 1)) return "Tomorrow";
	const [y, m, d] = date.split("-").map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	return dt.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year:
			dt.getUTCFullYear() === new Date().getUTCFullYear()
				? undefined
				: "numeric",
		timeZone: "UTC",
	});
}
