---
name: ctf-pwn
description: Exploit a human-assigned native CTF binary or service after the vulnerability or low-level primitive is understood. Use for memory corruption, format strings, heap, ROP, shellcode, seccomp or kernel challenge paths; use ctf-reverse first when behavior is still unknown.
license: MIT
metadata:
  user-invocable: true
---

# CTF Pwn — local primitive before remote exploit

Do not execute an unknown binary merely to classify it. Human assignment of a CTF binary permits challenge analysis, not unrelated host or network access.

## Prepared environment

- Static: use the focused `seal tools list elf-header debugger-gdb --json` only if `file`, `readelf`, `objdump` or GDB paths/readiness are uncertain; `seal-binary-observe` supplies bounded ELF header facts.
- Python: query `seal tools list python-math --json` for the selected interpreter, then test the actual modules this problem needs. Invoke that interpreter with `-I -B`; an explicit override does not silently fall back. pwntools, Capstone, Unicorn and angr are optional rather than implied by SEAL installation.
- `pwn checksec` and `ropper` are optional launcher programs. If the selected Python belongs to a venv, their candidates are in the same `bin/` directory; verify executable availability before use. Do not copy a path from another user's machine or assume debugger extensions, gadget tools or QEMU are installed.

## Fast path

Before authorized local execution, inspect mode bits. If the preserved attachment is not executable, copy it under the problem's `solve/` or `artifacts/`, verify the copied hash, and add execute permission only to the copy. Do not mutate source attachments or assume launching the ELF interpreter is equivalent for every target.

1. Hash/preserve the original; identify architecture, linkage, interpreter, protections, supplied libc/loader and source. Use strings/imports/disassembly only around relevant code.
2. Reproduce the vulnerability locally with the smallest input. Separate crash, controlled instruction pointer, information leak and arbitrary read/write as distinct primitives.
3. Measure offsets with deterministic cyclic data and record exact crashing value/endian interpretation. Do not infer an offset from one visual guess.
4. Write one `exploit.py` supporting local and provided remote modes without duplicating payload logic. Pin supplied loader/libc when present; preserve actual leaks and compute bases explicitly.
5. Keep one GDB session for iterative work rather than reconnecting for every observation. Escalate to ROP/heap/FSOP/symbolic execution only after protections and primitive require it.
6. Validate locally to the strongest available boundary. Contact only the human-provided challenge service, maintain one stateful connection when useful, and do not spray hosts or ports.

## Recovery and completion

A debugger startup failure, wrong libc, architecture mismatch, remote reset and exploit-logic failure are different. Record the last proven primitive and the first failing invariant. If behavior is still not understood, pivot to `ctf-reverse`; if the service is a language jail rather than memory corruption, use `ctf-misc`.

A batch GDB command can exit 0 even when its inferior never started. Check the actual stop/frame and stderr before calling a printed global a runtime observation. If `ptrace: Operation not permitted` appears, classify it as a debugger permission boundary once; do not keep retrying GDB, swap to QEMU for a native binary without a separate reason, or treat a static `print` as a live value. Preserve exact QEMU errors (for example, `Exec format error` is not evidence of a socket denial). Report what static analysis established and what remains unobserved; an explicit user-selected execution mode is separate from the challenge-solve instruction.

Report the flag/evidence promptly once the exploit produces it. Do not claim reliability from one accidental crash and do not auto-submit.

If separately installed, optional primitive references may be under `~/.agents/skills/ctf-pwn/`. SEAL does not bundle them; read only a relevant file, never run its bundled exploits or installers as setup.
