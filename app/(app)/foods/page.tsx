import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { FoodsList } from "@/components/foods-list";
import { db } from "@/db";
import { foodItem } from "@/db/schema";
import { requireUserId } from "@/lib/auth-server";

export default async function FoodsPage(props: PageProps<"/foods">) {
	const userId = await requireUserId();
	const { archived } = await props.searchParams;
	const showArchived = archived === "1";

	const rows = await db
		.select()
		.from(foodItem)
		.where(
			and(
				eq(foodItem.userId, userId),
				showArchived
					? isNotNull(foodItem.archivedAt)
					: isNull(foodItem.archivedAt),
			),
		)
		.orderBy(asc(foodItem.name));

	const items = rows.map((r) => ({
		id: r.id,
		name: r.name,
		brand: r.brand,
		servingSize: Number(r.servingSize),
		servingUnit: r.servingUnit,
		calories: r.calories,
		proteinG: Number(r.proteinG),
		fatG: Number(r.fatG),
		carbsG: Number(r.carbsG),
		archivedAt: r.archivedAt,
	}));

	return (
		<main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
			<FoodsList items={items} showArchived={showArchived} />
		</main>
	);
}
