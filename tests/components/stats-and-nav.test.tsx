import { render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppNav } from "@/components/app-nav";
import { StatsView } from "@/components/stats-view";

const { usePathname, signOutAction } = vi.hoisted(() => ({
	usePathname: vi.fn(),
	signOutAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	usePathname,
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("recharts", () => {
	const Mock = ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	);
	return {
		Cell: () => null,
		Pie: Mock,
		PieChart: Mock,
		Tooltip: () => null,
	};
});

vi.mock("@/app/(app)/actions", () => ({
	signOutAction,
}));

describe("StatsView", () => {
	it("renders empty states when no data is logged", () => {
		render(
			<StatsView
				range="week"
				today="2026-04-22"
				dailySeries={[
					{ date: "2026-04-20", calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
					{ date: "2026-04-21", calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
				]}
				weightSeries={[]}
				targets={{
					calories: null,
					proteinG: null,
					fatG: null,
					carbsG: null,
				}}
			/>,
		);

		expect(screen.getByText("Days logged")).toBeInTheDocument();
		expect(screen.getByText("0/2")).toBeInTheDocument();
		expect(screen.getByText("Adherence")).toBeInTheDocument();
		expect(screen.getAllByText("—")).toHaveLength(3);
		expect(
			screen.getByText("No meals logged in this range."),
		).toBeInTheDocument();
		expect(screen.getByText("No macros to show yet.")).toBeInTheDocument();
		expect(
			screen.getByText("No weight entries in this range."),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Week" })).toHaveAttribute(
			"href",
			"/stats?range=week",
		);
	});

	it("renders averages, adherence, streak, and weight change from logged data", () => {
		render(
			<StatsView
				range="month"
				today="2026-04-22"
				dailySeries={[
					{
						date: "2026-04-20",
						calories: 2100,
						proteinG: 150,
						fatG: 70,
						carbsG: 180,
					},
					{
						date: "2026-04-21",
						calories: 1900,
						proteinG: 160,
						fatG: 65,
						carbsG: 170,
					},
					{
						date: "2026-04-22",
						calories: 1800,
						proteinG: 155,
						fatG: 60,
						carbsG: 165,
					},
					{
						date: "2026-04-23",
						calories: 1500,
						proteinG: 140,
						fatG: 50,
						carbsG: 140,
					},
				]}
				weightSeries={[
					{ date: "2026-04-20", weightLbs: 200 },
					{ date: "2026-04-22", weightLbs: 198.5 },
				]}
				targets={{
					calories: 2000,
					proteinG: 150,
					fatG: 65,
					carbsG: 175,
				}}
			/>,
		);

		expect(screen.getByText("4/4")).toBeInTheDocument();
		expect(screen.getByText("1,825")).toBeInTheDocument();
		expect(screen.getByText("Under 2000")).toBeInTheDocument();
		expect(screen.getByText("75%")).toBeInTheDocument();
		expect(screen.getByText("2 days")).toBeInTheDocument();
		expect(screen.getByText("151.3g")).toBeInTheDocument();
		expect(screen.getByText("61.3g")).toBeInTheDocument();
		expect(screen.getByText("163.8g")).toBeInTheDocument();
		expect(screen.getByText(/200\.0 → 198\.5 lb/)).toBeInTheDocument();
		expect(screen.getByText("(-1.5 lb)")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Month" }).className).toContain(
			"theme-active-pill",
		);
	});
});

describe("AppNav", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("marks Today active on the home route and renders both sign-out controls", () => {
		usePathname.mockReturnValue("/");
		render(<AppNav />);

		expect(screen.getByRole("link", { name: /4urhealth/ })).toHaveAttribute(
			"href",
			"/",
		);
		expect(screen.getByRole("link", { name: "Today" }).className).toContain(
			"theme-active-pill",
		);
		expect(screen.getAllByRole("button", { name: "Sign out" })).toHaveLength(2);
	});

	it("marks nested routes active by prefix", () => {
		usePathname.mockReturnValue("/meals/meal-1");
		render(<AppNav />);

		expect(screen.getByRole("link", { name: "Meals" }).className).toContain(
			"theme-active-pill",
		);
		expect(screen.getByRole("link", { name: "Foods" }).className).not.toContain(
			"theme-active-pill",
		);
	});
});
