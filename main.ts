// Tiny stack VM: runs each program under the input root, writes its answer out.
import { readFileSync as r, writeFileSync as w, mkdirSync as m, readdirSync as d } from 'node:fs';
import { join as j } from 'node:path';

function run(P, F) {
  const s = new Int32Array(256), c = new Int32Array(64), M = new Int32Array(256), o = [];
  let p = 0, t = 0, q = 0, n = 0, i = 0;
  const e = (x) => ({ o: Buffer.from(o), c: x });
  const off = () => { const v = P[p + 1] | P[p + 2] << 8; return v & 0x8000 ? v - 0x10000 : v; };
  for (;;) {
    if (n >= 1e6) return e(10);
    if (p < 0 || p >= P.length) return e(9);
    const k = P[p];
    let a = 0, b = 0, g = 0;
    if (k === 1) { a = 1; g = 1; }
    else if (k === 2) { a = 4; g = 1; }
    else if (k === 0x52) g = 1;
    else if (k === 4) { b = 1; g = 2; }
    else if (k === 6) { b = 2; g = 3; }
    else if (k === 5 || k === 7) { b = k === 5 ? 2 : 3; g = b; }
    else if (k === 3 || k === 0x50 || k === 0x51 || k === 0x53) b = 1;
    else if (k === 0x40) { b = 1; g = 1; }
    else if (k === 0x41) b = 2;
    else if (k === 0x17 || k === 0x1b) { b = 1; g = 1; }
    else if (k >= 0x10 && k <= 0x22 && k !== 0x1f) { b = 2; g = 1; }
    else if (k === 0x30 || k === 0x33) a = 2;
    else if (k === 0x31 || k === 0x32) { a = 2; b = 1; }
    else if (k === 0 || k === 0x34) { /* halt / ret */ }
    else return e(5);
    if (p + 1 + a > P.length) return e(9);
    if (t < b) return e(2);
    if (t - b + g > 256) return e(3);
    n++;
    let x, y, z;
    switch (k) {
      case 0: return e(0);
      case 1: s[t++] = (P[p + 1] << 24) >> 24; p += 2; break;
      case 2: s[t++] = P[p + 1] | P[p + 2] << 8 | P[p + 3] << 16 | P[p + 4] << 24; p += 5; break;
      case 3: t--; p++; break;
      case 4: s[t] = s[t - 1]; t++; p++; break;
      case 5: z = s[t - 1]; s[t - 1] = s[t - 2]; s[t - 2] = z; p++; break;
      case 6: s[t] = s[t - 2]; t++; p++; break;
      case 7: z = s[t - 3]; s[t - 3] = s[t - 2]; s[t - 2] = s[t - 1]; s[t - 1] = z; p++; break;
      case 0x10: y = s[--t]; s[t - 1] = (s[t - 1] + y) | 0; p++; break;
      case 0x11: y = s[--t]; s[t - 1] = (s[t - 1] - y) | 0; p++; break;
      case 0x12: y = s[--t]; s[t - 1] = Math.imul(s[t - 1], y); p++; break;
      case 0x13: y = s[--t]; if (y === 0) return e(4); x = s[t - 1]; s[t - 1] = Math.trunc(x / y) | 0; p++; break;
      case 0x14: y = s[--t]; if (y === 0) return e(4); x = s[t - 1]; s[t - 1] = x % y | 0; p++; break;
      case 0x15: y = s[--t]; if (y === 0) return e(4); x = s[t - 1]; s[t - 1] = Math.floor((x >>> 0) / (y >>> 0)) | 0; p++; break;
      case 0x16: y = s[--t]; if (y === 0) return e(4); x = s[t - 1]; s[t - 1] = (x >>> 0) % (y >>> 0) | 0; p++; break;
      case 0x17: s[t - 1] = (-s[t - 1]) | 0; p++; break;
      case 0x18: y = s[--t]; s[t - 1] = s[t - 1] & y; p++; break;
      case 0x19: y = s[--t]; s[t - 1] = s[t - 1] | y; p++; break;
      case 0x1a: y = s[--t]; s[t - 1] = s[t - 1] ^ y; p++; break;
      case 0x1b: s[t - 1] = ~s[t - 1]; p++; break;
      case 0x1c: y = s[--t]; s[t - 1] = s[t - 1] << (y & 31); p++; break;
      case 0x1d: y = s[--t]; s[t - 1] = s[t - 1] >> (y & 31); p++; break;
      case 0x1e: y = s[--t]; s[t - 1] = (s[t - 1] >>> (y & 31)) | 0; p++; break;
      case 0x20: y = s[--t]; s[t - 1] = s[t - 1] === y ? 1 : 0; p++; break;
      case 0x21: y = s[--t]; s[t - 1] = s[t - 1] < y ? 1 : 0; p++; break;
      case 0x22: y = s[--t]; s[t - 1] = (s[t - 1] >>> 0) < (y >>> 0) ? 1 : 0; p++; break;
      case 0x30: p = p + 3 + off(); break;
      case 0x31: z = s[--t]; p = z === 0 ? p + 3 + off() : p + 3; break;
      case 0x32: z = s[--t]; p = z !== 0 ? p + 3 + off() : p + 3; break;
      case 0x33: if (q >= 64) return e(7); c[q++] = p + 3; p = P[p + 1] | P[p + 2] << 8; break;
      case 0x34: if (q === 0) return e(8); p = c[--q]; break;
      case 0x40: x = s[--t]; if (x < 0 || x > 255) return e(6); s[t++] = M[x]; p++; break;
      case 0x41: x = s[--t]; z = s[--t]; if (x < 0 || x > 255) return e(6); M[x] = z; p++; break;
      case 0x50: { z = s[--t]; const v = String(z); if (o.length + v.length > 65536) return e(11); o.push(...Buffer.from(v)); p++; break; }
      case 0x51: z = s[--t]; if (o.length + 1 > 65536) return e(11); o.push(z & 255); p++; break;
      case 0x52: s[t++] = i < F.length ? F[i++] : -1; p++; break;
      case 0x53: return e(s[--t] & 255);
    }
  }
}

const A = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const B = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const f of d(A, { withFileTypes: true })) {
  if (!f.isDirectory()) continue;
  const { o, c } = run(r(j(A, f.name, 'program.bin')), r(j(A, f.name, 'input.bin')));
  m(j(B, f.name), { recursive: true });
  w(j(B, f.name, 'stdout.bin'), o);
  w(j(B, f.name, 'exit.txt'), String(c) + '\n');
}
