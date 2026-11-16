import React from "react";

/** Minimal, safe markdown renderer (headings, lists, paragraphs, bold, links). No raw HTML. */
function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${key}-${i++}`}>{tok.slice(2, -2)}</strong>);
    else {
      const label = tok.slice(1, tok.indexOf("]"));
      out.push(<a key={`${key}-${i++}`} href={m[2]} rel="noopener">{label}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className = "prose-lite" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        const t = b.trim();
        if (!t) return null;
        if (t.startsWith("### ")) return <h3 key={i}>{inline(t.slice(4), `h${i}`)}</h3>;
        if (t.startsWith("## ")) return <h2 key={i}>{inline(t.slice(3), `h${i}`)}</h2>;
        if (t.startsWith("# ")) return <h2 key={i}>{inline(t.slice(2), `h${i}`)}</h2>;
        const lines = t.split("\n");
        if (lines.every((l) => /^[-*]\s+/.test(l)))
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^[-*]\s+/, ""), `l${i}${j}`)}</li>)}</ul>;
        return <p key={i}>{lines.map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(l, `p${i}${j}`)}</React.Fragment>)}</p>;
      })}
    </div>
  );
}
