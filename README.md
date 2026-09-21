# fastaiagent.net — static site

Upload the contents of this folder to the root of the GitHub Pages branch.

## Files
- index.html, pricing.html, enterprise.html, docs.html, blog.html, post.html, about.html — pages
- nav.dc.html, footer.dc.html — shared header/footer, loaded at runtime (keep the .dc.html names)
- support.js — page runtime (loads React 18 from unpkg)
- markdown.js — renders blog posts written in Markdown
- theme.css — light/dark theme, fonts (Google Fonts)
- assets/ — logos and console screenshots
- posts/ — blog posts (see below)
- analytics.js — Google Analytics loader (measurement ID lives here, once)
- tools/build-blog-meta.js — regenerates feed.xml, sitemap.xml, robots.txt, posts/series.js, blog/
- feed.xml, sitemap.xml, robots.txt, posts/series.js, blog/ — generated; do not hand-edit
- .nojekyll — tells GitHub Pages not to run Jekyll

## Writing a blog post
1. Create posts/my-post.md:

   ---
   title: My post title
   date: Oct 3, 2026
   tag: Guardrails
   summary: One or two sentences shown on the blog index.
   cover: ./posts/images/my-cover.jpg   (optional)
   author: Your Name                    (optional)
   series: The Agent Debugging Manifesto  (optional, with part:)
   part: 5                                (optional, with series:)
   ---

   Markdown body. Headings (##), **bold**, *italic*, [links](https://…),
   images ![caption](./posts/images/pic.png), `inline code`, fenced code blocks,
   > quotes, and - lists all work. Reading time is computed automatically.

2. Put images in posts/images/. Video goes in posts/videos/ as
   <name>.mp4 with a <name>.jpg poster beside it — the renderer derives the
   poster path from the video path, so both must share a basename. Reference
   it exactly like an image: ![alt](/posts/videos/name.mp4 "caption").
3. Add "my-post" to the list in posts/index.js, in date order (newest first).
4. Run `node tools/build-blog-meta.js` to refresh feed.xml and sitemap.xml.
5. Push. It appears on blog.html and at /blog/my-post/.

Step 4 is not optional — the feed and sitemap are committed files, not
generated at request time, so a post added without it is invisible to feed
readers and search engines. The script reads posts/index.js and each post's
front matter, and fails loudly if a listed post is missing or has an
unparseable date.

## Series
A post joins a series by declaring `series:` and `part:` in its front matter.
The build script collects them into posts/series.js, which drives the "Part N
of M" banner and the prev/next links on post.html, and the series line on the
blog cards. Parts must be 1..n with no gaps, and part order must match date
order — the script refuses to build otherwise, so the numbering can't silently
drift when a post is added. A post with no `series:` renders exactly as before.

## Post URLs and link previews
Posts are served from generated pages at /blog/<slug>/, one HTML file each,
written by the build script from post.html plus the post's front matter. Each
carries its own title, description, canonical and Open Graph/Twitter tags, and
a pre-rendered copy of the article body — crawlers that do not run JavaScript
(LinkedIn, Slack, X) read those instead of an empty shell. The pre-rendered
copy is hidden the moment scripting is detected, so a browser never shows it
twice; the content is identical either way.

The legacy post.html?slug=<slug> form still works for links already shared.
Post asset paths are root-absolute (/posts/...) so a post renders the same at
either URL. A post with no `cover:` falls back to assets/social-default.jpg —
never an SVG, which social scrapers will not render.

## Analytics
Every page loads analytics.js from its <head>. Pageviews are sent manually
(`send_page_view: false`) because post.html only knows the article title after
its Markdown loads — an automatic pageview would report every article under the
placeholder title. post.html sets `window.FA_DEFER_PAGEVIEW` before loading
analytics.js and calls `FA_ANALYTICS.pageView()` once the post is rendered,
tagging the event with post_slug and post_tag.
