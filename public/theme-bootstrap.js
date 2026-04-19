(() => {
	const root = document.documentElement;
	if (root.dataset.themePreference) return;
	const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	root.classList.toggle("dark", isDark);
	root.style.colorScheme = isDark ? "dark" : "light";
})();
