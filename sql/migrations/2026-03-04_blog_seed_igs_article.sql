-- Seed the first IGS glossary article.
-- The content_html field is what the Astro blog renders — generated from the Tiptap JSON.
-- To add more posts, use the Admin CMS at /admin/blog

INSERT INTO public.blog_posts (
  category_id,
  title,
  slug,
  excerpt,
  content_html,
  meta_title,
  meta_description,
  status,
  published_at,
  author_name,
  reading_time_minutes,
  featured
)
SELECT
  c.id,
  'What Is Information Gain Score (IGS)? The Google Patent That Changes SEO',
  'what-is-information-gain-score-igs',
  'Most SEO tools tell you to write longer, better content. IGS (Information Gain Score) is the Google patent that explains why that advice is wrong — and what actually earns rankings in 2026.',
  '<h2>The short version</h2>
<p>IGS stands for <strong>Information Gain Score</strong>. It comes from <a href="https://patents.google.com/patent/US20190155948A1" target="_blank" rel="noopener noreferrer">Google patent US20190155948A1</a>. The core idea: when Google evaluates your page, it doesn''t just ask "is this good content?" It asks <em>"does this page tell me something I haven''t already seen at the top of the search results?"</em></p>
<p>If your page covers the exact same ground as the top five competitors — even if it''s longer, better written, and more comprehensive — Google scores it low on information gain. You added nothing new to the corpus.</p>
<p>This is why the Skyscraper Technique stopped working. Writing a "better" version of what already ranks doesn''t gain information. It just reshuffles the same information.</p>
<h2>The five IGS signals</h2>
<p>Sharkly detects five signals that Google''s patent identifies as markers of genuine information gain:</p>
<h3>1. Original research (+5 points)</h3>
<p>You produced data that didn''t exist before. A survey, a test, an experiment, an analysis of your own customer data. <em>"We analysed 500 drain cleaning jobs and found that 73% were caused by three things."</em> Nobody else has that number. Google can''t find it anywhere else in the index.</p>
<h3>2. Expert quotes (+4 points)</h3>
<p>A real attributed quote from a named person with relevant credentials. Not a paraphrase. An actual quote with <em>"said"</em>, <em>"explained"</em>, or <em>"according to [name]"</em>. This signals the page accessed a human source that the algorithm couldn''t have crawled elsewhere.</p>
<h3>3. First-hand experience (+3 points)</h3>
<p>First-person language combined with experience verbs. <em>"We tested this product for 30 days and found..."</em> or <em>"In our experience treating blocked drains in older properties..."</em> It signals the content comes from lived experience, not research aggregation.</p>
<h3>4. Unique visualisation (+2 points)</h3>
<p>A comparison table, diagram, or structured data presentation that didn''t exist in competitor pages. Not decorative images — a table that organises information in a way that''s genuinely useful and novel.</p>
<h3>5. Contrarian position (+1 point)</h3>
<p>Taking an evidence-backed stance that goes against the consensus in the top results. <em>"Despite what most guides say, you should actually..."</em> with reasoning behind it. It signals independent thinking rather than synthesis.</p>
<h2>Why it matters in practice</h2>
<p>If your IGS score is zero — meaning none of those five signals are detectable — your content is a Skyscraper. It might be 4,000 words of genuinely helpful, well-structured, perfectly optimised content. Google still sees it as a remix of what already exists.</p>
<p>The signals are also cumulative. A page with original data <strong>and</strong> an expert quote <strong>and</strong> a contrarian position is genuinely difficult for competitors to beat — they''d have to reproduce the research, find the same expert, and make the same argument. That''s a content moat.</p>
<h2>How Sharkly uses this</h2>
<p>Sharkly''s workspace fires a "Skyscraper Warning" when your IGS score is zero. It''s not a style critique — it''s a structural ranking problem. The score is calculated from detectable proxies in your content: percentage signs (data), quote patterns (expert quotes), first-person language (experience), structured tables (visualisation), and contrarian signal phrases.</p>
<p>One important caveat: Sharkly''s IGS detection is a client-side heuristic. The real Google patent operates on the full document against the full SERP corpus, which no tool can replicate. A score of zero in Sharkly is a warning to add these elements. It doesn''t mean Google has definitively scored you zero. But if none of the signals are present, the warning is almost always right.</p>
<h2>The bottom line</h2>
<p>Stop trying to write the "best" version of what already ranks. Start writing the <em>only</em> version that contains something nobody else has. That''s what IGS rewards — and it''s the sustainable path to rankings that hold.</p>',
  'What Is Information Gain Score (IGS)? | Sharkly SEO Glossary',
  'IGS (Information Gain Score) is the Google patent signal that determines whether your content adds something new to the web. Learn the 5 signals that earn rankings in 2026.',
  'published',
  now(),
  'Sharkly Team',
  5,
  true
FROM public.blog_categories c
WHERE c.slug = 'glossary'
ON CONFLICT (slug) DO NOTHING;
