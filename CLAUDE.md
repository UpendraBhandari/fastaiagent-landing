# fastaiagent.net — working notes

Static marketing site + blog for FastAIAgent. No build system, no dependencies.
GitHub Pages serves this branch as-is. README.md documents the file layout and
how to write a post; this file is the stuff that is not obvious from the code
and that cost debugging rounds to learn.

## Non-negotiables

**Run `node tools/build-blog-meta.js` before every push that touches `posts/`.**
It regenerates `feed.xml`, `sitemap.xml`, `robots.txt`, `posts/series.js` and
one HTML page per post under `blog/`. These are committed files, not generated
on request — Pages serves the repo as-is. A post added without this step is
invisible to feed readers, search engines, and link previews.

**Verify rendering in a real browser, not by reading the HTML.** The site is
client-rendered by `support.js` (a framework called DC); asset paths can all
look correct while the page fails to mount. Headless Chrome is available:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --virtual-time-budget=8000 \
  --dump-dom "https://fastaiagent.net/blog/<slug>/" > /tmp/r.html
# then check: does #dc-root exist, is there body text, any "not found"?
```

This was learned the hard way — per-post pages shipped broken ("Post not
found") after every path was verified by hand but the page was never rendered.

**Live is production.** Pages serves the `site_v2` branch, which is also the
default branch. Every push goes straight to fastaiagent.net. There is no
staging. For a local preview: `python3 -m http.server 8787` and browse
`http://127.0.0.1:8787/`.

## Pushing

The repo is `UpendraBhandari/fastaiagent-landing` but `gh` usually has
`fastaifoundry` as the active account, which has write access but is not the
owner. Pushes fail with 403 unless you switch first, and it is polite to switch
back:

```bash
gh auth switch --hostname github.com --user UpendraBhandari && git push
gh auth switch --hostname github.com --user fastaifoundry
```

A branch ruleset protects `main` and `site_v2` (PR + code-owner approval, no
force-push, no deletion). The owner has an admin bypass, which is why direct
pushes work. Wait for the Pages build before verifying:

```bash
gh api repos/UpendraBhandari/fastaiagent-landing/pages/builds --jq '.[0]|"\(.status) \(.commit[0:7])"'
```

## Publishing a post from LinkedIn

The author's LinkedIn articles and posts are the source. **Do not ask them to
paste the text** — the full body is in the page HTML. WebFetch returns only a
summary and discards the original, which is misleading.

```bash
curl -fsSL -A "<a browser UA>" "<linkedin url>" -o page.html
python3 ~/fastaiagent-landing-source-assets/extract.py page.html
```

`extract.py` lives outside the repo, alongside `originals/` (every source
image and video at the resolution LinkedIn served) and `extracted-text/`. It
emits markdown with `@@IMAGE n <url>@@` markers in position.

Gotchas it already handles, each found by diffing against text the author had
supplied by hand:

- LinkedIn injects "Recommended by LinkedIn" chrome *between* article blocks
- a naive chrome filter silently eats the closing paragraph
- splitting text on blank lines tears apart code blocks that contain them
- one link may be split across two anchors with the tail auto-linked to a bogus
  host (`http://scorers.py` nearly shipped as a live link)
- image URLs need their signed query string; larger size variants return 403
- LinkedIn only serves 640×400 thumbnails to a logged-out fetch

Conversions that are always applied:

- **Unicode math-bold → real `**bold**`.** LinkedIn's fake bold (`𝗖𝗜𝗦𝗢`) is
  different characters from `CISO`: screen readers mangle it, site search and
  Google do not match it as the word.
- **Strip trailing hashtags** and "check fastaiagent.net" pointers — the post
  was written to point *at* this site from elsewhere.
- **Resolve `lnkd.in` shortlinks** to their real targets rather than shipping
  opaque redirects that can be retargeted later.
- No tables, no nested lists, no raw HTML — `markdown.js` supports none of them.

## Front matter

`title`, `date` (`Sep 12, 2026`, display only), `tag` (topic), `summary`
(the card blurb *and* the og:description — it is the first thing a reader
sees), `author`, `minutes`, `cover`. Optional: `kind: video` for a ▶ Video
badge, and `series` + `part` for the Agent Debugging Manifesto.

Manifest order in `posts/index.js` is display order, and must be newest-first.
The build fails loudly if it is not — this silently drifted twice before the
guard existed.

## Video posts

Video goes in `posts/videos/` as `<name>.mp4` with a `<name>.jpg` poster
beside it; `markdown.js` derives the poster path from the video path, so the
basenames must match. Reference it exactly like an image.

Self-host, never embed LinkedIn's player: an embed loads their tracking into
the page and shows a login wall to some visitors. Pull the poster as a frame
from the video with ffmpeg rather than using LinkedIn's thumbnail, which has a
play-button overlay burned in. Re-encode large files (`-vf scale=1280:-2 -crf
24 -movflags +faststart`).

## Analytics

`analytics.js` holds the measurement ID once and is loaded from the native
`<head>` of every page. Pageviews are sent **manually** (`send_page_view:
false`) because `post.html` only knows the article title after its markdown
loads — an automatic pageview reported every article under the placeholder
title. Pages that resolve their title late set `window.FA_DEFER_PAGEVIEW`
before loading the script and call `FA_ANALYTICS.pageView()` when ready.

Self-hosted video emits GA4's standard `video_start` / `video_progress` /
`video_complete`. Media events do not bubble, so the listeners are registered
in the **capture phase** at document level; that also covers players the app
renders after load. The hidden pre-render copy is excluded so it cannot report
phantom plays.

## Why posts live at `/blog/<slug>/`

Every post URL used to serve byte-identical HTML whose only metadata was
`<title>Blog — FastAIAgent</title>`. Crawlers that do not run JavaScript
(LinkedIn, Slack, X) saw an empty shell, so every share rendered a blank card.

The build now writes one page per post with real title, description,
canonical, Open Graph and Twitter tags, plus the article body pre-rendered
with the site's own `markdown.js`. The pre-rendered copy is hidden as soon as
scripting is detected, so a browser never shows it twice — identical content
either way, nothing cloaked.

Two things this depends on, both easy to break:

- Generated pages carry `<base href="/">` as the **first** element in `<head>`.
  The runtime resolves components as `./nav.dc.html` (`COMPONENT_DIR = "."`),
  which from `/blog/<slug>/` would 404 and the app would never mount.
- Post asset paths are root-absolute (`/posts/...`), so a post renders the same
  at either URL. `post.html?slug=` still works for links already shared.

Posts with no `cover` fall back to `assets/social-default.jpg`, never an SVG —
social scrapers will not render SVG.

## Verify after publishing

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" https://fastaiagent.net/blog/<slug>/
curl -fsS https://fastaiagent.net/feed.xml | xmllint --xpath 'count(//item)' -
# then render it, per "Non-negotiables" above
```

LinkedIn caches preview cards for about a week. If a URL was shared before its
OG tags existed, clear it once at linkedin.com/post-inspector.
