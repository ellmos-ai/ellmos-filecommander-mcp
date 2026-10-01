import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

describe('Metadata, Registry Manifest and Discoverability Parity', () => {
  const pkgPath = resolve(ROOT, 'package.json');
  const serverPath = resolve(ROOT, 'server.json');
  const glamaPath = resolve(ROOT, 'glama.json');
  const llmsPath = resolve(ROOT, 'llms.txt');
  const srcIndexPath = resolve(ROOT, 'src/index.ts');
  const readmeEnPath = resolve(ROOT, 'README.md');
  const readmeDePath = resolve(ROOT, 'README_de.md');
  const changelogPath = resolve(ROOT, 'CHANGELOG.md');
  const securityPath = resolve(ROOT, 'SECURITY.md');
  const marketingLogPath = resolve(ROOT, 'MARKETING-LOG.txt');
  const thirdPartyLicensesPath = resolve(ROOT, 'THIRD_PARTY_LICENSES.md');
  const thirdPartyLicensesTxtPath = resolve(ROOT, 'THIRD_PARTY_LICENSES.txt');
  const noticePath = resolve(ROOT, 'NOTICE');

  it('all required manifests and discoverability files exist', () => {
    expect(existsSync(pkgPath)).toBe(true);
    expect(existsSync(serverPath)).toBe(true);
    expect(existsSync(glamaPath)).toBe(true);
    expect(existsSync(llmsPath)).toBe(true);
    expect(existsSync(srcIndexPath)).toBe(true);
    expect(existsSync(readmeEnPath)).toBe(true);
    expect(existsSync(readmeDePath)).toBe(true);
    expect(existsSync(changelogPath)).toBe(true);
    expect(existsSync(securityPath)).toBe(true);
    expect(existsSync(marketingLogPath)).toBe(true);
    expect(existsSync(thirdPartyLicensesPath)).toBe(true);
    expect(existsSync(thirdPartyLicensesTxtPath)).toBe(true);
    expect(existsSync(noticePath)).toBe(true);
  });

  it('maintains exact version parity across package.json, server.json, glama.json, package-lock.json, and src/index.ts', () => {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const server = JSON.parse(readFileSync(serverPath, 'utf-8'));
    const glama = JSON.parse(readFileSync(glamaPath, 'utf-8'));
    const lock = JSON.parse(readFileSync(resolve(ROOT, 'package-lock.json'), 'utf-8'));
    const srcIndex = readFileSync(srcIndexPath, 'utf-8');

    expect(server.version).toBe(pkg.version);
    expect(glama.version).toBe(pkg.version);
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
    expect(server.packages[0].version).toBe(pkg.version);
    expect(srcIndex).toContain(`version: "${pkg.version}"`);
    expect(srcIndex).toContain(`* @version ${pkg.version}`);
  });

  it('manifests correctly reflect 50 tools and standard transport', () => {
    const glama = JSON.parse(readFileSync(glamaPath, 'utf-8'));
    const server = JSON.parse(readFileSync(serverPath, 'utf-8'));
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    expect(glama.tools.count).toBe(50);
    expect(server.packages[0].transport.type).toBe('stdio');
    expect(pkg.description).toContain('50 tools');
  });

  it('package.json files array includes all essential artifacts and manifests', () => {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const files = pkg.files || [];

    expect(files).toContain('dist/');
    expect(files).toContain('README.md');
    expect(files).toContain('README_de.md');
    expect(files).toContain('CHANGELOG.md');
    expect(files).toContain('SECURITY.md');
    expect(files).toContain('server.json');
    expect(files).toContain('glama.json');
    expect(files).toContain('llms.txt');
    expect(files).toContain('MARKETING-LOG.txt');
    expect(files).toContain('THIRD_PARTY_LICENSES.md');
    expect(files).toContain('THIRD_PARTY_LICENSES.txt');
    expect(files).toContain('NOTICE');
  });

  it('llms.txt is synchronized with 2026-10-01 and accurate ecosystem tools', () => {
    const llms = readFileSync(llmsPath, 'utf-8');
    expect(llms).toContain('## Last-checked: 2026-10-01');
    expect(llms).toContain('50 tools');
    expect(llms).toContain('fc_preview_file');
    expect(llms).toContain('fc_search_content');
    expect(llms).toContain('safe-delete');
    expect(llms).toContain('SECURITY.md');
    expect(llms).toContain('CHANGELOG.md');
    expect(llms).toContain('MARKETING-LOG.txt');
    expect(llms).toContain('THIRD_PARTY_LICENSES.md');
    expect(llms).toContain('THIRD_PARTY_LICENSES.txt');
    expect(llms).toContain('NOTICE');
    expect(llms).toContain('INV-LOCAL-01');
    expect(llms).toContain('INV-SLA-10');
    expect(llms).toContain('ellmos-controlcenter-mcp');
    expect(llms).toContain('31 tools');
    expect(llms).toContain('n8n-manager-mcp');
    expect(llms).toContain('19 tools');
    expect(llms).toContain('open-compute-mcp');
    expect(llms).toContain('16 tools');
  });

  it('SECURITY.md contains bilingual policy, umbrella contacts, and 48h / 5-day / 30-day SLAs', () => {
    const sec = readFileSync(securityPath, 'utf-8');
    expect(sec).toContain('Security Policy / Sicherheitsrichtlinie');
    expect(sec).toContain('English: Security Policy');
    expect(sec).toContain('Deutsch: Sicherheitsrichtlinie');
    expect(sec).toContain('Local-First');
    expect(sec).toContain('Explicit outbound access');
    expect(sec).toContain('Expliziter ausgehender Zugriff');
    expect(sec).toContain('fc_web_fetch');
    expect(sec).toContain('fc_start_session');
    expect(sec).toContain('fc_set_safe_mode');
    expect(sec).toContain('fc_check_cloud_lock');
    expect(sec).toContain('security@open-bricks.org');
    expect(sec).toContain('security@ellmos.ai');
    expect(sec).toContain('support@lukasgeiger.com');
    expect(sec).toContain('lukas@open-bricks.org');
    expect(sec).toContain('48 hours');
    expect(sec).toContain('48 Stunden');
    expect(sec).toContain('5 business days');
    expect(sec).toContain('5 Werktagen');
    expect(sec).toContain('30-calendar-day remediation window');
    expect(sec).toContain('30 Kalendertagen');
    expect(sec).toContain('30-Tage-Remediation-SLA');
    expect(sec).toContain('1.11.x');
  });

  it('verifies .gitignore hardening for conflict copies, multi-agent locks, credentials, and temporary files', () => {
    const gitignorePath = resolve(ROOT, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    const lines = gitignore.split(/\r?\n/).map(l => l.trim());

    // Credentials, certificates, tokens and packaging
    expect(gitignore).toContain('*.crt');
    expect(gitignore).toContain('*.cert');
    expect(gitignore).toContain('*.csr');
    expect(gitignore).toContain('*.token');
    expect(gitignore).toContain('*.secret');
    expect(gitignore).toContain('credentials.json');
    expect(gitignore).toContain('.pypirc');
    expect(gitignore).toContain('id_rsa*');
    expect(gitignore).toContain('id_ed25519*');
    expect(gitignore).toContain('id_ecdsa*');
    expect(gitignore).toContain('id_dsa*');

    // Multi-host and lock patterns
    expect(gitignore).toContain('*.sync-conflict-*');
    expect(gitignore).toContain('*.conflict');
    expect(gitignore).toContain('*-CONFLIT-*');
    expect(gitignore).toContain('*-conflict-*');
    expect(gitignore).toContain('*-ASUS-GEI*');
    expect(gitignore).toContain('*-WORKSTATION-LG*');
    expect(gitignore).toContain('*_WORKSTATION-LG*');
    expect(gitignore).toContain('*-WORKSTATION*');
    expect(gitignore).toContain('*_WORKSTATION*');
    expect(gitignore).toContain('*-WORKSTATION.*');
    expect(gitignore).toContain('*-WORKSTATION-LG.*');
    expect(gitignore).toContain('*-IDEAPAD*');
    expect(gitignore).toContain('ehthumbs.db');
    expect(gitignore).toContain('* (kopie)*');
    expect(gitignore).toContain('* (copy)*');
    expect(gitignore).toContain('LOCK.*');
    expect(gitignore).toContain('*.lock');
    expect(gitignore).toContain('!package-lock.json');
    expect(gitignore).toContain('uv.lock');
    expect(gitignore).toContain('*.tmp');
    expect(gitignore).toContain('*.bak');
    expect(gitignore).toContain('*.swp');
    expect(gitignore).toContain('*.swo');
    expect(gitignore).toContain('*.orig');
    expect(gitignore).toContain('*.rej');
    expect(gitignore).toContain('*~');
    expect(gitignore).toContain('.pytest_cache/');
    expect(gitignore).toContain('.pytest_temp/');
    expect(gitignore).toContain('.pytest_tmp*/');
    expect(gitignore).toContain('.ruff_cache/');
    expect(gitignore).toContain('.coverage.*');
    expect(gitignore).toContain('LOCK.user.*');
    expect(gitignore).toContain('LOCK.until.*');
    expect(gitignore).toContain('LOCK.condition.*');
    expect(gitignore).toContain('.automation-lock');
    expect(gitignore).toContain('*conflicted copy*');
    expect(gitignore).toContain('* (Kopie)*');
    expect(gitignore).toContain('* (Copy)*');
    expect(gitignore).toContain('*-LAPTOP*');
    expect(gitignore).toContain('*-ASUS*');
    expect(gitignore).toContain('*-Mac Studio*');
    expect(gitignore).toContain('*-MacBook*');
    expect(gitignore).toContain('.hypothesis/');
    expect(gitignore).toContain('.turbo/');
    expect(gitignore).toContain('.nyc_output/');

    // TODO.md must NOT be ignored
    expect(lines).not.toContain('TODO.md');
  });

  it('GitHub Actions CI workflow uses multi-OS matrix, v4 actions, concurrency control, and packaging validation', () => {
    const ciPath = resolve(ROOT, '.github/workflows/tests.yml');
    expect(existsSync(ciPath)).toBe(true);
    const ci = readFileSync(ciPath, 'utf-8');
    expect(ci).toContain('ubuntu-latest');
    expect(ci).toContain('windows-latest');
    expect(ci).toContain('macos-latest');
    expect(ci).toContain('actions/checkout@v4');
    expect(ci).toContain('actions/setup-node@v4');
    expect(ci).toContain('cache: npm');
    expect(ci).toContain('concurrency:');
    expect(ci).toContain('cancel-in-progress: true');
    expect(ci).toContain('timeout-minutes: 15');
    expect(ci).toContain('npm test');
    expect(ci).toContain('npm run build');
    expect(ci).toContain('npm pack --dry-run');
  });

  it('README files contain valid badges, quick navigation, and architecture diagrams', () => {
    const en = readFileSync(readmeEnPath, 'utf-8');
    const de = readFileSync(readmeDePath, 'utf-8');

    expect(en).toContain('ellmos-ai');
    expect(en).toContain('open-bricks');
    expect(en).toContain('mermaid');
    expect(en).toContain('50');
    expect(en).toContain('tests-304%20passed');
    expect(en).toContain('security-48h%20SLA');
    expect(en).toContain('Quick Navigation:');
    expect(en).toContain('[NOTICE](NOTICE)');
    expect(en).toContain('#sec-04');
    expect(en).toContain('id="core-capabilities--safety-invariants"');
    expect(en).toContain('## Core Capabilities & Safety Invariants');
    expect(en).toContain('#sec-05');
    expect(en).toContain('id="target-personas--discoverability"');
    expect(en).toContain('## Target Personas & Discoverability');
    expect(en).toContain('#sec-09');
    expect(en).toContain('id="comparative-matrix--alternatives"');
    expect(en).toContain('## Comparative Matrix & Alternatives');

    expect(de).toContain('ellmos-ai');
    expect(de).toContain('open-bricks');
    expect(de).toContain('mermaid');
    expect(de).toContain('50');
    expect(de).toContain('tests-304%20passed');
    expect(de).toContain('security-48h%20SLA');
    expect(de).toContain('Schnellnavigation:');
    expect(de).toContain('[NOTICE](NOTICE)');
    expect(de).toContain('#sec-04');
    expect(de).toContain('id="kernfähigkeiten--sicherheitsinvarianten"');
    expect(de).toContain('## Kernfähigkeiten & Sicherheitsinvarianten');
    expect(de).toContain('#sec-05');
    expect(de).toContain('id="zielgruppen--auffindbarkeit"');
    expect(de).toContain('## Zielgruppen & Auffindbarkeit');
    expect(de).toContain('#sec-09');
    expect(de).toContain('id="vergleichsmatrix--alternativen"');
    expect(de).toContain('## Vergleichsmatrix & Alternativen');

    // Sibling server tools counts
    expect(en).toContain('ControlCenter');
    expect(en).toContain('31');
    expect(en).toContain('n8n Manager');
    expect(en).toContain('19');

    expect(de).toContain('ControlCenter');
    expect(de).toContain('31');
    expect(de).toContain('n8n Manager');
    expect(de).toContain('19');
  });

  it('verifies bilingual target personas section parity for 4 core profiles', () => {
    const en = readFileSync(readmeEnPath, 'utf-8');
    const de = readFileSync(readmeDePath, 'utf-8');

    // 4 personas in EN
    expect(en).toContain('Autonomous AI Coding Agents & LLM Swarms');
    expect(en).toContain('DevOps, Toolchain & Multi-Host Automation Engineers');
    expect(en).toContain('SecOps, Governance & Compliance Officers');
    expect(en).toContain('Enterprise Platform Architects & Data Pipeline Developers');

    // 4 personas in DE
    expect(de).toContain('Autonome KI-Coding-Agenten & LLM-Schwärme');
    expect(de).toContain('DevOps-, Toolchain- & Multi-Host-Automatisierungs-Ingenieure');
    expect(de).toContain('SecOps-, Governance- & Compliance-Verantwortliche');
    expect(de).toContain('Enterprise-Plattform-Architekten & Daten-Pipeline-Entwickler');
  });

  it('verifies 5-way comparative matrix parity across 10 operational dimensions', () => {
    const en = readFileSync(readmeEnPath, 'utf-8');
    const de = readFileSync(readmeDePath, 'utf-8');

    // 5 Columns
    expect(en).toContain('ellmos FileCommander MCP (50 Tools)');
    expect(en).toContain('Official Filesystem MCP');
    expect(en).toContain('Desktop Commander MCP');
    expect(en).toContain('Direct Host Shell');
    expect(en).toContain('Ad-Hoc Scripts & Cloud APIs');

    expect(de).toContain('ellmos FileCommander MCP (50 Tools)');
    expect(de).toContain('Offizielles Filesystem MCP');
    expect(de).toContain('Desktop Commander MCP');
    expect(de).toContain('Direkte Host-Shell');
    expect(de).toContain('Ad-Hoc-Skripte & Cloud-APIs');

    // 10 Dimensions in EN
    expect(en).toContain('Tool Breadth & Scope');
    expect(en).toContain('Safe Deletion & Recovery');
    expect(en).toContain('Cloud-Lock & Sync Resilience');
    expect(en).toContain('Bounded Search & Secret Redaction');
    expect(en).toContain('Async Long-Running Search');
    expect(en).toContain('Interactive REPL & Session Control');
    expect(en).toContain('Self-Healing & Data Repair');
    expect(en).toContain('Multi-Format Transformation');
    expect(en).toContain('Document & Archive Utilities');
    expect(en).toContain('Governance & Security SLAs');

    // 10 Dimensions in DE
    expect(de).toContain('Werkzeug-Breite & Umfang');
    expect(de).toContain('Sicheres Löschen & Recovery');
    expect(de).toContain('Cloud-Lock- & Sync-Resilienz');
    expect(de).toContain('Begrenzte Suche & Token-Schwärzung');
    expect(de).toContain('Asynchrone Hintergrundsuche');
    expect(de).toContain('Interaktive REPL & Sitzungssteuerung');
    expect(de).toContain('Selbstheilung & Datenreparatur');
    expect(de).toContain('Multi-Format-Transformation');
    expect(de).toContain('Dokument- & Archiv-Werkzeuge');
    expect(de).toContain('Governance & Sicherheits-SLAs');
  });

  it('verifies bilingual core capabilities and safety invariants matrix parity', () => {
    const en = readFileSync(readmeEnPath, 'utf-8');
    const de = readFileSync(readmeDePath, 'utf-8');

    expect(en).toContain('Local stdio & explicit egress');
    expect(en).toContain('Safe Deletion & Trash Protection');
    expect(en).toContain('Cloud-Lock Resilient Move');
    expect(en).toContain('Bounded Multi-File Content Search');
    expect(en).toContain('Automated Secret & Token Redaction');
    expect(en).toContain('Lossless Multi-Format Engine');
    expect(en).toContain('Mojibake & File Repair Engine');
    expect(en).toContain('Unprivileged Non-Elevation Execution');
    expect(en).toContain('INV-LOCAL-01');
    expect(en).toContain('INV-SAFE-02');
    expect(en).toContain('INV-LOCK-03');
    expect(en).toContain('INV-DIAG-04');
    expect(en).toContain('INV-SRCH-05');
    expect(en).toContain('INV-MASK-06');
    expect(en).toContain('INV-PREV-07');
    expect(en).toContain('INV-REPL-08');
    expect(en).toContain('INV-PROC-09');
    expect(en).toContain('INV-SLA-10');
    expect(en).toContain('MARKETING-LOG.txt');
    expect(en).toContain('THIRD_PARTY_LICENSES.md');

    expect(de).toContain('Lokales stdio & expliziter Egress');
    expect(de).toContain('Sicheres Löschen & Papierkorb-Schutz');
    expect(de).toContain('Cloud-Lock-robuste Verschiebung');
    expect(de).toContain('Begrenzte Mehrdatei-Inhaltssuche');
    expect(de).toContain('Automatische Geheimnis- & Token-Schwärzung');
    expect(de).toContain('Verlustfreie Multi-Format-Engine');
    expect(de).toContain('Mojibake- & Dateireparatur-Engine');
    expect(de).toContain('Unprivilegierter Non-Elevation-Betrieb');
    expect(de).toContain('INV-LOCAL-01');
    expect(de).toContain('INV-SAFE-02');
    expect(de).toContain('INV-LOCK-03');
    expect(de).toContain('INV-DIAG-04');
    expect(de).toContain('INV-SRCH-05');
    expect(de).toContain('INV-MASK-06');
    expect(de).toContain('INV-PREV-07');
    expect(de).toContain('INV-REPL-08');
    expect(de).toContain('INV-PROC-09');
    expect(de).toContain('INV-SLA-10');
    expect(de).toContain('MARKETING-LOG.txt');
    expect(de).toContain('THIRD_PARTY_LICENSES.md');
  });

  it('verifies changelog records recent release history and version consistency', () => {
    const cl = readFileSync(changelogPath, 'utf-8');
    expect(cl).toContain('## [1.11.5] - 2026-09-20');
    expect(cl).toContain('Repository Hygiene, CI Timeout Hardening & Multi-Host Defense (Pfad A)');
    expect(cl).toContain('## [1.11.4] - 2026-09-19');
    expect(cl).toContain('Bugfix: fc_str_replace Literal String Replacement');
    expect(cl).toContain('## [1.11.3] - 2026-09-19');
    expect(cl).toContain('AI Security & Dependency Audit, Supply-Chain Hardening & 30-Day SLA');
    expect(cl).toContain('## [1.11.2] - 2026-09-13');
    expect(cl).toContain('Discoverability, Target Personas & 5-Way Comparative Matrix (Pfad B)');
    expect(cl).toContain('Repository Hygiene & Multi-Host Sync Hardening (Pfad A)');
    expect(cl).toContain('.gitignore Hardening');
  });

  it('enforces zero-vulnerability dependency versions and license inventory alignment', () => {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const lic = readFileSync(thirdPartyLicensesPath, 'utf-8');

    // Dependencies patched against high/moderate advisories
    expect(pkg.dependencies['adm-zip']).toBe('^0.6.1');
    expect(pkg.dependencies['js-yaml']).toBe('^4.3.2');
    expect(pkg.dependencies['smol-toml']).toBe('^1.8.0');
    expect(pkg.overrides['hono']).toBe('^4.13.8');
    expect(pkg.devDependencies['vitest']).toBe('^4.1.11');

    // Third-party licenses inventory synced
    expect(lic).toContain('Stand: 2026-10-01');
    expect(lic).toContain('adm-zip');
    expect(lic).toContain('^0.6.1');
    expect(lic).toContain('js-yaml');
    expect(lic).toContain('^4.3.2');
    expect(lic).toContain('smol-toml');
    expect(lic).toContain('^1.8.0');
    expect(lic).toContain('vitest');
    expect(lic).toContain('^4.1.11');
  });

  it('verifies marketing log records active hygiene, discoverability and security audit status', () => {
    const mkt = readFileSync(marketingLogPath, 'utf-8');
    expect(mkt).toContain('Audit Date: 2026-09-13');
    expect(mkt).toContain('Audit Date: 2026-09-19');
    expect(mkt).toContain('Audit Date: 2026-09-20');
    expect(mkt).toContain('Audit Date: 2026-09-23');
    expect(mkt).toContain('Audit Date: 2026-09-28');
    expect(mkt).toContain('Audit Date: 2026-10-01');
    expect(mkt).toContain('ACTIVE / PFAD B DISCOVERABILITY & ARCHITECTURE PARITY VERIFIED');
    expect(mkt).toContain('ACTIVE / 0 VULNERABILITIES VERIFIED & 30-DAY SLA CODIFIED');
    expect(mkt).toContain('ACTIVE / PFAD A REPOSITORY HYGIENE & CI HARDENING VERIFIED (v1.11.5)');
    expect(mkt).toContain('ACTIVE / PFAD A REPOSITORY HYGIENE & SBOM TEXT COMPANION VERIFIED (v1.11.5 frozen)');
    expect(mkt).toContain('ACTIVE / PFAD B DISCOVERABILITY & ASCII 4-VIEW TOPOLOGY VERIFIED (v1.11.5 frozen)');
    expect(mkt).toContain('HIGH-INTENT KEYWORD MATRIX & DISCOVERABILITY TARGETS');
    expect(mkt).toContain('5-WAY COMPARATIVE ARCHITECTURE MATRIX (10 OPERATIONAL DIMENSIONS)');
    expect(mkt).toContain('291 automated tests');
    expect(mkt).toContain('292 passed tests');
    expect(mkt).toContain('299 passed tests');
    expect(mkt).toContain('303 passed tests');
    expect(mkt).toContain('304 passed tests');
  });

  it('verifies mermaid diagrams in documentation follow parse-safe syntax without bare special characters', () => {
    const en = readFileSync(readmeEnPath, 'utf-8');
    const de = readFileSync(readmeDePath, 'utf-8');
    expect(en).toContain('```mermaid');
    expect(de).toContain('```mermaid');
    // Ensure diagrams have balanced code blocks
    expect((en.match(/```mermaid/g) || []).length).toBeGreaterThan(0);
    expect((de.match(/```mermaid/g) || []).length).toBeGreaterThan(0);
  });

  it('verifies all 5 GitHub Actions workflows enforce timeout-minutes and concurrency boundaries', () => {
    const workflowsDir = resolve(ROOT, '.github/workflows');
    const testsWf = readFileSync(resolve(workflowsDir, 'tests.yml'), 'utf-8');
    const staleWf = readFileSync(resolve(workflowsDir, 'stale.yml'), 'utf-8');
    const welcomeWf = readFileSync(resolve(workflowsDir, 'welcome.yml'), 'utf-8');
    const autoAssignWf = readFileSync(resolve(workflowsDir, 'auto-assign.yml'), 'utf-8');
    const labelSyncWf = readFileSync(resolve(workflowsDir, 'label-sync.yml'), 'utf-8');

    expect(testsWf).toContain('timeout-minutes: 15');
    expect(staleWf).toContain('timeout-minutes: 10');
    expect(welcomeWf).toContain('timeout-minutes: 5');
    expect(autoAssignWf).toContain('timeout-minutes: 5');
    expect(labelSyncWf).toContain('timeout-minutes: 5');

    expect(welcomeWf).toContain('concurrency:');
    expect(welcomeWf).toContain('cancel-in-progress: true');
    expect(autoAssignWf).toContain('concurrency:');
    expect(autoAssignWf).toContain('cancel-in-progress: true');
    expect(labelSyncWf).toContain('concurrency:');
    expect(labelSyncWf).toContain('cancel-in-progress: true');
  });

  it('verifies NOTICE file contains legal attribution, umbrella governance, and SBOM reference', () => {
    expect(existsSync(noticePath)).toBe(true);
    const notice = readFileSync(noticePath, 'utf-8');
    expect(notice).toContain('ellmos-filecommander-mcp');
    expect(notice).toContain('Copyright (c) 2026 Lukas Geiger');
    expect(notice).toContain('open-bricks open-source umbrella');
    expect(notice).toContain('THIRD_PARTY_LICENSES.md');
    expect(notice).toContain('THIRD_PARTY_LICENSES.txt');
  });

  it('verifies canonical lock system and multi-host conflict defense patterns in .gitignore', () => {
    const gitignore = readFileSync(resolve(ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('LOCK.user.*');
    expect(gitignore).toContain('LOCK.until.*');
    expect(gitignore).toContain('LOCK.condition.*');
    expect(gitignore).toContain('.automation-lock');
    expect(gitignore).toContain('*conflicted copy*');
    expect(gitignore).toContain('*-WORKSTATION-LG*');
    expect(gitignore).toContain('*-LAPTOP*');
    expect(gitignore).toContain('*-ASUS*');
    expect(gitignore).toContain('*-Mac Studio*');
    expect(gitignore).toContain('*-MacBook*');
  });

  it('verifies Level 1 SBOM and unprivileged RunAsInvoker governance integrity in THIRD_PARTY_LICENSES.md', () => {
    const lic = readFileSync(thirdPartyLicensesPath, 'utf-8');
    expect(lic).toContain('Stand: 2026-10-01');
    expect(lic).toContain('Level 1 SBOM Transparency');
    expect(lic).toContain('Unprivileged User-Mode (`RunAsInvoker`)');
    expect(lic).toContain('License Compatibility');
    expect(lic).toContain('INV-LOCAL-01');
    expect(lic).toContain('INV-SAFE-02');
    expect(lic).toContain('INV-SLA-10');
    expect(lic).toContain('THIRD_PARTY_LICENSES.txt');
  });

  it('verifies 18-point reciprocal navigation parity, persona definitions and statutory notice', () => {
    const en = readFileSync(readmeEnPath, 'utf-8');
    const de = readFileSync(readmeDePath, 'utf-8');
    const llms = readFileSync(resolve(ROOT, 'llms.txt'), 'utf-8');

    // 18-point anchors in both languages
    for (let i = 1; i <= 18; i++) {
      const pad = String(i).padStart(2, '0');
      expect(en).toContain(`id="sec-${pad}"`);
      expect(de).toContain(`id="sec-${pad}"`);
      expect(en).toContain(`#sec-${pad}`);
      expect(de).toContain(`#sec-${pad}`);
    }

    // Persona identifiers
    const personas = ['[PERSONA-01]', '[PERSONA-02]', '[PERSONA-03]', '[PERSONA-04]'];
    for (const p of personas) {
      expect(en).toContain(p);
      expect(de).toContain(p);
    }

    // llms.txt audit timestamp
    expect(llms).toContain('Last-checked: 2026-10-01');

    // § 521 BGB statutory notice and 48h SLA in both languages
    expect(en).toContain('§ 521 German Civil Code');
    expect(en).toContain('security@open-bricks.org');
    expect(de).toContain('§ 521 BGB');
    expect(de).toContain('security@open-bricks.org');
  });

  it('verifies plain-text Level 1 SBOM companion (THIRD_PARTY_LICENSES.txt) completeness, invariant matrix, and permissive licensing', () => {
    expect(existsSync(thirdPartyLicensesTxtPath)).toBe(true);
    const txt = readFileSync(thirdPartyLicensesTxtPath, 'utf-8');

    expect(txt).toContain('THIRD-PARTY LICENSES & LEVEL 1 SBOM NOTICE');
    expect(txt).toContain('Project: ellmos-ai/ellmos-filecommander-mcp (FileCommander)');
    expect(txt).toContain('Audited: 2026-10-01');
    expect(txt).toContain('Repository Version: 1.11.5');
    expect(txt).toContain('Repository License: MIT License');
    expect(txt).toContain('RunAsInvoker');
    expect(txt).toContain('Zero-Copyleft Isolation Guarantee');

    // Invariants present in plain text matrix
    expect(txt).toContain('INV-LOCAL-01');
    expect(txt).toContain('INV-SAFE-02');
    expect(txt).toContain('INV-LOCK-03');
    expect(txt).toContain('INV-DIAG-04');
    expect(txt).toContain('INV-SRCH-05');
    expect(txt).toContain('INV-MASK-06');
    expect(txt).toContain('INV-PREV-07');
    expect(txt).toContain('INV-REPL-08');
    expect(txt).toContain('INV-PROC-09');
    expect(txt).toContain('INV-SLA-10');

    // License texts included
    expect(txt).toContain('--- MIT License (MIT) ---');
    expect(txt).toContain('--- BSD 2-Clause License ---');
    expect(txt).toContain('--- Apache License, Version 2.0 ---');
  });

  it('verifies Level 1 SBOM text companion badges and documentation sync across README.md and README_de.md', () => {
    const en = readFileSync(readmeEnPath, 'utf-8');
    const de = readFileSync(readmeDePath, 'utf-8');

    expect(en).toContain('Level%201%20SBOM-Plain%20Text');
    expect(de).toContain('Level%201%20SBOM-Plain%20Text');
    expect(en).toContain('last--checked-2026--10--01');
    expect(de).toContain('last--checked-2026--10--01');
    expect(en).toContain('verified-2026--10--01');
    expect(de).toContain('verified-2026--10--01');
    expect(en).toContain('[THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt)');
    expect(de).toContain('[THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt)');
  });

  it('verifies CI workflow lifecycle hardening for concurrency, timeouts, and multi-OS matrix', () => {
    const workflowsDir = resolve(ROOT, '.github/workflows');
    const testsWf = readFileSync(resolve(workflowsDir, 'tests.yml'), 'utf-8');
    const autoAssignWf = readFileSync(resolve(workflowsDir, 'auto-assign.yml'), 'utf-8');
    const labelSyncWf = readFileSync(resolve(workflowsDir, 'label-sync.yml'), 'utf-8');

    expect(testsWf).toContain('timeout-minutes: 15');
    expect(testsWf).toContain('ubuntu-latest');
    expect(testsWf).toContain('windows-latest');
    expect(testsWf).toContain('macos-latest');
    expect(autoAssignWf).toContain('actions/github-script@v7');
    expect(labelSyncWf).toContain('EndBug/label-sync@v2');
    expect(existsSync(resolve(ROOT, '.github/labels.yml'))).toBe(true);
  });

  it('verifies ASCII Four-View Architectural Topology presence in README.md and README_de.md', () => {
    const en = readFileSync(readmeEnPath, 'utf-8');
    const de = readFileSync(readmeDePath, 'utf-8');

    // English 4-view topology
    expect(en).toContain('ASCII Four-View Architectural Topology');
    expect(en).toContain('[VIEW 1: CALLER RUNTIMES & AGENT CLIENTS]');
    expect(en).toContain('[VIEW 2: FILECOMMANDER MCP CORE ENGINE & DISPATCH ORCHESTRATOR]');
    expect(en).toContain('[VIEW 3: FILESYSTEM RUNTIME, FORMAT REPAIR & PROCESS ISOLATION]');
    expect(en).toContain('[VIEW 4: AIR-GAP DEFENSE PERIMETER, RUNASINVOKER & CONTROLLED EGRESS]');

    // German 4-view topology
    expect(de).toContain('ASCII Vier-Sichten-Architekturtopologie');
    expect(de).toContain('[SICHT 1: AUFRUFER-LAUFZEITEN & AGENTEN-CLIENTS]');
    expect(de).toContain('[SICHT 2: FILECOMMANDER MCP KERN-ENGINE & DISPATCH-ORCHESTRATOR]');
    expect(de).toContain('[SICHT 3: DATEISYSTEM-LAUFZEIT, FORMAT-REPARATUR & PROZESS-ISOLATION]');
    expect(de).toContain('[SICHT 4: AIR-GAP SCHUTZPERIMETER, RUNASINVOKER & KONTROLLIERTER NETZWERKAUSSTRITT]');
  });
});
