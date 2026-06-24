# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Replace the Spanish, Chinese, Japanese, and Russian i18n fallback stubs with full FileCommander runtime translations.
- Add an i18n regression test covering localized core messages, interpolation, and stub removal for all four language packs.

### Fixed
- Use `-EncodedCommand` (Base64/UTF-16LE) for PowerShell execution instead of string interpolation, preventing injection via metacharacters (`$`, backtick, `&`). Fixes CodeQL `js/incomplete-string-escaping` alert.

### Documentation
- Update README test counts to 154 after adding the i18n regression coverage.
- Refresh discoverability metadata for the current 44-tool FileCommander release, including jsDelivr and LobeHub visibility, cached third-party directory caveats, and additional Cloud-Lock/OCR/ZIP search phrases.

## [1.8.2] - 2026-06-17

### Fixed
- Correct version mismatch in banner/description display (1.7.10 → 1.8.0) and improve OCR `fc_ocr` error handling for edge cases.
- Align `package.json`, lockfile, MCP runtime version, source header, and `server.json` metadata after the update-notifier release.
- Refresh npm dependency locks so production audit findings for `hono` and `js-yaml` are resolved.

### Changed
- Bump `@modelcontextprotocol/sdk` from 1.27.1 to 1.29.0.
- Add a TTY-guarded `update-notifier` check for interactive CLI starts while keeping MCP stdio output unchanged.

### CI
- Add a dedicated GitHub Actions test workflow for Node.js 20, 22, and 24. The workflow runs `npm ci`, TypeScript build, Vitest, and an npm package dry-run on pushes and pull requests.
- Lock `@emnapi/core` and `@emnapi/runtime` as dev dependencies so Linux `npm ci` resolves Vitest/Rolldown optional WASM peer dependencies deterministically.

### Documentation
- Move the `llms.txt` last-checked marker to the top of the file and normalize search phrases into a crawler-friendly fenced code block.
- Ignore local automation protocol files via `*-protocoll.txt`.
- Normalize `package.json` repository metadata to npm's `git+https` form.

## [1.8.0] - 2026-05-31

### Added
- **Cloud-lock-safe file operations**: `fc_move`, `fc_batch_rename`, and `fc_safe_delete` now automatically fall back to copy+delete when the Windows Cloud Files filter (`cldflt.sys`) or other file locks block `rename()`. Triggered on EPERM, EACCES, EXDEV, and EBUSY errors.
- **`fc_check_cloud_lock`** — New read-only diagnostic tool that checks whether a path is at risk of cloud-sync lock conflicts. Reports driver status, sync folder detection, and risk level. Windows-only (graceful no-op on macOS/Linux).
- Empirical cloud-lock test (`test/empirical_cloud_lock.mjs`) using real Windows file locks to verify the fallback path.
- 7 new unit tests for `cloudSafeRename` helper (143 total tests).
- Full i18n (DE/EN) for all new features.
- Total tools: 44

### Changed
- Include `server.json` in the npm package so official MCP Registry metadata ships with the published artifact.
- Rename the official registry title from legacy "BACH FileCommander" to "ellmos FileCommander".
- Update community workflows to `actions/stale@v10` and `actions/first-interaction@v3` with current input names.
- Refresh README/README_de and `llms.txt` discovery notes for Glama, npm, and the ellmos MCP family.

## [1.7.10] - 2026-05-23

### Fixed
- Refresh npm lockfile and overrides to resolve Dependabot alerts for `fast-xml-builder`, `fast-uri`, `hono`, and `ip-address`.
- Update dev dependency lockfile path away from vulnerable Vite/esbuild ranges.

## [1.7.9] - 2026-05-17

### Added
- Comprehensive test suite with 136 tests covering all 43 tools (vitest)
- Cross-platform compatibility verified on Windows, macOS, and Linux
- Development/Testing section in README.md and README_de.md

## [1.7.2] - 2026-02-20

### Fixed
- Update CHANGELOG with 5 missing version entries (v1.5.0-v1.7.1)
- Fix server.json version mismatch
- Update SECURITY.md supported versions (1.3.x -> 1.7.x)
- Add missing runtime dependencies to THIRD_PARTY_NOTICES.md
- Remove stale "NEW in v1.4.0" label from README

## [1.7.1] - 2026-02-17

### Changed
- Replace custom TOON parser/serializer with official `@toon-format/toon` package
- Proper TOON format: `key: value` syntax instead of custom `key = value`

## [1.7.0] - 2026-02-17

### Added
- `fc_ocr` - Extract text from images via optional tesseract.js dependency
- `fc_archive` - Create, extract, and list ZIP archives (via adm-zip)
- `fc_checksum` - File hashing (MD5, SHA-1, SHA-256, SHA-512) with optional compare
- `fc_set_safe_mode` - Toggle safety mode: route all deletes through Recycle Bin / Trash
- Expand `fc_convert_format`: add YAML, TOML, XML, and TOON support (was JSON/CSV/INI only)
- Full i18n (DE/EN) for all new tools
- Total tools: 43

## [1.6.1] - 2026-02-17

### Added
- `mcpName` field in package.json for MCP Registry verification
- `server.json` for official MCP Registry publishing

## [1.6.0] - 2026-02-17

### Added
- `fc_md_to_pdf` - Real PDF generation via headless Edge/Chrome browser
- Cross-platform browser detection (Windows, macOS, Linux)
- Fallback to HTML output if no browser is available
- Total tools: 39

## [1.5.0] - 2026-02-15

### Added
- Complete internationalization (i18n) infrastructure with German (default) and English support
- New `fc_set_language` tool for runtime language switching
- `FC_LANGUAGE` environment variable for startup configuration
- ~270 translated strings (tool titles, descriptions, error messages, weekdays)
- i18n test suite (66 tests)
- Language priority: `fc_set_language` > `FC_LANGUAGE` env > `"de"` default

## [1.4.1] - 2026-02-14

### Fixed
- `fc_md_to_html` completely rewritten: line-by-line parser instead of regex chain
- Added: nested lists, ordered lists, blockquotes, checkboxes, badge images, standalone images
- Added: bold+italic combo (`***text***`), proper `<thead>/<tbody>` tables
- Professional CSS: dark code blocks, colored headers, print-ready layout

## [1.4.0] - 2026-02-14

### Added
- `fc_fix_json` - Repair common JSON errors (BOM, trailing commas, single quotes, comments, NUL bytes)
- `fc_validate_json` - Validate JSON with detailed error position and context
- `fc_cleanup_file` - Clean files: remove BOM, NUL bytes, trailing whitespace, normalize line endings
- `fc_fix_encoding` - Fix Mojibake and double-encoded UTF-8 (27+ patterns for German, French, Spanish)
- `fc_folder_diff` - Track directory changes (new/modified/deleted files) with snapshots
- `fc_batch_rename` - Pattern-based batch renaming (prefix/suffix removal, replace, auto-detect)
- `fc_convert_format` - Convert between JSON, CSV, and INI formats
- `fc_detect_duplicates` - Find duplicate files using SHA-256 hashing with size pre-filter
- `fc_md_to_html` - Convert Markdown to styled HTML (printable as PDF via browser)
- Total tools: 38

## [1.3.0] - 2026-02-14

### Changed
- Project prepared for public open-source release
- README rewritten in English for international audience
- Added LICENSE (MIT), SECURITY.md, CONTRIBUTING.md
- Package metadata updated for NPM publishing

## [1.2.1] - 2025-01-05

### Added
- `fc_str_replace` - String replacement tool with unique-match validation
- Total tools: 29

### Fixed
- `fc_safe_delete` PowerShell escaping for paths with special characters
- `&` character handling in Windows paths (PowerShell fallback)

## [1.2.0] - 2025-01-05

### Added
- Async Search system (5 tools): `fc_start_search`, `fc_get_search_results`, `fc_stop_search`, `fc_list_searches`, `fc_clear_search`
- `fc_safe_delete` - Moves files to Recycle Bin (Windows) or Trash (macOS/Linux) instead of permanent deletion

## [1.1.0] - 2025-01-05

### Added
- `fc_read_multiple_files` - Read multiple files in one call
- `fc_edit_file` - Line-based file editing (replace/insert/delete)
- `fc_list_processes` - List running system processes
- `fc_kill_process` - Terminate processes by PID or name
- Interactive Sessions (4 tools): `fc_start_session`, `fc_read_output`, `fc_send_input`, `fc_close_session`

## [1.0.0] - 2025-01-05

### Added
- Initial release with 13 filesystem tools
- File operations: read, write, list, create directory, delete, move, copy, file info, search
- Process execution: `fc_execute_command`, `fc_start_process`
- System: `fc_get_time`
