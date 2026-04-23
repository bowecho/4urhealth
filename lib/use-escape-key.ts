"use client";

import { useEffect } from "react";

export function useEscapeKey(onEscape: () => void) {
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") onEscape();
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onEscape]);
}
