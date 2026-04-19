import { notFound, redirect } from "next/navigation";
import { DayView } from "@/components/day-view";
import { requireSession } from "@/lib/auth-server";
import { isIsoDate, todayInTz } from "@/lib/date";

export default async function DayPage(props: PageProps<"/day/[date]">) {
	const session = await requireSession();
	const { date } = await props.params;
	if (!isIsoDate(date)) notFound();
	const tz = session.user.timezone || "UTC";
	const today = todayInTz(tz);
	if (date === today) redirect("/");
	return <DayView date={date} today={today} />;
}
