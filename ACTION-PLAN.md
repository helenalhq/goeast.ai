# ACTION-PLAN

## Priority 0 - Deploy now
1. Deploy this patch to production.
2. Resubmit `https://www.goeast.ai/sitemap.xml` in Google Search Console and request recrawl for `/`.
3. Verify live outputs:
   - `https://www.goeast.ai/robots.txt`
   - Homepage source no longer contains `"@type":"FAQPage"`
   - `/login` and `/account` return `X-Robots-Tag: noindex`

## Priority 1 - First 7 days
1. Run PSI from a region/network with Google API access for mobile + desktop and log LCP/INP/CLS.
2. Expand internal linking:
   - Add related-links blocks on glossary and insights detail pages.
   - Ensure each target page has at least 3 internal inlinks.
3. Add first-party author entity coverage:
   - `ProfilePage`/`Person` for key authors or editorial owners.

## Priority 2 - First 30 days
1. Build topic clusters to target non-branded discovery:
   - China payments for foreigners
   - China medical navigation for expats
   - China app/tooling comparisons
2. Ship 8-12 long-tail pages using existing content model (`insights` + `skills`) with unique search intent.
3. Add deployment SEO CI checks:
   - schema validation
   - robots/sitemap smoke tests
   - broken-link scan for key templates

## KPIs to track
1. Non-brand clicks and impressions in GSC.
2. Indexed page count and crawl stats.
3. CTR of homepage and top 10 landing pages.
4. CWV pass rate (mobile first).
