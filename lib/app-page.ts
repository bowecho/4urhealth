import "server-only";
import { requireSession } from "@/lib/auth-server";
import { todayInTz } from "@/lib/date";

export async function requireAppPageContext() {
	const session = await requireSession();
	const timezone = session.user.timezone || "UTC";

	return {
		session,
		userId: session.user.id,
		timezone,
		today: todayInTz(timezone),
	};
}
