// Minimal Markdown → HTML for blog posts. Supports front matter, headings, paragraphs,
// bold/italic, links, images (with captions), inline code, fenced code, blockquotes, lists, hr.
(function () {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, (_, c) => '<code>' + c + '</code>');
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+(?:"|&quot;)(.*?)(?:"|&quot;))?\)/g, (_, alt, src, title) =>
      '<figure><img src="' + src + '" alt="' + alt + '" loading="lazy">' + (title || alt ? '<figcaption>' + (title || alt) + '</figcaption>' : '') + '</figure>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const ext = /^https?:\/\//.test(u) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + u + '"' + ext + '>' + t + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return s;
  }
  function parseFrontMatter(md) {
    const meta = {};
    let body = md;
    const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (m) {
      body = md.slice(m[0].length);
      m[1].split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      });
    }
    return { meta, body };
  }
  function render(md) {
    const lines = md.replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      let l = lines[i];
      if (/^```/.test(l)) {
        const lang = l.slice(3).trim();
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push('<pre><code' + (lang ? ' class="lang-' + esc(lang) + '"' : '') + '>' + esc(buf.join('\n')) + '</code></pre>');
        continue;
      }
      if (/^\s*$/.test(l)) { i++; continue; }
      if (/^(-{3,}|\*{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
      const h = l.match(/^(#{1,4})\s+(.*)$/);
      if (h) { const n = h[1].length + 1; out.push('<h' + n + '>' + inline(h[2]) + '</h' + n + '>'); i++; continue; }
      if (/^>\s?/.test(l)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
        out.push('<blockquote>' + inline(buf.join(' ')) + '</blockquote>');
        continue;
      }
      if (/^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
        const ordered = /^\s*\d+\.\s+/.test(l);
        const re = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
        const items = [];
        while (i < lines.length && re.test(lines[i])) items.push('<li>' + inline(lines[i++].replace(re, '')) + '</li>');
        out.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
        continue;
      }
      if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(l)) { out.push(inline(l)); i++; continue; }
      const buf = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,4}\s|```|>\s?|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i])) buf.push(lines[i++]);
      out.push('<p>' + inline(buf.join(' ')) + '</p>');
    }
    return out.join('\n');
  }
  function words(md) { return md.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length; }
  async function load(slug) {
    const r = await fetch('/posts/' + encodeURIComponent(slug) + '.md', { cache: 'no-cache' });
    if (!r.ok) throw new Error('post not found: ' + slug);
    const { meta, body } = parseFrontMatter(await r.text());
    meta.slug = slug;
    meta.minutes = meta.minutes || Math.max(1, Math.round(words(body) / 220));
    return { meta, body, html: render(body) };
  }
  window.FA_MD = { render, parseFrontMatter, load };
})();
