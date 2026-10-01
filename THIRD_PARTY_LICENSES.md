# Third-Party License Inventory & Open-Source Transparency Notice

Stand: 2026-10-01.

> **Project:** `ellmos-ai/ellmos-filecommander-mcp` (FileCommander)<br>
> **Audited:** 2026-10-01 (Plain text companion: [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt))<br>
> **Repository License:** [MIT License](LICENSE)<br>
> **Architecture & Privacy:** 100% Local-First, Zero-Egress by default (explicit `fc_web_fetch` only), Unprivileged User-Mode (`RunAsInvoker`), Level 1 SBOM Transparency

This document inventories all direct third-party runtime and development dependencies used by `ellmos-filecommander-mcp`. A plain-text companion formatted for air-gapped environments and automated ingest is provided in [`THIRD_PARTY_LICENSES.txt`](THIRD_PARTY_LICENSES.txt).

## Runtime Dependencies

| Package | Version Range | License | Primary Purpose | Repository / Source |
|---------|---------------|---------|-----------------|---------------------|
| `@modelcontextprotocol/sdk` | `^1.30.0` | MIT | Core Model Context Protocol stdio transport & schema binding | https://github.com/modelcontextprotocol/typescript-sdk |
| `zod` | `^3.23.8` | MIT | Tool argument schema validation & parsing | https://github.com/colinhacks/zod |
| `adm-zip` | `^0.6.1` | MIT | ZIP archive creation, extraction, and inspection | https://github.com/cthackers/adm-zip |
| `js-yaml` | `^4.3.2` | MIT | YAML document serialization and parsing | https://github.com/nodeca/js-yaml |
| `smol-toml` | `^1.8.0` | MIT | TOML parsing and serialization | https://github.com/nicolo-ribaudo/smol-toml |
| `fast-xml-parser` | `^5.10.1` | MIT | Fast XML parser and validator | https://github.com/NaturalIntelligence/fast-xml-parser |
| `@toon-format/toon` | `^2.1.0` | MIT | TOON format serialization and conversion | https://github.com/nicfontaine/toon |
| `update-notifier` | `^7.3.1` | BSD-2-Clause | Non-intrusive interactive CLI update notification | https://github.com/yeoman/update-notifier |

*Note: Runtime dependencies are installed from npm registry; no binary or copyleft packages are vendored directly in the distribution repository.*

## Development & Testing Dependencies

| Package | Version Range | License | Primary Purpose |
|---------|---------------|---------|-----------------|
| `typescript` | `^5.3.3` | Apache-2.0 | TypeScript compiler (build-time only) |
| `vitest` | `^4.1.11` | MIT | Unit and contract test execution suite |
| `@types/node` | `^20.11.0` | MIT | Node.js standard library type definitions |
| `@types/adm-zip` | `^0.5.7` | MIT | Type definitions for adm-zip |
| `@types/js-yaml` | `^4.0.9` | MIT | Type definitions for js-yaml |
| `@emnapi/core` | `^1.10.0` | MIT | Native API helper runtime (transitive build support) |
| `@emnapi/runtime` | `^1.10.0` | MIT | Native API helper runtime (transitive build support) |

## Standard Library Modules

This project relies extensively on Node.js built-in core modules:
- `node:fs` / `node:fs/promises` — Local filesystem I/O operations
- `node:path` — Cross-platform path normalization and manipulation
- `node:child_process` — Process spawning, lifecycle management, and REPL control
- `node:crypto` — Streaming SHA-256, SHA-512, MD5 hash calculation
- `node:os` — Operating system platform detection and temp directory resolution
- `node:readline` — Interactive REPL stream processing

All Node.js built-in modules are part of the Node.js runtime and licensed under the MIT License.

## Level 1 SBOM Transparency & Invariant Cross-Reference Matrix

| Invariant ID | Rule & Principle | Architectural Implementation File | Verification & Enforcement Guarantee |
|---|---|---|---|
| `INV-LOCAL-01` | **Local Stdio & Explicit Egress** | `src/index.ts`, `src/tools/web_fetch.ts` | 100% offline by default; stdio JSON-RPC; outbound HTTP(S) only upon explicit client `fc_web_fetch` call |
| `INV-SAFE-02` | **Safe Deletion & Trash Protection** | `src/tools/safe_delete.ts`, `src/tools/delete.ts` | Routes removals to OS Recycle Bin / Trash via `fc_safe_delete` and global `fc_set_safe_mode` |
| `INV-LOCK-03` | **Cloud-Lock Resilient Move** | `src/tools/move.ts` | Automatic copy + SHA-256 verify + unlink fallback on EPERM/EBUSY in cloud-synced paths |
| `INV-DIAG-04` | **Cloud-Lock Diagnosis** | `src/tools/cloud_lock.ts` | Read-only static context inspection and reparse point evaluation without filesystem mutation |
| `INV-SRCH-05` | **Bounded Multi-File Content Search** | `src/tools/search_content.ts` | Strictly caps inputs (max 50 files, 10 MB, 200 matches, 200k chars) without glob explosions |
| `INV-MASK-06` | **Automated Secret & Token Redaction** | `src/tools/search_content.ts` | Automatic detection and masking of API keys, bearer tokens, AWS credentials in snippets |
| `INV-PREV-07` | **Bounded Inline Preview & Safe Open** | `src/tools/preview_file.ts`, `src/tools/open_path.ts` | Metadata-first inspection with 1 MiB inline ceiling; shell-safe native OS default launcher |
| `INV-REPL-08` | **Interactive REPL & Session Isolation** | `src/tools/session.ts` | Stateful interactive sessions with bounded circular ring buffers to prevent memory exhaustion |
| `INV-PROC-09` | **Unprivileged Non-Elevation Execution** | `package.json`, `dist/index.js` | Operates strictly in standard user mode (`RunAsInvoker`); zero administrative elevation |
| `INV-SLA-10` | **48h Security Response & 5-Day Triage SLA** | `SECURITY.md`, `README.md` | Binding 48h initial response, 5-day triage assessment, and 30-day remediation commitment |

## License Compatibility

All third-party libraries use permissive open-source licenses (MIT, BSD-2-Clause, Apache-2.0) fully compatible with this repository's root MIT License.

## Permissive License Compatibility & Invariants

All runtime and development dependencies are distributed under strictly permissive open-source licenses (MIT, BSD-2-Clause, Apache-2.0).

1. **Zero Copyleft**: Contains no GPL, AGPL, or restrictive copyleft components.
2. **Local-First & Zero-Egress**: Operates strictly offline over local stdio JSON-RPC with 0 network telemetry; explicit network access only via client-invoked `fc_web_fetch` (`INV-LOCAL-01`).
3. **Unprivileged Execution**: Operates strictly within user-space as `RunAsInvoker` with 0 administrative elevation requirements (`INV-PROC-09`).
4. **Governance & Security SLA**: Full compliance with the open-bricks / ellmos-ai 48h Security Response and 5-day Triage SLA (`INV-SLA-10`).

## Non-Elevation Certification (RunAsInvoker)

`ellmos-filecommander-mcp` is designed and certified to execute entirely in unprivileged user mode (`RunAsInvoker`). It never requests, requires, or inherits elevated UAC administrator tokens under Windows or `sudo`/root privileges on POSIX platforms.

## Zero-Copyleft Isolation Guarantee

No components under GPL, AGPL, LGPL, SSPL, or other reciprocal copyleft licenses are bundled, linked, or vendored. The product is 100% compliant with commercial and enterprise environments requiring clean MIT / BSD-2-Clause permissive licensing.
