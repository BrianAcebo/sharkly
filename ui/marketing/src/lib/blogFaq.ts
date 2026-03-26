/**
 * Strip HTML for plain-text FAQ answers (schema must match visible content).
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type ExtractedFaq = { name: string; text: string };

/**
 * Parse h2/h3 headings that look like questions and the following body until the next h2/h3.
 * Matches glossary / guide style FAQs (see schema markup article on sharkly.co/blog).
 */
export function extractFaqsFromHtml(html: string | null | undefined, maxFaqs = 40): ExtractedFaq[] {
  if (!html || !html.trim()) return [];

  const headingRe = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const matches: { end: number; question: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null) {
    matches.push({
      end: m.index + m[0].length,
      question: stripHtml(m[2]),
    });
  }

  const faqs: ExtractedFaq[] = [];
  for (let i = 0; i < matches.length; i++) {
    const q = matches[i].question.trim();
    const looksLikeQuestion =
      /[?？]\s*$/.test(q) ||
      /^(what|why|how|when|where|who|whom|which|can|could|do|does|did|is|are|was|were|will|would|should|must|may)\b/i.test(
        q
      );
    if (!looksLikeQuestion) continue;

    const bodyStart = matches[i].end;
    const bodyEnd = i + 1 < matches.length ? html.indexOf('<h', bodyStart + 1) : html.length;
    const slice =
      bodyEnd === -1 ? html.slice(bodyStart) : html.slice(bodyStart, Math.min(bodyEnd, html.length));
    let text = stripHtml(slice);
    if (text.length < 20) continue;
    if (text.length > 8000) text = text.slice(0, 8000);

    faqs.push({ name: q, text });
    if (faqs.length >= maxFaqs) break;
  }

  return faqs;
}
