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
- tools/build-blog-meta.js — regenerates feed.xml, sitemap.xml, robots.txt
- feed.xml, sitemap.xml, robots.txt — generated; do not hand-edit
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
   ---

   Markdown body. Headings (##), **bold**, *italic*, [links](https://…),
   images ![caption](./posts/images/pic.png), `inline code`, fenced code blocks,
   > quotes, and - lists all work. Reading time is computed automatically.

2. Put images in posts/images/.
3. Add "my-post" to the list in posts/index.js, in date order (newest first).
4. Run `node tools/build-blog-meta.js` to refresh feed.xml and sitemap.xml.
5. Push. It appears on blog.html and at post.html?slug=my-post.

Step 4 is not optional — the feed and sitemap are committed files, not
generated at request time, so a post added without it is invisible to feed
readers and search engines. The script reads posts/index.js and each post's
front matter, and fails loudly if a listed post is missing or has an
unparseable date.

## Analytics
Every page loads analytics.js from its <head>. Pageviews are sent manually
(`send_page_view: false`) because post.html only knows the article title after
its Markdown loads — an automatic pageview would report every article under the
placeholder title. post.html sets `window.FA_DEFER_PAGEVIEW` before loading
analytics.js and calls `FA_ANALYTICS.pageView()` once the post is rendered,
tagging the event with post_slug and post_tag.
