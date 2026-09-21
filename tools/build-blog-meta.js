#!/usr/bin/env node
// Regenerates feed.xml, sitemap.xml and robots.txt from the blog manifest and
// each post's front matter. Run from the repo root after adding or editing a
// post:  node tools/build-blog-meta.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://fastaiagent.net';
const TITLE = 'FastAIAgent Blog';
const DESC = 'Notes from the harness: replay, guardrails, evaluation, and what it takes to operate agents in production.';

// Static pages, with a rough priority for the sitemap.
const PAGES = [
  ['/', '1.0'], ['/enterprise.html', '0.9'], ['/pricing.html', '0.8'],
  ['/docs.html', '0.8'], ['/blog.html', '0.7'], ['/about.html', '0.6'],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function loadManifest() {
  const src = fs.readFileSync(path.join(ROOT, 'posts/index.js'), 'utf8');
  const m = src.match(/\[([\s\S]*?)\]/);
  if (!m) throw new Error('could not parse posts/index.js');
  return JSON.parse(m[0].replace(/,(\s*\])/, '$1'));
}

function frontMatter(md) {
  const meta = {};
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (m) m[1].split('\n').forEach(line => {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  return { meta, body: m ? md.slice(m[0].length) : md };
}

const posts = loadManifest().map(slug => {
  const file = path.join(ROOT, 'posts', slug + '.md');
  if (!fs.existsSync(file)) throw new Error('manifest lists a missing post: ' + slug);
  const { meta } = frontMatter(fs.readFileSync(file, 'utf8'));
  if (!meta.title) throw new Error('post has no title: ' + slug);
  const date = new Date(meta.date + ' 12:00:00 UTC'); // midday UTC so no timezone shifts the day
  if (isNaN(date)) throw new Error(`post has an unparseable date (${meta.date}): ` + slug);
  return { slug, meta, date, url: `${SITE}/blog/${slug}/` };
});

// --- per-post HTML pages --------------------------------------------------
// Every post URL served the same shell, with title and body injected by JS.
// Crawlers that don't run JS (LinkedIn, Slack, X) saw nothing, so every share
// rendered a blank card. These pages carry real metadata and a pre-rendered
// body; the interactive app still takes over in a browser.
const esc2 = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderMarkdown(body) {
  const win = {};
  new Function('window', fs.readFileSync(path.join(ROOT, 'markdown.js'), 'utf8')).call(win, win);
  return win.FA_MD.render(body);
}

const shell = fs.readFileSync(path.join(ROOT, 'post.html'), 'utf8');

posts.forEach(p => {
  const { meta } = frontMatter(fs.readFileSync(path.join(ROOT, 'posts', p.slug + '.md'), 'utf8'));
  const { body } = frontMatter(fs.readFileSync(path.join(ROOT, 'posts', p.slug + '.md'), 'utf8'));
  const title = `${meta.title} — FastAIAgent`;
  const desc = (meta.summary || '').replace(/\s+/g, ' ').trim();
  const img = meta.cover ? SITE + meta.cover.replace(/^\./, '') : `${SITE}/assets/social-default.jpg`;  // SVG is not rendered by social scrapers

  const head = [
    `<title>${esc2(title)}</title>`,
    `<meta name="description" content="${esc2(desc)}">`,
    `<link rel="canonical" href="${p.url}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${esc2(meta.title)}">`,
    `<meta property="og:description" content="${esc2(desc)}">`,
    `<meta property="og:url" content="${p.url}">`,
    `<meta property="og:image" content="${esc2(img)}">`,
    `<meta property="og:site_name" content="FastAIAgent">`,
    `<meta property="article:published_time" content="${p.date.toISOString()}">`,
    meta.author ? `<meta property="article:author" content="${esc2(meta.author)}">` : '',
    meta.tag ? `<meta property="article:tag" content="${esc2(meta.tag)}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc2(meta.title)}">`,
    `<meta name="twitter:description" content="${esc2(desc)}">`,
    `<meta name="twitter:image" content="${esc2(img)}">`,
  ].filter(Boolean).join('\n');

  // Pre-rendered article, hidden as soon as we know scripting is on, so a
  // browser never shows it twice. Identical content either way.
  const pre = `<div id="prerender">
<article>
<h1>${esc2(meta.title)}</h1>
<p>${esc2(desc)}</p>
<p>${esc2(meta.date)} · ${esc2(meta.author || '')}${meta.tag ? ' · ' + esc2(meta.tag) : ''}</p>
${meta.cover ? `<img src="${esc2(meta.cover.replace(/^\./, ''))}" alt="">` : ''}
${renderMarkdown(body)}
</article>
</div>`;

  let html = shell
    // The runtime resolves components as "./nav.dc.html" (COMPONENT_DIR = "."),
    // which from /blog/<slug>/ would look one level deep and 404. A base of /
    // makes every relative URL resolve from the site root.
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">')
    .replace('<script src="./support.js"></script>',
      `<script>window.FA_POST_SLUG=${JSON.stringify(p.slug)}</script>\n${head}\n<style>.js #prerender{display:none}</style>\n<script>document.documentElement.className+=' js'</script>\n<script src="/support.js"></script>`)
    .replace('<script>window.FA_DEFER_PAGEVIEW=1</script>', '<script>window.FA_DEFER_PAGEVIEW=1</script>')
    .replace('<body>', '<body>\n' + pre)
    // the shell's own relative refs must resolve from /blog/<slug>/
    .replace(/(src|href)="\.\//g, '$1="/')
    // the shell's placeholder title would otherwise sit in the document twice
    .replace('<title>Blog — FastAIAgent</title>', '');

  const dir = path.join(ROOT, 'blog', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
});
console.log(`blog/*.html  ${posts.length} per-post pages`);

// --- posts/series.js ------------------------------------------------------
// Series membership, so post.html can render "Part N of M" and prev/next
// links without fetching every post's front matter.
const series = {};
posts.forEach(p => {
  if (!p.meta.series) return;
  (series[p.meta.series] = series[p.meta.series] || []).push(p);
});

Object.entries(series).forEach(([name, list]) => {
  list.forEach(p => {
    if (!p.meta.part) throw new Error(`post is in a series but has no part: ${p.slug}`);
  });
  list.sort((a, b) => Number(a.meta.part) - Number(b.meta.part));
  // Part order must match date order, or the reading order contradicts itself.
  const byDate = list.slice().sort((a, b) => a.date - b.date);
  list.forEach((p, i) => {
    if (Number(p.meta.part) !== i + 1)
      throw new Error(`series "${name}" parts are not 1..n — got ${p.meta.part} at position ${i + 1} (${p.slug})`);
    if (byDate[i].slug !== p.slug)
      throw new Error(`series "${name}" part order does not match date order at part ${i + 1}: ${p.slug} vs ${byDate[i].slug}`);
  });
});

fs.writeFileSync(path.join(ROOT, 'posts/series.js'),
  '// Generated by tools/build-blog-meta.js — do not edit by hand.\n' +
  'window.FA_SERIES = ' + JSON.stringify(
    Object.fromEntries(Object.entries(series).map(([name, list]) => [
      name, list.map(p => ({ slug: p.slug, title: p.meta.title, part: Number(p.meta.part) })),
    ])), null, 2) + ';\n');

// --- feed.xml -------------------------------------------------------------
const items = posts.map(p => `    <item>
      <title>${esc(p.meta.title)}</title>
      <link>${esc(p.url)}</link>
      <guid isPermaLink="true">${esc(p.url)}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <description>${esc(p.meta.summary || '')}</description>${p.meta.tag ? `
      <category>${esc(p.meta.tag)}</category>` : ''}${p.meta.author ? `
      <dc:creator>${esc(p.meta.author)}</dc:creator>` : ''}
    </item>`).join('\n');

fs.writeFileSync(path.join(ROOT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(TITLE)}</title>
    <link>${SITE}/blog.html</link>
    <description>${esc(DESC)}</description>
    <language>en</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${(posts[0] ? posts[0].date : new Date()).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`);

// --- sitemap.xml ----------------------------------------------------------
const urls = [
  ...PAGES.map(([p, pri]) => `  <url>
    <loc>${SITE}${p}</loc>
    <changefreq>weekly</changefreq>
    <priority>${pri}</priority>
  </url>`),
  ...posts.map(p => `  <url>
    <loc>${esc(p.url)}</loc>
    <lastmod>${p.date.toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`),
].join('\n');

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);

// --- robots.txt -----------------------------------------------------------
fs.writeFileSync(path.join(ROOT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`feed.xml     ${posts.length} posts`);
console.log(`sitemap.xml  ${PAGES.length + posts.length} urls`);
console.log('robots.txt   written');
Object.entries(series).forEach(([name, list]) =>
  console.log(`series.js    ${list.length} parts — ${name}`));
