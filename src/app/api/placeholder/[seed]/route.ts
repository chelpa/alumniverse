// Deterministic illustrated property photos for demo/seed data (no external image hosts needed).
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const SKIES = [["#a8d8ff", "#fef6e4"], ["#ffd6a5", "#fdffb6"], ["#cdb4db", "#ffc8dd"], ["#bde0fe", "#e2ece9"], ["#ffafcc", "#ffe5d9"], ["#90e0ef", "#caf0f8"]];
const WALLS = ["#f4f1de", "#e9edc9", "#fefae0", "#ffffff", "#e5e5e5", "#f8edeb", "#dde5b6"];
const ROOFS = ["#9c6644", "#6d597a", "#355070", "#bc4749", "#3d405b", "#588157"];

export async function GET(_req: Request, ctx: { params: Promise<{ seed: string }> }) {
  const { seed } = await ctx.params;
  const h = hash(seed);
  const [s1, s2] = SKIES[h % SKIES.length];
  const wall = WALLS[(h >>> 3) % WALLS.length];
  const roof = ROOFS[(h >>> 6) % ROOFS.length];
  const kind = (h >>> 9) % 3;
  const grass = ["#95d5b2", "#74c69d", "#b7e4c7"][(h >>> 11) % 3];
  let building: string;
  if (kind === 0) {
    // house
    building = `<polygon points="260,300 480,170 700,300" fill="${roof}"/><rect x="300" y="295" width="360" height="215" fill="${wall}"/>
      <rect x="450" y="390" width="62" height="120" fill="${roof}"/><rect x="340" y="340" width="76" height="62" fill="#cfe8ff" stroke="#fff" stroke-width="6"/>
      <rect x="548" y="340" width="76" height="62" fill="#cfe8ff" stroke="#fff" stroke-width="6"/>`;
  } else if (kind === 1) {
    // apartment tower
    let windows = "";
    for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) windows += `<rect x="${352 + c * 54}" y="${120 + r * 46}" width="34" height="28" fill="${(r + c + h) % 4 === 0 ? "#ffe8a3" : "#cfe8ff"}"/>`;
    building = `<rect x="330" y="95" width="300" height="415" fill="${wall}" stroke="${roof}" stroke-width="6"/>${windows}<rect x="455" y="460" width="50" height="50" fill="${roof}"/>`;
  } else {
    // modern villa
    building = `<rect x="200" y="300" width="560" height="210" fill="${wall}"/><rect x="200" y="285" width="600" height="22" fill="${roof}"/>
      <rect x="430" y="210" width="330" height="90" fill="${wall}"/><rect x="420" y="198" width="360" height="16" fill="${roof}"/>
      <rect x="240" y="340" width="160" height="110" fill="#bfe3ff" opacity="0.9"/><rect x="470" y="232" width="250" height="52" fill="#bfe3ff"/>
      <rect x="450" y="340" width="270" height="170" fill="#a7d3f5"/><rect x="180" y="505" width="640" height="20" fill="#48cae4" opacity="0.8"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" width="960" height="640">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient></defs>
    <rect width="960" height="640" fill="url(#g)"/><circle cx="${780 - (h % 300)}" cy="110" r="46" fill="#fff" opacity="0.7"/>
    <rect y="500" width="960" height="140" fill="${grass}"/>
    <circle cx="120" cy="470" r="60" fill="#52b788"/><rect x="113" y="470" width="14" height="50" fill="#7f5539"/>
    <circle cx="860" cy="480" r="48" fill="#40916c"/><rect x="853" y="480" width="14" height="40" fill="#7f5539"/>
    ${building}
  </svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" } });
}
