// Injects/refreshes the SEO head block in every page, and regenerates
// sitemap.xml. Idempotent: content between the seo markers is replaced on
// every run. Run after adding a campaign page: bun run scripts/inject-seo.ts
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const root = join(import.meta.dir, '..');
const SITE = 'https://work.yings.me';
const SITE_NAME = 'Tan Ying Ying · Brand Partnerships Portfolio';
const INDEX_DESCRIPTION =
  'Brand partnerships portfolio of Tan Ying Ying: 15+ years connecting iconic brands to the biggest entertainment properties across Asia Pacific.';

const SOCIALS = [
  'https://www.linkedin.com/in/tan-yingying/',
  'https://www.youtube.com/@yingthinks',
  'https://github.com/tan-yingying',
  'https://medium.com/@tanyingying',
];

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max = 158): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}...`;
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

interface Page {
  file: string; // repo-relative path
  url: string;
}

const pages: Page[] = [{ file: 'index.html', url: `${SITE}/` }];
for (const name of readdirSync(join(root, 'campaigns')).filter((n) => n.endsWith('.html'))) {
  pages.push({ file: `campaigns/${name}`, url: `${SITE}/campaigns/${name}` });
}

function ogImageFor(file: string, html: string): string {
  if (file === 'index.html') {
    const first = html.match(/<img[^>]*src="(assets\/[^"]+\.(?:jpg|png|webp))"/);
    return first?.[1] ? `${SITE}/${first[1]}` : `${SITE}/assets/card-01.jpg`;
  }
  const slug = basename(file, '.html');
  for (const ext of ['jpg', 'png']) {
    if (existsSync(join(root, `assets/card-${slug}.${ext}`))) {
      return `${SITE}/assets/card-${slug}.${ext}`;
    }
  }
  // fall back to the page's own first still image (relative to /campaigns/)
  const first = html.match(/<img[^>]*src="(assets\/[^"]+\.(?:jpg|png|webp))"/);
  return first?.[1] ? `${SITE}/campaigns/${first[1]}` : `${SITE}/assets/card-01.jpg`;
}

const personJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': 'https://yings.me/#person',
      name: 'Ying Ying',
      alternateName: ['Ying Ying Tan', 'Tan Ying Ying'],
      url: 'https://yings.me/',
      jobTitle: 'Brand partnerships marketer',
      sameAs: SOCIALS,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: `${SITE}/`,
      name: SITE_NAME,
      description: INDEX_DESCRIPTION,
      publisher: { '@id': 'https://yings.me/#person' },
    },
  ],
};

for (const page of pages) {
  const path = join(root, page.file);
  let html = readFileSync(path, 'utf8');
  const isIndex = page.file === 'index.html';

  // Voice rule: no em dashes in titles
  html = html.replace(/<title>([^<]*)<\/title>/, (_, t: string) => `<title>${t.replace(/\s*—\s*/g, ' · ')}</title>`);

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? SITE_NAME;
  const description = isIndex
    ? INDEX_DESCRIPTION
    : truncate(stripTags(html.match(/<p class="about-text">([\s\S]*?)<\/p>/)?.[1] ?? '')) || `${title}: an entertainment brand partnership campaign by Tan Ying Ying.`;
  const image = ogImageFor(page.file, html);

  const lines = [
    `  <meta name="description" content="${esc(description)}">`,
    `  <link rel="canonical" href="${page.url}">`,
    `  <meta property="og:title" content="${esc(title)}">`,
    `  <meta property="og:description" content="${esc(description)}">`,
    `  <meta property="og:type" content="${isIndex ? 'website' : 'article'}">`,
    `  <meta property="og:url" content="${page.url}">`,
    `  <meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `  <meta property="og:locale" content="en_SG">`,
    `  <meta property="og:image" content="${image}">`,
    `  <meta name="twitter:card" content="summary_large_image">`,
    `  <meta name="twitter:title" content="${esc(title)}">`,
    `  <meta name="twitter:description" content="${esc(description)}">`,
    `  <meta name="twitter:image" content="${image}">`,
  ];
  if (!isIndex && !html.includes('rel="icon"')) {
    lines.push(`  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">`);
  }
  if (isIndex) {
    lines.push(`  <script type="application/ld+json">${JSON.stringify(personJsonLd)}</script>`);
  }
  const block = `<!-- seo:start -->\n${lines.join('\n')}\n  <!-- seo:end -->`;

  if (html.includes('<!-- seo:start -->')) {
    html = html.replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, block);
  } else {
    html = html.replace(/(<meta name="viewport"[^>]*>)/, `$1\n  ${block}`);
  }
  writeFileSync(path, html);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...pages.map((p) => `  <url><loc>${p.url}</loc></url>`),
  '</urlset>',
  '',
].join('\n');
writeFileSync(join(root, 'sitemap.xml'), sitemap);

console.log(`SEO block injected into ${pages.length} pages; sitemap.xml has ${pages.length} URLs`);
