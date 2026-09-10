# Third-Party License Inventory

Stand: 2026-09-10.

This document inventories all direct third-party runtime and development dependencies used by `ellmos-filecommander-mcp`.

## Runtime Dependencies

| Package | Version Range | License | Primary Purpose | Repository / Source |
|---------|---------------|---------|-----------------|---------------------|
| `@modelcontextprotocol/sdk` | `^1.30.0` | MIT | Core Model Context Protocol stdio transport & schema binding | https://github.com/modelcontextprotocol/typescript-sdk |
| `zod` | `^3.23.8` | MIT | Tool argument schema validation & parsing | https://github.com/colinhacks/zod |
| `adm-zip` | `^0.6.0` | MIT | ZIP archive creation, extraction, and inspection | https://github.com/cthackers/adm-zip |
| `js-yaml` | `^4.3.1` | MIT | YAML document serialization and parsing | https://github.com/nodeca/js-yaml |
| `smol-toml` | `^1.6.0` | MIT | TOML parsing and serialization | https://github.com/nicolo-ribaudo/smol-toml |
| `fast-xml-parser` | `^5.10.1` | MIT | Fast XML parser and validator | https://github.com/NaturalIntelligence/fast-xml-parser |
| `@toon-format/toon` | `^2.1.0` | MIT | TOON format serialization and conversion | https://github.com/nicfontaine/toon |
| `update-notifier` | `^7.3.1` | BSD-2-Clause | Non-intrusive interactive CLI update notification | https://github.com/yeoman/update-notifier |

*Note: Runtime dependencies are installed from npm registry; no binary or copyleft packages are vendored directly in the distribution repository.*

## Development & Testing Dependencies

| Package | Version Range | License | Primary Purpose |
|---------|---------------|---------|-----------------|
| `typescript` | `^5.3.3` | Apache-2.0 | TypeScript compiler (build-time only) |
| `vitest` | `^4.1.9` | MIT | Unit and contract test execution suite |
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

## License Compatibility

All third-party libraries use permissive open-source licenses (MIT, BSD-2-Clause, Apache-2.0) fully compatible with this repository's root MIT License.
