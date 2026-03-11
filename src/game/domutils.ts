// Utility functions involving the DOM
export function downloadText(text: string, filename: string) {
	const blob = new Blob( [text], { type: "text/plain" })
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();

	URL.revokeObjectURL(url);
	a.remove();
}