// Rehype plugin: numbered inline citations + a structured Sources section.
//
// What it does (wiki: inline-citation-system, content-depth-and-linking-standard;
// audit item 8): at build time, for every markdown body rendered through the
// content pipeline, it
//   1. finds external links in the prose (anything not protecthealth.com),
//   2. appends a Wikipedia-style superscript marker [n] after each one
//      (repeat citations of the same URL reuse the same number),
//   3. appends a "Sources" section at the end of the body — an ordered list
//      of publisher + linked title, one entry per unique URL, each with an
//      id the inline markers anchor to.
//
// Zero content rewriting: the citations authors already placed in the body
// (IRS, eCFR, DOL, CMS, Nevada DOI, Nevada Health Link, KFF …) become the
// source list. A page with no external links gets no Sources section.
//
// Deliberate limits:
//   - Links inside headings are counted but not marked (a [1] in an H2 would
//     pollute the extractable question text).
//   - Internal links and mailto/tel are ignored entirely.
//   - The visible list and the JSON-LD `citation` array (added in the page
//     templates from the same body) stay in sync because both derive from
//     the same set of body links.

// Publisher labels for the domains this site actually cites. Fallback is the
// bare hostname, so an unmapped domain still renders sanely.
const PUBLISHERS = {
  'irs.gov': 'Internal Revenue Service',
  'federalregister.gov': 'Federal Register',
  'ecfr.gov': 'Code of Federal Regulations',
  'dol.gov': 'U.S. Department of Labor',
  'cms.gov': 'Centers for Medicare & Medicaid Services',
  'medicare.gov': 'Medicare.gov',
  'ssa.gov': 'Social Security Administration',
  'healthcare.gov': 'HealthCare.gov',
  'doi.nv.gov': 'Nevada Division of Insurance',
  'nevadahealthlink.com': 'Nevada Health Link',
  'leg.state.nv.us': 'Nevada Legislature',
  'labor.nv.gov': 'Nevada Office of the Labor Commissioner',
  'dwss.nv.gov': 'Nevada Division of Welfare and Supportive Services',
  'kff.org': 'KFF',
  'census.gov': 'U.S. Census Bureau',
  'bls.gov': 'U.S. Bureau of Labor Statistics',
  'cdc.gov': 'Centers for Disease Control and Prevention',
};

const INTERNAL_HOSTS = new Set(['protecthealth.com', 'www.protecthealth.com']);

function hostOf(href) {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function textOf(node) {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(textOf).join('');
  return '';
}

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export default function rehypeSources() {
  return (tree) => {
    const sources = []; // { href, host, title }
    const byHref = new Map(); // href -> index (1-based)

    function walk(node, inHeading) {
      if (!node.children) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type !== 'element') continue;
        const heading = inHeading || HEADINGS.has(child.tagName);

        if (child.tagName === 'a' && typeof child.properties?.href === 'string' && /^https?:\/\//.test(child.properties.href)) {
          const href = child.properties.href;
          const host = hostOf(href);
          if (host && !INTERNAL_HOSTS.has(host)) {
            let n = byHref.get(href);
            if (!n) {
              sources.push({ href, host, title: textOf(child).trim() || host });
              n = sources.length;
              byHref.set(href, n);
            }
            if (!heading) {
              const marker = {
                type: 'element',
                tagName: 'sup',
                properties: { className: ['src-ref'] },
                children: [{
                  type: 'element',
                  tagName: 'a',
                  properties: { href: `#src-${n}`, ariaLabel: `Source ${n}` },
                  children: [{ type: 'text', value: `[${n}]` }],
                }],
              };
              node.children.splice(i + 1, 0, marker);
              i++; // skip the marker we just inserted
            }
          }
        }
        walk(child, heading);
      }
    }

    walk(tree, false);
    if (sources.length === 0) return;

    tree.children.push({
      type: 'element',
      tagName: 'section',
      properties: { className: ['sources'], ariaLabel: 'Sources' },
      children: [
        { type: 'element', tagName: 'h2', properties: {}, children: [{ type: 'text', value: 'Sources' }] },
        {
          type: 'element',
          tagName: 'ol',
          properties: {},
          children: sources.map((s, idx) => ({
            type: 'element',
            tagName: 'li',
            properties: { id: `src-${idx + 1}` },
            children: [
              { type: 'text', value: `${PUBLISHERS[s.host] ?? s.host} — ` },
              {
                type: 'element',
                tagName: 'a',
                properties: { href: s.href, target: '_blank', rel: ['noopener', 'noreferrer'] },
                children: [{ type: 'text', value: s.title }],
              },
            ],
          })),
        },
      ],
    });
  };
}
