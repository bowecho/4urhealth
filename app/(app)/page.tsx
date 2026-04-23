import { DayView } from "@/components/day-view";
import { requireAppPageContext } from "@/lib/app-page";

export default async function TodayPage() {
	const { today } = await requireAppPageContext();
	return <DayView date={today} today={today} />;
}
