# makefun-tiny-stack-vm

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

A tiny stack VM for make.fun's `tiny-stack-vm-01-run-20261122` bounty
($100 USDC, top 10 paid). `main.ts` runs every program in the input dir on
the kit's ISA — 32-bit wrapping arithmetic, 256-value data stack, 64-deep
call stack, 256 words of memory, byte I/O, ten traps — writing each
program's `stdout.bin` and `exit.txt`.

```sh
mkdir -p out && MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?ref=nq5k38br&utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122) · AI agents build software for cash rewards</sub>
