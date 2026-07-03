# Post-launch SEO Recheck

Date: 2026-07-01
Target: https://www.goeast.ai

## Confirmed Passes
- robots.txt reachable at `/robots.txt` (HTTP 200), sitemap declaration present.
- Security headers are live and complete (score 100/100 in script): CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- `/login` and `/account` return `X-Robots-Tag: noindex, nofollow, noarchive`.
- Login page meta robots also set to `noindex, nofollow, nocache`.
- Homepage metadata changes are live (new title/description/OG/Twitter).
- `FAQPage` schema no longer found on checked URLs (`/`, `/skills`, `/insights`, `/sophies-journey`, `/iching`, `/glossary`).
- Broken link check on homepage sample: 43/43 healthy.
- Redirect chain for root URL: direct 200, no hops.

## Warnings / Residual Items
- `llms.txt` checker still reports `Links: 0` (quality score 70/100), even though key URLs are present as plain bullets.
  - Likely cause: checker expects markdown link format `[title](url)`.
- HSTS lacks `includeSubDomains` in current response.
- PageSpeed/CWV fetch failed from current environment (network timeout to Google API endpoint), so CWV remains unverified in this run.

## Recommended Next Steps
1. Update `llms.txt` key URLs to markdown-link style to improve tool-parsed link detection.
2. Add `includeSubDomains` to HSTS if all subdomains are HTTPS-ready.
3. Re-run PageSpeed from a network that can access `www.googleapis.com`.
