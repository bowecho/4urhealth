"use client";

type SteppableNumberInputProps = {
	id?: string;
	ariaLabel?: string;
	value: string;
	onChange: (value: string) => void;
	min: number;
	required?: boolean;
	wrapperClassName?: string;
	inputClassName: string;
};

function isNumericDraft(value: string) {
	return value === "" || /^\d*\.?\d*$/.test(value);
}

function formatDraftNumber(value: number) {
	return Number(value.toFixed(6)).toString();
}

function nudgeNumber(value: string, delta: number, min: number) {
	const parsed =
		value.trim() === "" || value === "." ? Number.NaN : Number(value);
	const base = Number.isFinite(parsed) ? parsed : min;
	return formatDraftNumber(Math.max(min, base + delta));
}

export function SteppableNumberInput({
	id,
	ariaLabel,
	value,
	onChange,
	min,
	required = false,
	wrapperClassName,
	inputClassName,
}: SteppableNumberInputProps) {
	function handleChange(next: string) {
		if (!isNumericDraft(next)) return;
		onChange(next);
	}

	function handleStep(delta: number) {
		onChange(nudgeNumber(value, delta, min));
	}

	return (
		<div
			className={wrapperClassName ? `relative ${wrapperClassName}` : "relative"}
		>
			<input
				id={id}
				aria-label={ariaLabel}
				type="text"
				inputMode="decimal"
				required={required}
				value={value}
				onChange={(e) => handleChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "ArrowUp") {
						e.preventDefault();
						handleStep(1);
					}
					if (e.key === "ArrowDown") {
						e.preventDefault();
						handleStep(-1);
					}
				}}
				className={inputClassName}
			/>
			<div className="absolute inset-y-1 right-1 flex w-8 flex-col gap-1">
				<button
					type="button"
					aria-label="Increase"
					aria-controls={id}
					onClick={() => handleStep(1)}
					className="theme-secondary-button flex-1 rounded border border-zinc-300 text-xs leading-none hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
				>
					+
				</button>
				<button
					type="button"
					aria-label="Decrease"
					aria-controls={id}
					onClick={() => handleStep(-1)}
					className="theme-secondary-button flex-1 rounded border border-zinc-300 text-xs leading-none hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
				>
					-
				</button>
			</div>
		</div>
	);
}
