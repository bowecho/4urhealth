import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "4urhealth",
		short_name: "4urhealth",
		description: "Personal nutrition and weight tracker",
		start_url: "/",
		display: "standalone",
		background_color: "#0a0a0a",
		theme_color: "#0a0a0a",
		orientation: "portrait",
		icons: [
			{
				src: "/icon.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "any",
			},
			{
				src: "/apple-icon",
				sizes: "180x180",
				type: "image/png",
				purpose: "any",
			},
		],
	};
}
