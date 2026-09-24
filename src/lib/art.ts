// Procedural placeholder comic art, so the preview never ships borrowed covers.
// TODO(launch): real series covers/panels come from uploads; this stays for empty states.

function rnd(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h >>>= 0) % 10000) / 10000;
  };
}

const uri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function critter(x: number, y: number, s: number, hue: number, r: () => number) {
  const body = `hsl(${(hue + 180 + r() * 60) % 360} 55% 62%)`;
  const look = (r() - 0.5) * 6 * s;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="40" rx="${46 + r() * 14}" ry="${54 + r() * 12}" fill="${body}" stroke="#171717" stroke-width="5"/>
    <circle cx="-16" cy="20" r="11" fill="#fff" stroke="#171717" stroke-width="4"/><circle cx="${-16 + look}" cy="22" r="5" fill="#171717"/>
    <circle cx="16" cy="20" r="11" fill="#fff" stroke="#171717" stroke-width="4"/><circle cx="${16 + look}" cy="22" r="5" fill="#171717"/>
    <path d="M-14 ${52 + r() * 6} q14 ${r() < 0.5 ? 12 : -8} 28 0" fill="none" stroke="#171717" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

/** A 1:1 panel. `seed` = "series/episode", n = panel index, hue = series hue. */
export function panelArt(seed: string, n: number, hue: number): string {
  const r = rnd(`${seed}#${n}`);
  const bg = `hsl(${hue} ${45 + r() * 20}% ${88 + r() * 6}%)`;
  const floor = `hsl(${hue} 35% ${74 + r() * 8}%)`;
  const two = r() < 0.6;
  const bubbleX = 90 + r() * 260;
  const lines = 1 + Math.floor(r() * 3);
  const bubble = `<g><rect x="${bubbleX}" y="60" width="330" height="${40 + lines * 34}" rx="40" fill="#fff" stroke="#171717" stroke-width="5"/>
    <path d="M${bubbleX + 120} ${100 + lines * 34} l-10 46 l44 -46" fill="#fff" stroke="#171717" stroke-width="5" stroke-linejoin="round"/>
    ${Array.from({ length: lines }, (_, i) => `<rect x="${bubbleX + 36}" y="${88 + i * 34}" width="${150 + r() * 110}" height="12" rx="6" fill="#C9C3B4"/>`).join('')}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
    <rect width="800" height="800" fill="${bg}"/>
    <rect y="${560 + r() * 60}" width="800" height="240" fill="${floor}"/>
    ${critter(two ? 260 : 400, 430, 1.9, hue, r)}
    ${two ? critter(560, 470, 1.5, hue + 90, r) : ''}
    ${r() < 0.8 ? bubble : ''}
    <rect x="12" y="12" width="776" height="776" fill="none" stroke="#171717" stroke-width="10" rx="6"/>
    <text x="400" y="770" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#17171766" letter-spacing="4">PLACEHOLDER · PANEL ${n + 1}</text>
  </svg>`;
  return uri(svg);
}

/** Square series cover with the series initials. */
export function coverArt(slug: string, title: string, hue: number): string {
  const r = rnd(slug);
  const initials = title.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="hsl(${hue} 60% 86%)"/>
    <circle cx="${120 + r() * 160}" cy="${120 + r() * 100}" r="${120 + r() * 60}" fill="hsl(${hue} 55% 72%)"/>
    <g transform="translate(0 20)">${critter(200, 170, 1.4, hue, r)}</g>
    <rect x="0" y="300" width="400" height="100" fill="#17171799"/>
    <text x="200" y="368" text-anchor="middle" font-family="system-ui,sans-serif" font-size="56" font-weight="800" fill="#fff" letter-spacing="3">${initials}</text>
  </svg>`;
  return uri(svg);
}

export function avatarArt(handle: string): string {
  const r = rnd(handle);
  const hue = Math.floor(r() * 360);
  return uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="hsl(${hue} 60% 80%)"/><text x="50" y="64" text-anchor="middle" font-family="system-ui,sans-serif" font-size="44" font-weight="800" fill="hsl(${hue} 45% 32%)">${(handle[0] ?? '?').toUpperCase()}</text></svg>`);
}
