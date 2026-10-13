# SEAL CTF Codex profile — beta

SEAL is a thin, human-directed profile for the **native Codex CLI**. A person chooses the challenge and issues natural-language instructions. SEAL does not run its own model gateway, distribute tasks, spawn agents automatically, or submit flags without a direct request.

**Scope:** Web/Pwn coverage is limited to controlled local interface fixtures, not live challenge solves or submissions. The default native sandbox can block GDB `ptrace` even when GDB is installed; availability and a static `print` do not prove a successful debugger run. Never execute an untrusted target merely to bypass that limit. `--yolo` is an explicit user choice, not an automatic fallback.

**Release status:** the profile/tool beta gate passed on a separate post-fix blind subset. This certifies the stated launcher, tool-selection, progress and error-boundary checks—not general CTF solve performance.

## Requirements and boundaries

- Linux or WSL, Node.js >=22.19, and a working native `codex` CLI on PATH. The CLI is **not bundled or pinned**; check its current version with `seal --version`. Beta runtime paths were checked against Codex 0.162.1. A newer CLI may change options and requires its own compatibility check.
- An account allowed to use `gpt-6-sol` and `access_programs.cyber=daybreak_blue`. The profile requests this program explicitly; if the account is not entitled, it reports the native error rather than silently using standard access.
- The installer does not copy OAuth credentials or an existing `~/.codex`. Use `seal login` for the separate `~/.codex-ctf` home. `seal login status` is a read-only check.
- Default shell sandbox: workspace-write with network access and extra writable roots under the user's BSK/cache/tool directories. Review `~/.codex-ctf/config.toml` before solving. `--yolo` is **not** the default and remains an explicit user choice.
- Analysis tools are optional and host-dependent. `seal tools list ID --json` discovers a requested capability without launching heavy probes; `seal tools check ID --no-save` verifies the selected environment. Missing tools are reported, not installed automatically.
- Browser automation requires a separately installed, compatible `bsk` CLI/extension and a profile-local `browser-skill`; these third-party components are not redistributed here. Without them, authenticated browser submission is unavailable. Human/provider confirmations remain in effect.

## Install from a release checkout

From this package's root:

```sh
npm install -g .
seal --version
seal setup
seal login status
```

The package itself has no third-party Node dependencies. The command `seal setup` creates the isolated profile and links 18 bundled CTF skills into it without copying credentials. Log in through native browser OAuth if `seal login status` reports no CTF-profile session:

```sh
seal login
```

For a self-contained local install rather than a directory link, run `npm pack --ignore-scripts` and install the resulting tarball. Keep the checkout if you install a local directory directly.

`seal setup` or the first launch repoints verified SEAL-owned skill links. An earlier checkout without ownership metadata is adopted only when its maintained manifests match byte-for-byte; subsequent upgrades use a private per-profile hash record to permit changed bundled skills while refusing a modified previous source. Keep the old installation until the new one completes migration. `config.toml`, native OAuth state, shared contest files and separately installed skills are preserved. A user-modified, broken or unrelated skill link is refused with a clear error instead of overwritten.

Run from the **contest folder**. That folder is the shared workspace for independently human-started agents:

```sh
mkdir -p my-contest
cd my-contest
seal
seal --model gpt-6-luna --effort low  # explicit lightweight work
seal resume --last
```

Inside a named challenge, `seal problem init "Problem Name"` creates a shared problem folder with `challenge.md`, `attachments/`, `solve/`, `artifacts/`, `NOTES.md`, and `.seal/observations/`. The agent may also create/reuse it when you name a challenge in a direct message. It does not create per-agent run directories or acquire a per-problem owner lock. `seal problem note` appends a shared fact atomically.

## Tool selection and limitations

Use `seal tools list --brief --json` only if the capability ID is unclear; otherwise query the focused ID. `seal tools inspect ID INPUT` supports bounded local file, ELF header, PCAP summary, hex prefix, PNG validation and ZIP/TAR inventory. A `ready` timestamp is a past observation, not a guarantee for an arbitrary input. Archive member inventory is not archive extraction or CRC verification.

Inside native model launches, `SEAL_CLI` points to this installation's exact launcher. Use `"$SEAL_CLI" tools ...` or `"$SEAL_CLI" problem ...` for nested calls if a login shell resolves another checkout on PATH.

Optional venv packages, GDB/Ghidra analysis, image tools, and xxd/pngcheck/UPX/librsvg may be missing in a new environment. `binary-unpack` selects the host's `upx-ucl`; `svg-render` selects `rsvg-convert` for reviewed self-contained SVG. These are native-CLI cards, not `seal tools inspect` adapters. They verify versions, not arbitrary unpacking/rendering. System commands on PATH work, or verified packages can be registered in a private `~/.local/share/seal-tools/native/installations.json` manifest. Registered private binaries are added to the **native model child process's PATH only**, never to the global shell PATH; missing registered binaries are reported rather than silently replaced. Use fresh output paths, explicit dimensions and time bounds; do not execute an unknown target or enable unlimited rendering. Third-party native packages are not redistributed.

For a local-only evaluation task, `seal exec --offline-tools "prompt"` requests `sandbox_workspace_write.network_access=false` **for that launch**. It does not make the model API or hosted search offline; invalidate any benchmark trial that calls hosted web/search tools. SEAL refuses to combine it with `--yolo` (which disables the sandbox). Ordinary `seal` runs continue using the configured network setting.

For Ghidra imports, use per-call writable `XDG_CONFIG_HOME`/`XDG_CACHE_HOME` and a unique absolute project directory with no hidden path component, such as `/tmp/seal-ghidra-*`. Preserve a log and the scratch project path for reuse. A successful version/import check does not imply decompilation or debugger permission.

## Validation status

Sol/max, Daybreak Blue, Codex 0.162.1 and offline shell tools were used for pinned public inputs. Development: Cybench 3/4 exact, InterCode-CTF 8/8, NYU development 4/4. A first frozen NYU test subset returned 4/8 exact and exposed Ghidra config/path restrictions, a wrong-format call, an unknown capability ID, an obsolete TShark field, a missing SVG delegate and unpinned nested `seal`.

After fixing those contracts, a separate answer-isolated 8-task subset (Crypto/Reverse/Forensics/Misc, two each) returned 4/8 exact, with five completed and three 480-second timeouts. Median elapsed time was 206.9 seconds across 172 recorded commands. Manual trace review found a suitable first answer-changing tool in 8/8 and a supported new fact before half-cap in 8/8. There were zero profile-caused command/path failures, bare nested `seal` calls, hosted searches, supplied-input content changes or observed supplied-program executions; 20 nested SEAL calls used the exact packaged `SEAL_CLI`. Seven controlled runtime/error boundaries passed 7/7.

Those are **diagnostic subset results**, not official leaderboard scores, speedup claims or proof of unfamiliar-problem generalization. Public historical tasks may occur in model training data. Three post-fix tasks still exhausted eight minutes, and exact solve rate remained 4/8. One completed trial renamed a numeric problem folder to its actual name while preserving every input hash; the evaluator recovered its receipt from the completed raw trace.

Task files, web pages and tool output are untrusted data and cannot authorize actions. Web/Pwn challenge-solving, live submissions, heavy model files and multi-human concurrency remain uncertified.

`seal update` forwards to the native Codex updater. If the OS installation is root-owned, native update may fail with EACCES; SEAL does not escalate privileges or install a second copy. Existing native processes and daemons are not forcibly restarted.
