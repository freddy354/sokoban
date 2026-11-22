// Port of the kit solver.mjs (push-optimal BFS, rooms solved separately).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const ROOM_STATE_CAP = 250_000;
const D: [number, number, string, string][] = [
  [0, -1, 'u', 'U'],
  [0, 1, 'd', 'D'],
  [-1, 0, 'l', 'L'],
  [1, 0, 'r', 'R'],
];
type T = { w: number; h: number; wall: Uint8Array; goals: number[]; boxes: number[]; pl: number };
function PL(text: string): T {
  const rows = text.split('\n').filter((r) => r.length > 0);
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const wall = new Uint8Array(w * h).fill(1);
  const goals: number[] = [];
  const boxes: number[] = [];
  let pl = -1;
  rows.forEach((rw, y) => {
    for (let x = 0; x < rw.length; x++) {
      const ch = rw[x];
      const i = y * w + x;
      if (ch === '#') continue;
      wall[i] = 0;
      if (ch === '.' || ch === '*' || ch === '+') goals.push(i);
      if (ch === '$' || ch === '*') boxes.push(i);
      if (ch === '@' || ch === '+') pl = i;
    }
  });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (x === 0 || y === 0 || x === w - 1 || y === h - 1) wall[y * w + x] = 1;
  return { w, h, wall, goals, boxes: boxes.sort((a, b) => a - b), pl };
}
function LV(v: T): Uint8Array {
  const { w, wall, goals } = v;
  const lv = new Uint8Array(wall.length);
  const qu = [...goals];
  for (const g of goals) lv[g] = 1;
  while (qu.length > 0) {
    const x = qu.shift()!;
    for (const [dx, dy] of D) {
      const d = dy * w + dx;
      const y = x - d;
      if (!wall[y] && !wall[y - d] && !lv[y]) {
        lv[y] = 1;
        qu.push(y);
      }
    }
  }
  return lv;
}
function RH(v: T, oc: Uint8Array, fr: number, sn: Int32Array, sm: number, st: Int32Array): number {
  const { w, wall } = v;
  let low = fr;
  let n = 0;
  st[n++] = fr;
  sn[fr] = sm;
  while (n > 0) {
    const p = st[--n]!;
    if (p < low) low = p;
    for (let k = 0; k < 4; k++) {
      const q = k === 0 ? p - w : k === 1 ? p + w : k === 2 ? p - 1 : p + 1;
      if (wall[q] === 0 && oc[q] === 0 && sn[q] !== sm) {
        sn[q] = sm;
        st[n++] = q;
      }
    }
  }
  return low;
}
function FB(v: T, oc: Uint8Array, gl: Uint8Array, t: number): boolean {
  const { w, wall } = v;
  for (const a of [t, t - 1, t - w, t - w - 1]) {
    const b = a + 1;
    const c = a + w;
    const d = c + 1;
    if (!(wall[a] || oc[a]) || !(wall[b] || oc[b]) || !(wall[c] || oc[c]) || !(wall[d] || oc[d])) continue;
    if ((oc[a] && !gl[a]) || (oc[b] && !gl[b]) || (oc[c] && !gl[c]) || (oc[d] && !gl[d])) return true;
  }
  return false;
}
const KY = (boxes: number[], low: number, sz: number): number => {
  let k = low;
  for (const b of boxes) k = k * sz + b;
  return k;
};
function SO(v: T, maxStates: number = ROOM_STATE_CAP): { pushes: number; moves: string } | null {
  const { w, wall, goals } = v;
  const sz = wall.length;
  const gl = new Uint8Array(sz);
  for (const g of goals) gl[g] = 1;
  const lv = LV(v);
  const oc = new Uint8Array(sz);
  const sn = new Int32Array(sz);
  const mk = new Int32Array(sz);
  const st = new Int32Array(sz);
  let sm = 0;
  const sv = (boxes: number[]): boolean => boxes.every((b) => gl[b]);
  if (v.boxes.some((b) => !lv[b])) return null;
  const sB: number[][] = [v.boxes];
  const sP: number[] = [v.pl];
  const pa: number[] = [-1];
  const ix = new Map<number, number>();
  for (const b of v.boxes) oc[b] = 1;
  ix.set(KY(v.boxes, RH(v, oc, v.pl, sn, ++sm, st), sz), 0);
  for (const b of v.boxes) oc[b] = 0;
  let fd = sv(v.boxes) ? 0 : -1;
  for (let hd = 0; fd < 0 && hd < sB.length; hd++) {
    const boxes = sB[hd]!;
    for (const b of boxes) oc[b] = 1;
    RH(v, oc, sP[hd]!, sn, ++sm, st);
    const here = sm;
    for (let bi = 0; bi < boxes.length && fd < 0; bi++) {
      const b = boxes[bi]!;
      for (const [dx, dy] of D) {
        const d = dy * w + dx;
        const t = b + d;
        if (sn[b - d] !== here || wall[t] || oc[t] || !lv[t]) continue;
        oc[b] = 0;
        oc[t] = 1;
        const fz = FB(v, oc, gl, t);
        let ky = -1;
        let nx: number[] | null = null;
        if (!fz) {
          nx = boxes.slice();
          nx[bi] = t;
          nx.sort((x, y) => x - y);
          ky = KY(nx, RH(v, oc, b, mk, ++sm, st), sz);
        }
        oc[t] = 0;
        oc[b] = 1;
        if (fz || ix.has(ky)) continue;
        if (sB.length >= maxStates) {
          for (const x of boxes) oc[x] = 0;
          return null;
        }
        ix.set(ky, sB.length);
        sB.push(nx!);
        sP.push(b);
        pa.push(hd);
        if (sv(nx!)) {
          fd = sB.length - 1;
          break;
        }
      }
    }
    for (const x of boxes) oc[x] = 0;
  }
  if (fd < 0) return null;
  const pt: number[] = [];
  for (let s = fd; s > 0; s = pa[s]!) pt.push(s);
  pt.reverse();
  let moves = '';
  let pl = v.pl;
  let boxes = v.boxes;
  for (const s of pt) {
    const nB = sB[s]!;
    const fr = boxes.find((b) => !nB.includes(b))!;
    const to = nB.find((b) => !boxes.includes(b))!;
    const d = to - fr;
    const dr = D.find(([dx, dy]) => dy * w + dx === d)!;
    for (const b of boxes) oc[b] = 1;
    moves += WK(v, oc, pl, fr - d);
    for (const b of boxes) oc[b] = 0;
    moves += dr[3];
    pl = fr;
    boxes = nB;
  }
  return { pushes: pt.length, moves };
}
function WK(v: T, oc: Uint8Array, fr: number, to: number): string {
  const { w, wall } = v;
  if (fr === to) return '';
  const pv = new Int32Array(wall.length).fill(-1);
  const hw: string[] = new Array(wall.length);
  const qu = [fr];
  pv[fr] = fr;
  for (let qi = 0; qi < qu.length; qi++) {
    const p = qu[qi]!;
    if (p === to) break;
    for (const [dx, dy, letter] of D) {
      const q = p + dy * w + dx;
      if (wall[q] || oc[q] || pv[q] !== -1) continue;
      pv[q] = p;
      hw[q] = letter;
      qu.push(q);
    }
  }
  if (pv[to] === -1) throw new Error('walkTo: the push square is out of reach');
  let s = '';
  for (let p = to; p !== fr; p = pv[p]!) s = hw[p]! + s;
  return s;
}
function EO(w: number, fr: number, moves: string): number {
  let p = fr;
  for (const ch of moves.toLowerCase()) p += ch === 'u' ? -w : ch === 'd' ? w : ch === 'l' ? -1 : 1;
  return p;
}
type R = { sq: number[]; boxes: number[]; goals: number[]; done?: boolean };
function RM(v: T): R[] | null {
  const { w, wall, goals, boxes, pl } = v;
  const lv = LV(v);
  const rw = Math.floor(pl / w);
  const ct = new Uint8Array(wall.length);
  for (let i = rw * w; i < (rw + 1) * w; i++) if (!wall[i] && !lv[i]) ct[i] = 1;
  if (boxes.some((b) => ct[b])) return null;
  const pt2 = new Int32Array(wall.length).fill(-1);
  const rm: R[] = [];
  for (let s = 0; s < wall.length; s++) {
    if (wall[s] || ct[s] || pt2[s] >= 0) continue;
    const sq = [s];
    pt2[s] = rm.length;
    for (let i = 0; i < sq.length; i++) {
      for (const [dx, dy] of D) {
        const q = sq[i]! + dy * w + dx;
        if (!wall[q] && !ct[q] && pt2[q] < 0) {
          pt2[q] = rm.length;
          sq.push(q);
        }
      }
    }
    rm.push({ sq, boxes: [], goals: [] });
  }
  for (const b of boxes) rm[pt2[b]!]!.boxes.push(b);
  for (const g of goals) if (pt2[g]! >= 0) rm[pt2[g]!]!.goals.push(g);
  if (goals.some((g) => pt2[g]! < 0) || rm.some((r) => r.boxes.length !== r.goals.length)) return null;
  return rm.filter((r) => r.boxes.length > 0);
}
function SB(v: T, maxStates: number = ROOM_STATE_CAP): { pushes: number; moves: string } | null {
  const rm = RM(v);
  if (rm === null) return SO(v, maxStates);
  let pl = v.pl;
  let pushes = 0;
  let moves = '';
  for (const room of rm) {
    const wall = v.wall.slice();
    for (const other of rm) if (other !== room) for (const b of other.done ? other.goals : other.boxes) wall[b] = 1;
    // RM already emits each room's boxes/goals in ascending square order
    // (PL scans row-major), so no re-sort is needed here.
    const sub: T = { w: v.w, h: v.h, wall, goals: room.goals.slice(), boxes: room.boxes.slice(), pl };
    const sv = SO(sub, maxStates);
    if (sv === null) return null;
    pushes += sv.pushes;
    moves += sv.moves;
    pl = EO(v.w, pl, sv.moves);
    room.done = true;
  }
  return { pushes, moves };
}
function solve(text: string): string {
  const v = PL(text);
  const sv = SB(v);
  return sv === null ? '' : sv.moves;
}
for (const id of readdirSync(I).sort()) {
  const moves = solve(readFileSync(join(I, id, 'level.txt'), 'utf8'));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'solution.txt'), `${moves}\n`);
}
