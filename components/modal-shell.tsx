"use client";
import type { ReactNode } from "react";

export function ModalShell({
	children,
	onClose,
}: {
	children: ReactNode;
	onClose: () => void;
}) {
	return (
		<div className="fixed inset-0 z-10 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="Close dialog"
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
			/>
			<div className="relative z-10">{children}</div>
		</div>
	);
}
