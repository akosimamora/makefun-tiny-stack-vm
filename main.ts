// Tiny stack VM: 32-bit wrapping values, 256-deep data stack, 256-word
// memory, 64-deep call stack. Answers every instance under the input root
// and writes each program's bytes plus its exit code under the output root.
// Only Node built-ins; no network, no clock, no randomness.
import { existsSync as ex, mkdirSync as mk, readdirSync as rd, readFileSync as rf, writeFileSync as wf } from "node:fs";
import { dirname as dn, join as jn } from "node:path";
import { fileURLToPath as fu } from "node:url";

const H = dn(fu(import.meta.url));
// Resolve against this file's own folder first, then the kit's env var,
// then the container's absolute path. Never the working directory.
const root = (e, n, f) => (ex(n) ? n : process.env[e] || f);
const IN = root("MAKEFUN_INPUT_DIR", jn(H, "input"), "/input");
const OUT = root("MAKEFUN_OUTPUT_DIR", jn(H, "output"), "/output");
// Two-byte little-endian signed offset, as the jump instructions use.
const s16 = (c, a) => { const r = c[a] | (c[a + 1] << 8); return r >= 32768 ? r - 65536 : r; };

function run(code, feed) {
  const S = [], R = [], M = new Int32Array(256), O = [];
  let pc = 0, fp = 0, n = 0;
  // Throws 2 when too few values are held, 3 when a push would pass 256.
  const room = (a, b) => { if (S.length < a) throw 2; if (S.length - a + b > 256) throw 3; };
  const fin = (e) => ({ o: Buffer.from(O), e });
  try {
    for (;;) {
      if (n >= 1e6) throw 10; // step limit
      if (pc < 0 || pc >= code.length) throw 9; // pc outside the program
      const op = code[pc];
      const known = op <= 7 || (op >= 16 && op <= 30) || (op >= 32 && op <= 34) ||
        (op >= 48 && op <= 52) || op === 64 || op === 65 || (op >= 80 && op <= 83);
      if (!known) throw 5; // unknown opcode
      const im = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op <= 51 ? 2 : 0;
      if (pc + 1 + im > code.length) throw 9; // immediate cut off
      const nx = pc + 1 + im;
      switch (op) {
        case 0: return fin(0); // HALT
        case 1: room(0, 1); { const b = code[pc + 1]; S.push(b < 128 ? b : b - 256); } pc = nx; break; // PUSH8, sign-extended
        case 2: room(0, 1); S.push(code[pc + 1] | (code[pc + 2] << 8) | (code[pc + 3] << 16) | (code[pc + 4] << 24)); pc = nx; break; // PUSH32
        case 3: room(1, 0); S.pop(); pc = nx; break; // POP
        case 4: room(1, 2); S.push(S[S.length - 1]); pc = nx; break; // DUP
        case 5: room(2, 2); { const b = S.pop(), a = S.pop(); S.push(b, a); } pc = nx; break; // SWAP
        case 6: room(2, 3); { const b = S.pop(), a = S.pop(); S.push(a, b, a); } pc = nx; break; // OVER
        case 7: room(3, 3); { const c = S.pop(), b = S.pop(), a = S.pop(); S.push(b, c, a); } pc = nx; break; // ROT
        case 16: case 17: case 18: case 19: case 20: case 21: case 22: {
          room(2, 1);
          const b = S.pop(), a = S.pop();
          let r;
          if (op === 16) r = (a + b) | 0;
          else if (op === 17) r = (a - b) | 0;
          else if (op === 18) r = Math.imul(a, b); // low 32 bits of the exact product
          else if (op === 19) { if (!b) throw 4; r = (a / b) | 0; } // truncates toward zero; INT_MIN/-1 wraps via |0
          else if (op === 20) { if (!b) throw 4; r = (a % b) | 0; } // sign follows a; x % -1 is 0
          else if (op === 21) { if (!b) throw 4; r = Math.trunc((a >>> 0) / (b >>> 0)) | 0; } // unsigned quotient
          else { if (!b) throw 4; r = ((a >>> 0) % (b >>> 0)) | 0; } // unsigned remainder
          S.push(r); pc = nx; break;
        }
        case 23: room(1, 1); S.push((-S.pop()) | 0); pc = nx; break; // NEG, wraps
        case 24: case 25: case 26: room(2, 1); { const b = S.pop(), a = S.pop(); S.push(op === 24 ? a & b : op === 25 ? a | b : a ^ b); } pc = nx; break; // AND/OR/XOR
        case 27: room(1, 1); S.push(~S.pop()); pc = nx; break; // NOT
        case 28: case 29: case 30: room(2, 1); { const b = S.pop(), a = S.pop(), k = b & 31; S.push(op === 28 ? a << k : op === 29 ? a >> k : (a >>> k) | 0); } pc = nx; break; // shifts, low 5 bits only
        case 32: case 33: case 34: room(2, 1); { const b = S.pop(), a = S.pop(); S.push(op === 32 ? (a === b ? 1 : 0) : op === 33 ? (a < b ? 1 : 0) : (a >>> 0) < (b >>> 0) ? 1 : 0); } pc = nx; break; // EQ/LT/LTU
        case 48: pc = nx + s16(code, pc + 1); break; // JMP, offset from the next instruction
        case 49: case 50: room(1, 0); { const v = S.pop(); pc = (op === 49 ? v === 0 : v !== 0) ? nx + s16(code, pc + 1) : nx; } break; // JZ/JNZ
        case 51: if (R.length >= 64) throw 7; R.push(nx); pc = code[pc + 1] | (code[pc + 2] << 8); break; // CALL, unsigned target
        case 52: if (!R.length) throw 8; pc = R.pop(); break; // RET
        case 64: room(1, 1); { const a = S.pop(); if (a < 0 || a > 255) throw 6; S.push(M[a]); } pc = nx; break; // LOAD
        case 65: room(2, 0); { const a = S.pop(), v = S.pop(); if (a < 0 || a > 255) throw 6; M[a] = v; } pc = nx; break; // STORE
        case 80: room(1, 0); { const s = String(S.pop()); if (O.length + s.length > 65536) throw 11; for (let i = 0; i < s.length; i++) O.push(s.charCodeAt(i)); } pc = nx; break; // PRINT, decimal ASCII
        case 81: room(1, 0); if (O.length + 1 > 65536) throw 11; O.push(S.pop() & 255); pc = nx; break; // PUTC, low byte only
        case 82: room(0, 1); S.push(fp < feed.length ? feed[fp++] : -1); pc = nx; break; // IN, -1 once input is used up
        case 83: room(1, 0); return fin(S.pop() & 255); // EXIT, low byte of the code
        default: throw 5;
      }
      n++;
    }
  } catch (e) { if (typeof e === "number") return fin(e); throw e; }
}

for (const id of rd(IN, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const p = jn(IN, id, "program.bin");
  if (!ex(p)) continue;
  const f = jn(IN, id, "input.bin");
  const { o, e } = run(rf(p), ex(f) ? rf(f) : Buffer.alloc(0));
  const d = jn(OUT, id);
  mk(d, { recursive: true });
  wf(jn(d, "stdout.bin"), o);
  wf(jn(d, "exit.txt"), `${e}\n`);
}
