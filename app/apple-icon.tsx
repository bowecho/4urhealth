import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
	return new ImageResponse(
		<div
			style={{
				fontSize: 112,
				background: "#0a0a0a",
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				color: "#10b981",
				fontWeight: 700,
				borderRadius: 40,
			}}
		>
			4u
		</div>,
		{ ...size },
	);
}
