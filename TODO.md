# FileCommander TODO

## High priority: open paths with the operating-system default handler

- [x] Add a dedicated, cross-platform `fc_open_path` tool for opening an
      existing local file or directory with the operating-system default
      application.

### Evidence

On Windows on 2026-08-25, opening a PDF through `fc_execute_command` was not a
reliable workflow:

- `Start-Process -FilePath <path>` failed because the command runner used a
  non-PowerShell shell.
- Calling `explorer.exe <path>` returned a failure status and therefore did not
  provide reliable launch evidence.
- Explicit PowerShell execution of `Start-Process -FilePath <path>` succeeded.

### Acceptance criteria

- Resolve and validate an absolute local target before launching it.
- Do not build an interpolated shell command from the target path.
- On Windows, use a robust native default-handler route. On macOS, use `open`;
  on Linux, use `xdg-open` or the documented desktop equivalent.
- Return an honest launch acknowledgement containing the resolved path and
  platform. Do not interpret the exit code of an intermediate launcher such as
  `explorer.exe` as proof that the associated application opened successfully.
- Cover paths with spaces, Unicode characters such as ä, ö, ü, and OneDrive-
  style locations in automated tests. Mock the GUI-launch boundary so tests do
  not open visible applications.
- Document the difference between `fc_open_path`, `fc_start_process`, and
  `fc_execute_command`.
- Either document the Windows shell used by `fc_execute_command` explicitly or
  add a safe, enumerated shell option such as `cmd` / `powershell`; do not imply
  that PowerShell-native commands work when the configured shell is `cmd.exe`.

### Completed

Released as `ellmos-filecommander-mcp@1.10.4` from commit `168098d` on
2026-08-26. Verified with 202 Vitest tests, 69 standalone i18n checks, the
9-job multi-OS CI matrix, both CodeQL jobs, npm publication, a fresh global
installation, and a real 49-tool stdio handshake. GUI visibility was not
claimed or tested.

## Documentation follow-up after repository cooldown

- [x] After 2026-08-27T11:24:44+02:00, synchronize the missing
      `Haftung / Liability` section from `README.md` into `README_de.md`, then
      re-run the bilingual heading and content-parity checks. Current measured
      structure: 45 English headings versus 45 German headings (synchronized).

## AI Security & Dependency Audit (2026-11-04)

- [x] Comprehensive supply-chain and vulnerability audit (`npm audit` -> 0 vulnerabilities across 215 packages).
- [x] Upgrade `@modelcontextprotocol/sdk` to `^1.32.2` (resolving upstream advisories GHSA-6qxp-vccf-f47h, GHSA-22jm-h49p-29qw, GHSA-6prh-2h8m-c8cw, GHSA-46jr-4wx8-v453, GHSA-rvq5-wwqv-78pq, GHSA-f897-62hf-6gxq).
- [x] Harden `zod` to `^4.6.7` (mitigating memory exhaustion vulnerability GHSA-mrhx-c7xc-m3w5).
- [x] Align and pin supply-chain security overrides in `package.json` with sibling MCP servers:
  - `proxy-addr` (`^2.0.8`, critical GHSA-jqcg-44mw-7w3h)
  - `body-parser` (`^2.4.0`, high GHSA-27r3-jxmh-p828)
  - `ip-address` (`^10.7.5`, updated from `^10.7.4`)
  - `vitest` (`^4.1.12`)
  - `@vitest/mocker` (`^4.1.12`)
  - `source-map-js` (`^1.2.2`)
  - `postcss` (`^8.5.18`)
- [x] Harmonize Level 1 SBOM documents (`THIRD_PARTY_LICENSES.md` & `THIRD_PARTY_LICENSES.txt`) to audit date 2026-11-04.
- [x] AST/Regex secrets and privacy scan: 0 hardcoded personal developer homepaths (`C:\Users\lukas\...`), 0 credentials/tokens, 0 private keys (except synthetic INV-MASK-06 test fixture).
- [x] Extend automated contract test suite (`test/metadata-parity.test.ts`) verifying hardened overrides, SBOM date, and TODO register parity.
- [x] Synchronize Plan D OneDrive mirror via `repo_mirror.py --apply`.

## AI Security & Dependency Audit (2026-09-19)

- [x] Comprehensive supply-chain and vulnerability audit (`npm audit` -> 0 vulnerabilities).
- [x] Resolve `adm-zip` (GHSA-vwc7-r8mq-g2x9, GHSA-7q85-xj36-vmfc) by upgrading to `^0.6.1`.
- [x] Resolve `js-yaml` (GHSA-2883-xcg3-v3hh) by upgrading to `^4.3.2`.
- [x] Resolve `smol-toml` (GHSA-7w5x-hrqm-74c2) by upgrading to `^1.8.0`.
- [x] Resolve `hono` (GHSA-gqvv-2mrq-wpjv, GHSA-g6gw-c38x-mqfc, GHSA-crvj-82cr-hjcx) via override `^4.13.8`.
- [x] Resolve `vitest` / `@vitest/mocker` (GHSA-82fw-gwwq-j7x9) by upgrading to `^4.1.11`.
- [x] Un-ignore `TODO.md` in `.gitignore` and restore git tracking.
- [x] Harden `.gitignore` against SSL certificates (`*.crt`, `*.cert`, `*.csr`), packaging credentials (`.pypirc`), tokens/secrets (`*.token`, `*.secret`, `credentials.json`), wildcard SSH keys (`id_rsa*`, `id_ed25519*`, `id_ecdsa*`, `id_dsa*`), and patch artifacts (`*.orig`, `*.rej`).
- [x] Codify binding 30-day remediation SLA in `SECURITY.md` (EN & DE).
- [x] Synchronize `THIRD_PARTY_LICENSES.md` inventory date (`2026-09-19`) and version ranges.
- [x] Add automated Vitest contract tests for 0 vulnerabilities, version 1.11.3 parity, and hardened gitignore patterns.

