import { notFound, redirect } from "next/navigation";
import { DayView } from "@/components/day-view";
import { requireAppPageContext } from "@/lib/app-page";
import { isIsoDate } from "@/lib/date";

export default async function DayPage(props: PageProps<"/day/[date]">) {
	const { today } = await requireAppPageContext();
	const { date } = await props.params;
	if (!isIsoDate(date)) notFound();
	if (date === today) redirect("/");
	return <DayView date={date} today={today} />;
}
