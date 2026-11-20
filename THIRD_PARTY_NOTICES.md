# Third-Party Notices

This project uses the following third-party packages:

## Runtime Dependencies

### @modelcontextprotocol/sdk
- **License:** MIT
- **Copyright:** Copyright (c) Anthropic, PBC
- **Repository:** https://github.com/modelcontextprotocol/typescript-sdk

### zod
- **License:** MIT
- **Copyright:** Copyright (c) Colin McDonnell
- **Repository:** https://github.com/colinhacks/zod

### adm-zip
- **License:** MIT
- **Copyright:** Copyright (c) 2012 Another-D-Mention Software and other contributors
- **Repository:** https://github.com/cthackers/adm-zip

### js-yaml
- **License:** MIT
- **Copyright:** Copyright (c) 2011-2015 by Vitaly Puzrin
- **Repository:** https://github.com/nodeca/js-yaml

### smol-toml
- **License:** MIT
- **Repository:** https://github.com/nicolo-ribaudo/smol-toml

### fast-xml-parser
- **License:** MIT
- **Copyright:** Copyright (c) 2017 Amit Kumar Gupta
- **Repository:** https://github.com/NaturalIntelligence/fast-xml-parser

### @toon-format/toon
- **License:** MIT
- **Repository:** https://github.com/nicfontaine/toon

### update-notifier
- **License:** BSD-2-Clause
- **Repository:** https://github.com/yeoman/update-notifier

## Development Dependencies

### typescript
- **License:** Apache-2.0
- **Copyright:** Copyright (c) Microsoft Corporation
- **Repository:** https://github.com/microsoft/TypeScript
- **Note:** Used only for compilation. Not included in the distributed package.

### @types/node
- **License:** MIT
- **Copyright:** DefinitelyTyped contributors
- **Repository:** https://github.com/DefinitelyTyped/DefinitelyTyped

## Adapted Source Code

### Cowork Protocol MCP stdio client

- **File:** `src/bridge/mcp-client.mjs` (compiled into `dist/bridge/mcp-client.mjs`).
- **Source:** `mcp-stdio-client.js` from [ellmos-ai/cowork-protocol](https://github.com/ellmos-ai/cowork-protocol) at commit [`0e0b615f601b79648e0d47c15b8f6b6ce6fa612e`](https://github.com/ellmos-ai/cowork-protocol/tree/0e0b615f601b79648e0d47c15b8f6b6ce6fa612e).
- **License:** MIT.
- **Copyright:** Copyright (c) 2026 Lukas Geiger.
- **Modifications:** FileCommander-specific initialization, concurrent request handling, bounded protocol buffers, timeouts, and backend lifecycle handling. The complete upstream MIT permission and warranty notice is retained in the adapted source and distributed JavaScript.
- **Relationship:** Source reuse only. Cowork Protocol is not installed, contacted, or required at runtime by the FileCommander bridge.

## Node.js Built-in Modules

This project uses Node.js built-in modules (`fs`, `path`, `child_process`, `util`) which are part of the Node.js runtime and licensed under the MIT License.

---

All listed licenses are permissive and compatible with this project's MIT License.
