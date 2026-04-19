import { eq } from "drizzle-orm";
import { SettingsView } from "@/components/settings-view";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireSession } from "@/lib/auth-server";

export default async function SettingsPage() {
	const session = await requireSession();
	const userId = session.user.id;

	const [profile] = await db
		.select()
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	if (!profile) {
		throw new Error("Profile not found");
	}

	return (
		<main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
			<SettingsView
				profile={{
					name: profile.name,
					email: profile.email,
					sex: profile.sex,
					dateOfBirth: profile.dateOfBirth,
					heightIn: profile.heightIn ? Number(profile.heightIn) : null,
					activityLevel: profile.activityLevel,
					weightGoalLbsPerWeek: profile.weightGoalLbsPerWeek
						? Number(profile.weightGoalLbsPerWeek)
						: null,
					targetCalories: profile.targetCalories,
					targetProteinG: profile.targetProteinG,
					targetFatG: profile.targetFatG,
					targetCarbsG: profile.targetCarbsG,
					timezone: profile.timezone,
				}}
			/>
		</main>
	);
}
