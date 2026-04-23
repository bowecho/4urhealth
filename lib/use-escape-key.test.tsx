import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEscapeKey } from "@/lib/use-escape-key";

function Harness({ onEscape }: { onEscape: () => void }) {
	useEscapeKey(onEscape);
	return <div>Escape harness</div>;
}

describe("useEscapeKey", () => {
	it("calls the callback on Escape and ignores other keys", () => {
		const onEscape = vi.fn();
		render(<Harness onEscape={onEscape} />);

		fireEvent.keyDown(window, { key: "Enter" });
		fireEvent.keyDown(window, { key: "Escape" });

		expect(onEscape).toHaveBeenCalledTimes(1);
	});

	it("removes the listener on unmount", () => {
		const onEscape = vi.fn();
		const { unmount } = render(<Harness onEscape={onEscape} />);

		unmount();
		fireEvent.keyDown(window, { key: "Escape" });

		expect(onEscape).not.toHaveBeenCalled();
	});
});
