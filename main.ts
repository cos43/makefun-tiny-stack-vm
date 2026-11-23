// Tiny stack VM: runs every program in the input dir on the ISA in the kit
// (32-bit wrapping arithmetic, 256-value data stack, 64-deep call stack,
// 256 words of memory, byte I/O, ten traps) and writes each program's
// output bytes and exit code. Local run on the practice set:
//   mkdir -p out && MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const IN = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
// [byte, immediate bytes, pops, pushes] for every opcode the ISA names.
const S: [number, number, number, number][] = [
  [0, 0, 0, 0], [1, 1, 0, 1], [2, 4, 0, 1], [3, 0, 1, 0],
  [4, 0, 1, 2], [5, 0, 2, 2], [6, 0, 2, 3], [7, 0, 3, 3],
  [16, 0, 2, 1], [17, 0, 2, 1], [18, 0, 2, 1], [19, 0, 2, 1],
  [20, 0, 2, 1], [21, 0, 2, 1], [22, 0, 2, 1], [23, 0, 1, 1],
  [24, 0, 2, 1], [25, 0, 2, 1], [26, 0, 2, 1], [27, 0, 1, 1],
  [28, 0, 2, 1], [29, 0, 2, 1], [30, 0, 2, 1],
  [32, 0, 2, 1], [33, 0, 2, 1], [34, 0, 2, 1],
  [48, 2, 0, 0], [49, 2, 1, 0], [50, 2, 1, 0], [51, 2, 0, 0], [52, 0, 0, 0],
  [64, 0, 1, 1], [65, 0, 2, 0],
  [80, 0, 1, 0], [81, 0, 1, 0], [82, 0, 0, 1], [83, 0, 1, 0],
];
const IM = new Uint8Array(256), PO = new Uint8Array(256), PU = new Uint8Array(256), OK = new Uint8Array(256);
for (const [o, i, p, u] of S) { IM[o] = i; PO[o] = p; PU[o] = u; OK[o] = 1; }

function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; exit: number } {
  const n = p.length, st = new Int32Array(256);
  let sp = 0;
  const cs = new Int32Array(64);
  let cp = 0;
  const mem = new Int32Array(256);
  const out = new Uint8Array(65536);
  let ol = 0, ip = 0, pc = 0, steps = 0;
  const done = (exit: number) => ({ out: out.subarray(0, ol), exit });
  for (;;) {
    if (steps === 1e6) return done(10); // step limit
    if (pc < 0 || pc >= n) return done(9); // pc outside the program
    const op = p[pc];
    if (!OK[op]) return done(5); // unknown opcode
    if (pc + IM[op] >= n) return done(9); // immediate cut off by the end
    steps++;
    if (sp < PO[op]) return done(2); // stack underflow
    if (sp - PO[op] + PU[op] > 256) return done(3); // stack overflow
    const nx = pc + 1 + IM[op];
    pc = nx;
    switch (op) {
      case 0: return done(0); // HALT
      case 1: st[sp++] = (p[nx - 1] << 24) >> 24; break; // PUSH8, sign-extended
      case 2: st[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break; // PUSH32
      case 3: sp--; break; // POP
      case 4: st[sp] = st[sp - 1]; sp++; break; // DUP
      case 5: { const t = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = t; break; } // SWAP
      case 6: st[sp] = st[sp - 2]; sp++; break; // OVER
      case 7: { const a = st[sp - 3]; st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = a; break; } // ROT
      case 23: st[sp - 1] = (-st[sp - 1]) | 0; break; // NEG
      case 27: st[sp - 1] = ~st[sp - 1]; break; // NOT
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30:
      case 32: case 33: case 34: {
        const b = st[sp - 1], a = st[sp - 2];
        let r: number;
        if (op === 16) r = (a + b) | 0;
        else if (op === 17) r = (a - b) | 0;
        else if (op === 18) r = Math.imul(a, b);
        else if (op === 19) { if (!b) return done(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; } // DIV
        else if (op === 20) { if (!b) return done(4); r = b === -1 ? 0 : (a % b) | 0; } // MOD, sign of a
        else if (op === 21) { if (!b) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; } // DIVU
        else if (op === 22) { if (!b) return done(4); r = ((a >>> 0) % (b >>> 0)) | 0; } // MODU
        else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31);
        else if (op === 30) r = (a >>> (b & 31)) | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // LTU
        sp -= 2; st[sp++] = r;
        break;
      }
      case 48: case 49: case 50: { // JMP / JZ / JNZ, signed 16-bit offset from nx
        const off = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        if (op === 48 || (op === 49 ? st[--sp] === 0 : st[--sp] !== 0)) pc = nx + off;
        break;
      }
      case 51: // CALL, unsigned 16-bit target
        if (cp === 64) return done(7);
        cs[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 52: // RET
        if (!cp) return done(8);
        pc = cs[--cp];
        break;
      case 64: { // LOAD
        const a = st[sp - 1];
        if (a < 0 || a > 255) return done(6);
        st[sp - 1] = mem[a];
        break;
      }
      case 65: { // STORE: ( v addr -- )
        const a = st[sp - 1];
        if (a < 0 || a > 255) return done(6);
        mem[a] = st[sp - 2];
        sp -= 2;
        break;
      }
      case 80: { // PRINT: decimal ASCII, no newline; a trap writes none of it
        const t = String(st[sp - 1]);
        if (ol + t.length > 65536) return done(11);
        for (let i = 0; i < t.length; i++) out[ol++] = t.charCodeAt(i);
        sp--;
        break;
      }
      case 81: // PUTC: low 8 bits
        if (ol + 1 > 65536) return done(11);
        out[ol++] = st[--sp] & 255;
        break;
      case 82: // IN: -1 once the input is used up
        st[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      case 83: // EXIT: low byte is the exit code
        return done(st[--sp] & 255);
      default: return done(5);
    }
  }
}

for (const id of readdirSync(IN).sort()) {
  const d = join(IN, id);
  const { out, exit } = run(new Uint8Array(readFileSync(join(d, 'program.bin'))), new Uint8Array(readFileSync(join(d, 'input.bin'))));
  mkdirSync(join(OUT, id), { recursive: true });
  writeFileSync(join(OUT, id, 'stdout.bin'), out);
  writeFileSync(join(OUT, id, 'exit.txt'), exit + '\n');
}
