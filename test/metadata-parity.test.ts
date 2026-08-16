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
  });

  it('maintains exact version parity across package.json, server.json, glama.json, and src/index.ts', () => {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const server = JSON.parse(readFileSync(serverPath, 'utf-8'));
    const glama = JSON.parse(readFileSync(glamaPath, 'utf-8'));
    const srcIndex = readFileSync(srcIndexPath, 'utf-8');

    expect(server.version).toBe(pkg.version);
    expect(glama.version).toBe(pkg.version);
    expect(server.packages[0].version).toBe(pkg.version);
    expect(srcIndex).toContain(`version: "${pkg.version}"`);
    expect(srcIndex).toContain(`* @version ${pkg.version}`);
  });

  it('manifests correctly reflect 47 tools and standard transport', () => {
    const glama = JSON.parse(readFileSync(glamaPath, 'utf-8'));
    const server = JSON.parse(readFileSync(serverPath, 'utf-8'));
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    expect(glama.tools.count).toBe(47);
    expect(server.packages[0].transport.type).toBe('stdio');
    expect(pkg.description).toContain('47 tools');
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
  });

  it('llms.txt is synchronized with 2026-08-16 and accurate ecosystem tools', () => {
    const llms = readFileSync(llmsPath, 'utf-8');
    expect(llms).toContain('## Last-checked: 2026-08-16');
    expect(llms).toContain('47 tools');
    expect(llms).toContain('fc_search_content');
    expect(llms).toContain('safe-delete');
    expect(llms).toContain('ellmos-controlcenter-mcp');
    expect(llms).toContain('31 tools');
    expect(llms).toContain('n8n-manager-mcp');
    expect(llms).toContain('19 tools');
  });

  it('README files contain valid badges, ecosystem links, and architecture diagrams', () => {
    const en = readFileSync(readmeEnPath, 'utf-8');
    const de = readFileSync(readmeDePath, 'utf-8');

    expect(en).toContain('ellmos-ai');
    expect(en).toContain('open-bricks');
    expect(en).toContain('mermaid');
    expect(en).toContain('47');
    expect(de).toContain('ellmos-ai');
    expect(de).toContain('open-bricks');
    expect(de).toContain('mermaid');
    expect(de).toContain('47');

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
});
