/**
 * Server-side Tiptap JSON extraction for CRO fixes API.
 * Mirrors extractPlainText and extractH1s from src/lib/seoScore.ts.
 */

type TiptapNode = {
	type?: string;
	text?: string;
	attrs?: Record<string, unknown>;
	content?: TiptapNode[];
};

function walkNodes(nodes: TiptapNode[], visitor: (n: TiptapNode) => void): void {
	for (const n of nodes) {
		visitor(n);
		if (n.content) walkNodes(n.content, visitor);
	}
}

export function extractPlainText(doc: TiptapNode | null): string {
	if (!doc) return '';
	const parts: string[] = [];
	walkNodes(doc.content ?? [], (n) => {
		if (n.text) parts.push(n.text);
	});
	return parts.join(' ');
}

export function extractH1s(doc: TiptapNode | null): string[] {
	if (!doc) return [];
	const result: string[] = [];
	walkNodes(doc.content ?? [], (n) => {
		if (n.type === 'heading' && (n.attrs?.level as number) === 1) {
			result.push(extractPlainText(n));
		}
	});
	return result;
}
