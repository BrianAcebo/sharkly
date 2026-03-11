-- Seed: Reverse Silo & Internal Linking glossary post
-- Category: Glossary
-- Reading time: ~9 min

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
  'The Reverse Silo: The Internal Linking Strategy That Actually Moves Rankings',
  'reverse-silo-internal-linking-strategy',
  'Most SEOs spend months building backlinks while ignoring the one thing sitting right in front of them. The reverse silo is the internal linking architecture — derived directly from Google patent US8117209B1 — that concentrates link equity exactly where you need it most.',
  '<h2>Why classic PageRank is dead — and what replaced it</h2>
<p>Before we talk about the reverse silo, you need to understand why it works — and that means correcting something most SEO guides still get wrong.</p>
<p>The classic PageRank formula you''ve probably seen distributes equity equally across every link on a page. A footer link and a body-text editorial link from the same page pass <strong>identical</strong> amounts of PageRank. This is the random-surfer assumption: a user clicks any link on a page with equal probability.</p>
<p><strong>That model was superseded in 2010.</strong></p>
<p>Google''s Reasonable Surfer patent (<a href="https://patents.google.com/patent/US8117209B1" target="_blank" rel="noopener noreferrer">US8117209B1</a> — filed by Jeffrey Dean, Corin Anderson, and Alexis Battle at Google Inc.) replaced the random-surfer assumption with a far more accurate model. The updated formula looks like this:</p>
<pre><code>LinkWeight(link) = PR(source) × ClickProbability(link)</code></pre>
<p>A link is only worth something if a real person would plausibly click it. And the probability of a click is determined by five factors:</p>
<ol>
<li><strong>Position</strong> — body text, sidebar, navigation, or footer</li>
<li><strong>Anchor text</strong> — length and relevance (2–5 descriptive words score highest)</li>
<li><strong>Font size and visual prominence</strong></li>
<li><strong>Topical relevance</strong> of the source page to the destination</li>
<li><strong>Link type</strong> — editorial vs. functional</li>
</ol>
<p>This changes everything. A footer link from a high-authority domain may pass less equity than a body-text editorial link from a mid-authority site. Placement is not a stylistic preference — it is a first-class SEO variable with documented, measurable consequences.</p>

<h2>The link placement equity table</h2>
<p>Based on the Reasonable Surfer model, here is how link placement maps to relative link equity:</p>
<table>
<thead><tr><th>Placement</th><th>Relative Equity</th><th>Why</th></tr></thead>
<tbody>
<tr><td>Body text, early in article</td><td><strong>1.00× — Very High</strong></td><td>Highest click probability. Contextual, prominent, within the reader''s peak attention zone. The <em>first</em> link to a destination in a document passes more equity than subsequent links to the same page.</td></tr>
<tr><td>Body text, late in article</td><td><strong>0.80× — High</strong></td><td>Still editorial and contextual, but fewer readers reach the bottom of an article.</td></tr>
<tr><td>Above-fold sidebar</td><td><strong>0.50× — Medium</strong></td><td>Visible but disconnected from the content flow — lower click probability.</td></tr>
<tr><td>Navigation menu</td><td><strong>0.30× — Low</strong></td><td>Functional, not editorial. The patent explicitly identifies nav links as low click-probability.</td></tr>
<tr><td>Footer</td><td><strong>0.15× — Very Low</strong></td><td>The patent explicitly identifies footer links as low click-probability. Footer link farms are the reason Google discounts these heavily.</td></tr>
</tbody>
</table>
<p>The implication for your own site is unambiguous: where you place an internal link determines how much of your page''s authority that link actually passes. A footer link to your target page is almost worthless. A body-text link in the first 400 words is your most powerful internal SEO tool.</p>

<h2>What is the reverse silo?</h2>
<p>The traditional silo structure creates siloed sections of a site — links flow downward from parent pages to child pages. It is an information architecture model built for crawlability.</p>
<p>The <strong>reverse silo flips the link equity flow.</strong></p>
<p>Instead of authority flowing down from a hub page to articles below it, the reverse silo directs every supporting article to actively <em>push authority upward</em> toward the money page — the page you most want to rank. It works because of the Reasonable Surfer model: when every supporting article in a cluster contains a body-text link to the money page, placed early, with descriptive anchor text, that money page accumulates compounding internal link equity from every page in the cluster simultaneously.</p>
<p>The architecture has three components:</p>

<h3>1. The money page (hub)</h3>
<p>One or more target pages sit at the top. These are your conversion-focused, commercial-intent pages — the pages you want to rank in competitive positions. They cover the core topic at a broad, authoritative level.</p>

<h3>2. Supporting articles (spokes)</h3>
<p>Surrounding the money page is a cluster of supporting articles, each one covering a distinct user sub-intent within the broader topic. The number of articles is not arbitrary — it is determined by how many genuine user questions exist in the topic space:</p>
<ul>
<li><strong>Narrow topics:</strong> 3–5 supporting articles</li>
<li><strong>Broad, competitive niches:</strong> 10–20 supporting articles</li>
</ul>
<p>The cluster is complete when real user questions run out — not when you hit a number. Publishing thin articles just to inflate the cluster count does more harm than good.</p>

<h3>3. The link flow</h3>
<ul>
<li><strong>Every supporting article links to the money page</strong> — in body text, within the first 400 words. This placement maximises click probability, which maximises the equity passed per the Reasonable Surfer model.</li>
<li><strong>The money page links back to at least 3 supporting articles</strong> — establishing bidirectional topical relevance. Google needs to see that the relationship is genuine, not a one-way funnel.</li>
<li><strong>Supporting articles cross-link with each other in groups of 5</strong> — body text links, keyword-variation anchors. This internal mesh reinforces the topical cluster and distributes authority throughout the cluster rather than siloing it.</li>
</ul>
<p>Every article in the cluster, once it earns even minimal external authority, continuously passes that authority upward. The money page benefits from the cumulative link equity of the entire cluster — not just from external links pointing directly at it.</p>

<h2>Hub-and-spoke: the mental model</h2>
<p>If the reverse silo sounds abstract, think of it as a hub-and-spoke wheel:</p>
<ul>
<li>The <strong>hub</strong> is your money page</li>
<li>The <strong>spokes</strong> are your supporting articles, radiating outward</li>
<li>All spokes link back to the hub — equity flows toward the centre</li>
<li>Spokes within the same group of five also connect laterally — the wheel holds together</li>
</ul>
<p>This creates a topical cluster that Google''s systems can map. It concentrates crawl frequency on the pages that matter. And it is the structural foundation that turns a collection of individual pages into a domain-level topical authority signal.</p>
<p>Three technical rules underpin the architecture:</p>
<ul>
<li><strong>Maximum 3-click depth</strong> for all important pages from the homepage</li>
<li><strong>Every important page must have at least 3–5 internal links pointing to it</strong> — orphan pages are effectively invisible to Google</li>
<li><strong>Never use JavaScript navigation menus</strong> as your primary internal linking structure — CSS-based menus with standard anchor tags are what gets crawled</li>
</ul>

<h2>Anchor text: the rules most sites get wrong</h2>
<p>The Reasonable Surfer model scores anchor text as a component of click probability. That means your anchor text choices directly affect how much equity a link passes — not just what relevance signal it sends.</p>
<p><strong>Use 2–5 descriptive words.</strong> Single-word anchors and generic anchors ("click here", "read more", "this article") have lower click probability and therefore pass less equity. A link labelled "drain cleaning services" pointing to your drain cleaning page passes more equity than a link labelled "here" pointing to the same page.</p>
<p><strong>Vary naturally.</strong> Never use the exact-match keyword as anchor text every time. Rotate through natural variations: "professional drain cleaning", "local drain cleaning", "drain cleaning cost". Each variation contributes a different relevance signal without triggering over-optimisation.</p>
<p><strong>Topical relevance matters.</strong> The Reasonable Surfer model scores the relevance of the anchor text to the destination page. An anchor about espresso machines linking to an espresso page has a higher modelled click probability than a generic anchor linking to the same destination.</p>
<p><strong>First link wins.</strong> The first link to a destination page in a document passes more equity than subsequent links to the same page. If you''re linking from a supporting article to your money page, place that link early — in the introduction, within the first 400 words. Do not bury it in a conclusion.</p>
<p><strong>Visual prominence.</strong> Links styled with standard colour contrast and underline pass more equity than links styled to blend with surrounding text. If the link doesn''t look like a link, it carries a lower modelled click probability.</p>

<h2>Why topical authority compounds the effect</h2>
<p>The reverse silo''s power is amplified by topical authority — a domain-level signal documented in Google''s Navboost patent (<a href="https://patents.google.com/patent/US8595225B1" target="_blank" rel="noopener noreferrer">US8595225B1</a>, confirmed by the DOJ in 2023).</p>
<p>Google maps documents to topics and computes topic-specific popularity scores. A domain with many well-performing pages all mapped to the same topic accumulates compounding topical authority signals that benefit every page within that cluster. This is not a branding concept — it is a documented algorithmic output.</p>
<p>The reverse silo structure feeds this signal directly. When you publish a money page surrounded by 10–15 closely related supporting articles, all interlinked around the same topic, and Google observes those pages attracting clicks and return visits — the topic-specific authority of the entire cluster compounds. The money page benefits not just from the link equity passing through the reverse silo, but from the broader topical classification signal the cluster creates at the domain level.</p>
<p>This is why publishing one excellent article rarely outperforms publishing a tightly structured cluster of 8–12 articles on the same topic. Depth and breadth of coverage within a topic space is the ranking signal — not any single page.</p>

<h2>The practical checklist</h2>
<p>Implementing the reverse silo on an existing site or a new cluster comes down to six concrete steps:</p>
<ol>
<li><strong>Identify your money page.</strong> One page per cluster. Commercial intent. Conversion-focused. This is the page that needs to rank.</li>
<li><strong>Map every genuine user sub-intent.</strong> Use keyword research, People Also Ask, related searches. Every distinct question a user might have about your broader topic is a potential supporting article. Stop when the questions run out.</li>
<li><strong>Write and publish the supporting articles.</strong> Each one covers a single sub-intent comprehensively. Minimum 3 internal links per article placed in the first half of the content, 2–5 word descriptive anchor text.</li>
<li><strong>Add the reverse silo links.</strong> Every supporting article gets a link to the money page in its first 400 words. Vary the anchor text naturally. Never use generic anchors.</li>
<li><strong>Link the money page outward to at least 3 articles.</strong> Bidirectional relevance. The money page acknowledges the cluster exists. This completes the topical mapping signal.</li>
<li><strong>Cross-link articles within groups of 5.</strong> Group your supporting articles into batches of five. Within each batch, add body text links between articles. Keyword-variation anchors, mid-body placement.</li>
</ol>

<h2>The one law that governs all of it</h2>
<p><strong>Placement determines link value.</strong></p>
<p>Not authority alone. Not anchor text alone. Where a link sits on a page — the click probability it carries in Google''s Reasonable Surfer model — determines what fraction of a page''s authority that link actually passes.</p>
<p>A footer link from your highest-authority page passes just 0.15× of the equity a body-text, first-paragraph link from the same page would pass.</p>
<p>The reverse silo is the architecture that forces every link in your cluster into the highest-equity position: body text, early placement, descriptive anchor text, topically relevant source. It is not complicated. But it requires deliberate execution — and most sites never do it.</p>
<p><em>The reverse silo model is derived from Google patent US8117209B1 (Reasonable Surfer), US8595225B1 (Navboost), and US8682892B1 (Panda quality signals). All equity multipliers are based on the relative click-probability model documented in US8117209B1.</em></p>',
  'The Reverse Silo: The Internal Linking Strategy That Actually Moves Rankings | Sharkly',
  'The reverse silo is the internal linking architecture derived from Google patent US8117209B1. Learn how to concentrate link equity toward your money pages and build topical authority that compounds.',
  'published',
  now(),
  'Sharkly Team',
  9,
  false
FROM public.blog_categories c
WHERE c.slug = 'glossary'
ON CONFLICT (slug) DO NOTHING;
