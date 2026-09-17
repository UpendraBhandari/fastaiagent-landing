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
3. Add "my-post" to the top of the list in posts/index.js.
4. Push. It appears on blog.html and at post.html?slug=my-post.
