# work.yings.me portfolio

Tan Ying Ying's brand partnerships portfolio. Hand-maintained static HTML,
deployed on GitHub Pages (push to main). One page per campaign in `campaigns/`.

## SEO

Every page carries a generated head block between `<!-- seo:start -->` and
`<!-- seo:end -->` markers: description (pulled from the page's first
`about-text` paragraph), canonical, Open Graph, Twitter card, and per-campaign
og:image (the matching `assets/card-<slug>.jpg`, falling back to the page's
first image). The index also carries Person/WebSite JSON-LD anchored at
`https://yings.me/#person`, shared across the whole yings.me estate.

After adding or renaming a campaign page, regenerate the blocks and sitemap:

```
bun run scripts/inject-seo.ts
```

The script is idempotent (replaces existing marker blocks) and also rewrites
`sitemap.xml`. `robots.txt` points crawlers at the sitemap. Titles use "·"
separators, never em dashes (Ying Ying's voice rule).
