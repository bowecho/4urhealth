import { DayView } from "@/components/day-view";
import { requireSession } from "@/lib/auth-server";
import { todayInTz } from "@/lib/date";

export default async function TodayPage() {
	const session = await requireSession();
	const tz = session.user.timezone || "UTC";
	const today = todayInTz(tz);
	return <DayView date={today} today={today} />;
}
