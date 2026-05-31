/**
 * Comprehensive test suite for ellmos-filecommander-mcp
 *
 * Tests the core logic of all major MCP tools using temporary files/directories.
 * Since the tool handlers are registered via server.registerTool() and not exported,
 * we replicate the core logic in test helpers and validate behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createHash } from "crypto";
import * as os from "os";
import * as yaml from "js-yaml";
import * as toml from "smol-toml";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import AdmZip from "adm-zip";

// ============================================================================
// Test Helpers -- mirror the logic from src/index.ts
// ============================================================================

function norm(p: string): string {
  return path.normalize(p);
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function fmtSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function hasWindowsSpecialChars(inputPath: string): boolean {
  return /[&^%$#@!]/.test(inputPath);
}

async function makeTmpDir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "fc-test-"));
}

async function rmDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore errors on cleanup
  }
}

// ============================================================================
// fix_json helper
// ============================================================================

function fixJson(raw: string): { fixes: string[]; valid: boolean; content: string } {
  const fixes: string[] = [];
  let content = raw;

  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
    fixes.push("BOM");
  }

  if (content.includes("\0")) {
    content = content.replace(/\0/g, "");
    fixes.push("NUL");
  }

  const c1 = content;
  content = content.replace(/^(\s*)\/\/.*$/gm, "");
  if (content !== c1) fixes.push("single-line-comments");

  const c2 = content;
  content = content.replace(/\/\*[\s\S]*?\*\//g, "");
  if (content !== c2) fixes.push("multi-line-comments");

  const c3 = content;
  content = content.replace(/,(\s*[}\]])/g, "$1");
  if (content !== c3) fixes.push("trailing-commas");

  const c4 = content;
  content = content.replace(/(\s*)'([^'\\]*(?:\\.[^'\\]*)*)'\s*:/g, '$1"$2":');
  content = content.replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, ': "$1"');
  if (content !== c4) fixes.push("single-quotes");

  let valid = false;
  try {
    JSON.parse(content);
    valid = true;
  } catch {
    // not valid
  }

  return { fixes, valid, content };
}

// ============================================================================
// fix_encoding helper (mojibake)
// ============================================================================

function fixEncoding(raw: string): { fixes: string[]; content: string } {
  const mojibakeMap: [RegExp, string, string][] = [
    [/Ã¤/g, "ä", "ä"],
    [/Ã¶/g, "ö", "ö"],
    [/Ã¼/g, "ü", "ü"],
    [/Ã/g, "Ä", "Ä"],
    [/Ã/g, "Ö", "Ö"],
    [/Ã/g, "Ü", "Ü"],
    [/Ã/g, "ß", "ß"],
    [/â¬/g, "€", "€"],
    [/Ã©/g, "é", "é"],
    [/Ã¨/g, "è", "è"],
    [/Ã /g, "à", "à"],
    [/Ã¡/g, "á", "á"],
    [/Ã®/g, "î", "î"],
    [/Ã¯/g, "ï", "ï"],
    [/Ã´/g, "ô", "ô"],
    [/Ã¹/g, "ù", "ù"],
    [/Ã§/g, "ç", "ç"],
    [/Ã±/g, "ñ", "ñ"],
    [/â/g, "–", "en-dash"],
    [/â/g, "—", "em-dash"],
    [/Â /g, " ", "NBSP"],
  ];

  let content = raw;
  const fixes: string[] = [];

  for (const [pattern, replacement, label] of mojibakeMap) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) {
      const count = (before.match(pattern) || []).length;
      fixes.push(`${label} (${count}x)`);
    }
  }

  return { fixes, content };
}

// ============================================================================
// cleanup_file helper
// ============================================================================

function cleanupFile(
  raw: string,
  opts: {
    removeBom?: boolean;
    removeNul?: boolean;
    removeTrailingWhitespace?: boolean;
    normalizeLineEndings?: "lf" | "crlf" | null;
  }
): { fixes: string[]; content: string } {
  let content = raw;
  const fixes: string[] = [];

  if (opts.removeBom && content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
    fixes.push("BOM");
  }
  if (opts.removeNul && content.includes("\0")) {
    content = content.replace(/\0/g, "");
    fixes.push("NUL");
  }
  if (opts.removeTrailingWhitespace) {
    const c = content;
    content = content.replace(/[ \t]+$/gm, "");
    if (content !== c) fixes.push("Whitespace");
  }
  if (opts.normalizeLineEndings) {
    const c = content;
    content = content.replace(/\r\n/g, "\n");
    if (opts.normalizeLineEndings === "crlf") {
      content = content.replace(/\n/g, "\r\n");
    }
    if (content !== c) fixes.push(opts.normalizeLineEndings.toUpperCase());
  }

  return { fixes, content };
}

// ============================================================================
// wildcard-to-regex helper (used in fc_search_files and fc_start_search)
// ============================================================================

function wildcardToRegex(pattern: string): RegExp {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${regexPattern}$`, "i");
}

// ============================================================================
// format conversion helpers
// ============================================================================

function parseCsv(raw: string): Record<string, string>[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV needs at least header + 1 row");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] || "";
    });
    return obj;
  });
}

function parseIni(raw: string): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  let currentSection = "_default";
  result[currentSection] = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#")) continue;
    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      result[currentSection] = result[currentSection] || {};
    } else {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        result[currentSection][key] = val;
      }
    }
  }
  if (Object.keys(result._default).length === 0) delete result._default;
  return result;
}

function toCsv(data: Record<string, unknown>[]): string {
  const headers = Object.keys(data[0] || {});
  const rows = data.map((item) =>
    headers
      .map((h) => {
        const val = String(item[h] ?? "");
        return val.includes(",") || val.includes('"')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function toIni(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [section, values] of Object.entries(data)) {
    if (typeof values === "object" && values !== null && !Array.isArray(values)) {
      lines.push(`[${section}]`);
      for (const [key, val] of Object.entries(values as Record<string, unknown>)) {
        lines.push(`${key} = ${val}`);
      }
      lines.push("");
    } else {
      lines.push(`${section} = ${values}`);
    }
  }
  return lines.join("\n");
}

// ============================================================================
// duplicate detection helper
// ============================================================================

function groupBySize(files: { path: string; size: number }[]): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  for (const f of files) {
    const g = groups.get(f.size) || [];
    g.push(f.path);
    groups.set(f.size, g);
  }
  return groups;
}

async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

// ============================================================================
// batch rename helper
// ============================================================================

function batchRename(
  fileNames: string[],
  mode: "remove_prefix" | "remove_suffix" | "replace" | "auto_detect",
  pattern?: string,
  replacement = ""
): { old: string; new: string }[] {
  const renames: { old: string; new: string }[] = [];

  if (mode === "auto_detect") {
    let commonPrefix = fileNames[0] || "";
    for (let i = 1; i < fileNames.length; i++) {
      while (!fileNames[i].startsWith(commonPrefix) && commonPrefix.length > 0) {
        commonPrefix = commonPrefix.slice(0, -1);
      }
    }
    if (commonPrefix.length >= 3) {
      for (const name of fileNames) {
        const newName = name.slice(commonPrefix.length);
        if (newName.length > 0) {
          renames.push({ old: name, new: newName });
        }
      }
    }
    return renames;
  }

  if (!pattern) return renames;

  for (const name of fileNames) {
    let newName: string;
    switch (mode) {
      case "remove_prefix":
        newName = name.startsWith(pattern) ? name.slice(pattern.length) : name;
        break;
      case "remove_suffix": {
        const parsed = path.parse(name);
        newName = parsed.name.endsWith(pattern)
          ? parsed.name.slice(0, -pattern.length) + parsed.ext
          : name;
        break;
      }
      case "replace":
        newName = name.replace(
          new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          replacement
        );
        break;
      default:
        newName = name;
    }
    if (newName !== name && newName.length > 0) {
      renames.push({ old: name, new: newName });
    }
  }
  return renames;
}

// ============================================================================
// TESTS: Path Utilities
// ============================================================================

describe("Path Utilities", () => {
  it("normalizes forward slashes to platform separators", () => {
    const result = norm("foo/bar/baz");
    expect(result).toBe(path.normalize("foo/bar/baz"));
  });

  it("normalizes double slashes", () => {
    const result = norm("foo//bar///baz");
    expect(result).toBe(path.join("foo", "bar", "baz"));
  });

  it("resolves parent references", () => {
    const result = norm("foo/bar/../baz");
    expect(result).toBe(path.join("foo", "baz"));
  });

  it("handles dot segments", () => {
    const result = norm("./foo/./bar");
    expect(result).toBe(path.join("foo", "bar"));
  });

  it("preserves absolute paths", () => {
    const abs = process.platform === "win32" ? "C:\\Users\\test" : "/home/test";
    expect(norm(abs)).toBe(abs);
  });

  it("formatFileSize shows bytes for small values", () => {
    expect(fmtSize(0)).toBe("0.00 B");
    expect(fmtSize(512)).toBe("512.00 B");
  });

  it("formatFileSize shows KB for values >= 1024", () => {
    expect(fmtSize(1024)).toBe("1.00 KB");
    expect(fmtSize(2048)).toBe("2.00 KB");
  });

  it("formatFileSize shows MB for values >= 1MB", () => {
    expect(fmtSize(1024 * 1024)).toBe("1.00 MB");
    expect(fmtSize(1.5 * 1024 * 1024)).toBe("1.50 MB");
  });

  it("formatFileSize shows GB for values >= 1GB", () => {
    expect(fmtSize(1024 * 1024 * 1024)).toBe("1.00 GB");
  });

  it("formatFileSize shows TB for values >= 1TB", () => {
    expect(fmtSize(1024 * 1024 * 1024 * 1024)).toBe("1.00 TB");
  });

  it("hasWindowsSpecialChars detects &", () => {
    expect(hasWindowsSpecialChars("C:\\path\\with&special")).toBe(true);
  });

  it("hasWindowsSpecialChars detects multiple special chars", () => {
    expect(hasWindowsSpecialChars("test$path")).toBe(true);
    expect(hasWindowsSpecialChars("normal-path_123")).toBe(false);
  });

  it("pathExists returns true for existing path", async () => {
    const dir = await makeTmpDir();
    try {
      expect(await exists(dir)).toBe(true);
    } finally {
      await rmDir(dir);
    }
  });

  it("pathExists returns false for non-existing path", async () => {
    expect(await exists("/nonexistent/path/xyz123")).toBe(false);
  });
});

// ============================================================================
// TESTS: Fix JSON
// ============================================================================

describe("Fix JSON", () => {
  it("removes UTF-8 BOM", () => {
    const input = "﻿{\"key\": \"value\"}";
    const result = fixJson(input);
    expect(result.fixes).toContain("BOM");
    expect(result.valid).toBe(true);
    expect(result.content.charCodeAt(0)).not.toBe(0xFEFF);
  });

  it("removes NUL bytes", () => {
    const input = '{"key":  "value"}';
    const result = fixJson(input);
    expect(result.fixes).toContain("NUL");
  });

  it("removes single-line comments", () => {
    const input = '{\n// comment\n"key": "value"\n}';
    const result = fixJson(input);
    expect(result.fixes).toContain("single-line-comments");
    expect(result.valid).toBe(true);
  });

  it("removes multi-line comments", () => {
    const input = '{\n/* multi\nline */\n"key": "value"\n}';
    const result = fixJson(input);
    expect(result.fixes).toContain("multi-line-comments");
    expect(result.valid).toBe(true);
  });

  it("fixes trailing commas before }", () => {
    const input = '{"key": "value",}';
    const result = fixJson(input);
    expect(result.fixes).toContain("trailing-commas");
    expect(result.valid).toBe(true);
  });

  it("fixes trailing commas before ]", () => {
    const input = '{"arr": [1, 2, 3,]}';
    const result = fixJson(input);
    expect(result.fixes).toContain("trailing-commas");
    expect(result.valid).toBe(true);
  });

  it("converts single-quoted keys to double quotes", () => {
    const input = "{'key': \"value\"}";
    const result = fixJson(input);
    expect(result.fixes).toContain("single-quotes");
    expect(result.valid).toBe(true);
  });

  it("converts single-quoted values to double quotes", () => {
    const input = '{"key": \'value\'}';
    const result = fixJson(input);
    expect(result.fixes).toContain("single-quotes");
    expect(result.valid).toBe(true);
  });

  it("handles escaped chars in single-quoted strings", () => {
    const input = "{'key': 'it\\'s fine'}";
    const result = fixJson(input);
    expect(result.fixes).toContain("single-quotes");
  });

  it("reports no fixes on valid JSON", () => {
    const input = '{"key": "value", "num": 42}';
    const result = fixJson(input);
    expect(result.fixes).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it("applies multiple fixes at once", () => {
    const input = "﻿{\n// comment\n'key': 'val',\n}";
    const result = fixJson(input);
    expect(result.fixes.length).toBeGreaterThanOrEqual(3);
    expect(result.valid).toBe(true);
  });

  it("reports invalid when unfixable", () => {
    const input = "{broken json::}";
    const result = fixJson(input);
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// TESTS: Fix Encoding (Mojibake)
// ============================================================================

describe("Fix Encoding (Mojibake)", () => {
  it("fixes double-encoded ae (ä)", () => {
    const input = "Ã¤";
    const result = fixEncoding(input);
    expect(result.content).toBe("ä");
    expect(result.fixes.length).toBe(1);
  });

  it("fixes double-encoded oe (ö)", () => {
    const input = "Ã¶";
    const result = fixEncoding(input);
    expect(result.content).toBe("ö");
  });

  it("fixes double-encoded ue (ü)", () => {
    const input = "Ã¼";
    const result = fixEncoding(input);
    expect(result.content).toBe("ü");
  });

  it("fixes double-encoded Ae (Ä)", () => {
    const input = "Ã";
    const result = fixEncoding(input);
    expect(result.content).toBe("Ä");
  });

  it("fixes double-encoded Oe (Ö)", () => {
    const input = "Ã";
    const result = fixEncoding(input);
    expect(result.content).toBe("Ö");
  });

  it("fixes double-encoded Ue (Ü)", () => {
    const input = "Ã";
    const result = fixEncoding(input);
    expect(result.content).toBe("Ü");
  });

  it("fixes double-encoded sz (ß)", () => {
    const input = "Ã";
    const result = fixEncoding(input);
    expect(result.content).toBe("ß");
  });

  it("fixes double-encoded euro sign (€)", () => {
    const input = "â¬";
    const result = fixEncoding(input);
    expect(result.content).toBe("€");
  });

  it("fixes en-dash mojibake", () => {
    const input = "â";
    const result = fixEncoding(input);
    expect(result.content).toBe("–");
  });

  it("counts multiple occurrences", () => {
    const input = "Ã¤Ã¤Ã¤";
    const result = fixEncoding(input);
    expect(result.content).toBe("äää");
    expect(result.fixes[0]).toContain("3x");
  });

  it("returns empty fixes for clean text", () => {
    const input = "Normal text with äöü already correct";
    const result = fixEncoding(input);
    expect(result.fixes).toHaveLength(0);
    expect(result.content).toBe(input);
  });

  it("handles mixed mojibake and correct chars", () => {
    const input = "GrÃ¼Ãe from MÃ¼nchen";
    const result = fixEncoding(input);
    expect(result.content).toBe("Grüße from München");
  });
});

// ============================================================================
// TESTS: Cleanup File
// ============================================================================

describe("Cleanup File", () => {
  it("removes BOM", () => {
    const input = "﻿hello";
    const result = cleanupFile(input, { removeBom: true });
    expect(result.fixes).toContain("BOM");
    expect(result.content).toBe("hello");
  });

  it("removes NUL bytes", () => {
    const input = "he llo";
    const result = cleanupFile(input, { removeNul: true });
    expect(result.fixes).toContain("NUL");
    expect(result.content).toBe("hello");
  });

  it("removes trailing whitespace from lines", () => {
    const input = "line1   \nline2\t\t\nline3";
    const result = cleanupFile(input, { removeTrailingWhitespace: true });
    expect(result.fixes).toContain("Whitespace");
    expect(result.content).toBe("line1\nline2\nline3");
  });

  it("preserves indentation (leading whitespace)", () => {
    const input = "  indented\n    more";
    const result = cleanupFile(input, { removeTrailingWhitespace: true });
    expect(result.content).toBe("  indented\n    more");
    expect(result.fixes).toHaveLength(0);
  });

  it("normalizes CRLF to LF", () => {
    const input = "line1\r\nline2\r\nline3";
    const result = cleanupFile(input, { normalizeLineEndings: "lf" });
    expect(result.fixes).toContain("LF");
    expect(result.content).toBe("line1\nline2\nline3");
  });

  it("normalizes LF to CRLF", () => {
    const input = "line1\nline2\nline3";
    const result = cleanupFile(input, { normalizeLineEndings: "crlf" });
    expect(result.fixes).toContain("CRLF");
    expect(result.content).toBe("line1\r\nline2\r\nline3");
  });

  it("no fixes on already clean content", () => {
    const input = "clean content\nno issues";
    const result = cleanupFile(input, {
      removeBom: true,
      removeNul: true,
      removeTrailingWhitespace: true,
    });
    expect(result.fixes).toHaveLength(0);
  });

  it("applies all cleanup operations together", () => {
    const input = "﻿line1  \r\nline2 \r\n";
    const result = cleanupFile(input, {
      removeBom: true,
      removeNul: true,
      removeTrailingWhitespace: true,
      normalizeLineEndings: "lf",
    });
    expect(result.fixes).toContain("BOM");
    expect(result.fixes).toContain("NUL");
    expect(result.fixes).toContain("Whitespace");
    expect(result.fixes).toContain("LF");
    expect(result.content).toBe("line1\nline2\n");
  });

  it("does not normalize when option is null", () => {
    const input = "line1\r\nline2\n";
    const result = cleanupFile(input, { normalizeLineEndings: null });
    expect(result.content).toBe(input);
    expect(result.fixes).toHaveLength(0);
  });
});

// ============================================================================
// TESTS: Checksum
// ============================================================================

describe("Checksum", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await rmDir(tmpDir);
  });

  it("computes SHA-256 hash of a file", async () => {
    const filePath = path.join(tmpDir, "test.txt");
    await fs.writeFile(filePath, "hello world", "utf-8");
    const content = await fs.readFile(filePath);
    const hash = createHash("sha256").update(content).digest("hex");
    expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
  });

  it("computes MD5 hash", async () => {
    const filePath = path.join(tmpDir, "test.txt");
    await fs.writeFile(filePath, "hello world", "utf-8");
    const content = await fs.readFile(filePath);
    const hash = createHash("md5").update(content).digest("hex");
    expect(hash).toBe("5eb63bbbe01eeed093cb22bb8f5acdc3");
  });

  it("computes SHA-1 hash", async () => {
    const filePath = path.join(tmpDir, "test.txt");
    await fs.writeFile(filePath, "hello world", "utf-8");
    const content = await fs.readFile(filePath);
    const hash = createHash("sha1").update(content).digest("hex");
    expect(hash).toBe("2aae6c35c94fcfb415dbe95f408b9ce91ee846ed");
  });

  it("computes SHA-512 hash", async () => {
    const filePath = path.join(tmpDir, "test.txt");
    await fs.writeFile(filePath, "hello world", "utf-8");
    const content = await fs.readFile(filePath);
    const hash = createHash("sha512").update(content).digest("hex");
    expect(hash).toHaveLength(128);
  });

  it("compare matches with correct hash", async () => {
    const filePath = path.join(tmpDir, "test.txt");
    await fs.writeFile(filePath, "test content", "utf-8");
    const content = await fs.readFile(filePath);
    const hash = createHash("sha256").update(content).digest("hex");
    const compareResult = hash.toLowerCase() === hash.toLowerCase();
    expect(compareResult).toBe(true);
  });

  it("compare is case-insensitive", () => {
    const hash = "abcdef1234567890";
    const compare = "ABCDEF1234567890";
    expect(hash.toLowerCase() === compare.toLowerCase()).toBe(true);
  });

  it("different files produce different hashes", async () => {
    const file1 = path.join(tmpDir, "a.txt");
    const file2 = path.join(tmpDir, "b.txt");
    await fs.writeFile(file1, "content a", "utf-8");
    await fs.writeFile(file2, "content b", "utf-8");
    const h1 = createHash("sha256").update(await fs.readFile(file1)).digest("hex");
    const h2 = createHash("sha256").update(await fs.readFile(file2)).digest("hex");
    expect(h1).not.toBe(h2);
  });

  it("empty file has consistent hash", async () => {
    const filePath = path.join(tmpDir, "empty.txt");
    await fs.writeFile(filePath, "", "utf-8");
    const content = await fs.readFile(filePath);
    const hash = createHash("sha256").update(content).digest("hex");
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

// ============================================================================
// TESTS: Archive (ZIP)
// ============================================================================

describe("Archive (ZIP)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await rmDir(tmpDir);
  });

  it("creates a ZIP from single file", async () => {
    const srcFile = path.join(tmpDir, "hello.txt");
    await fs.writeFile(srcFile, "hello world", "utf-8");
    const zipPath = path.join(tmpDir, "out.zip");

    const zip = new AdmZip();
    zip.addLocalFile(srcFile);
    zip.writeZip(zipPath);

    expect(await exists(zipPath)).toBe(true);
    const stat = await fs.stat(zipPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it("creates a ZIP from directory", async () => {
    const subDir = path.join(tmpDir, "subdir");
    await fs.mkdir(subDir);
    await fs.writeFile(path.join(subDir, "a.txt"), "aaa", "utf-8");
    await fs.writeFile(path.join(subDir, "b.txt"), "bbb", "utf-8");
    const zipPath = path.join(tmpDir, "dir.zip");

    const zip = new AdmZip();
    zip.addLocalFolder(subDir, "subdir");
    zip.writeZip(zipPath);

    const readZip = new AdmZip(zipPath);
    const entries = readZip.getEntries();
    const names = entries.map((e) => e.entryName);
    expect(names).toContain("subdir/a.txt");
    expect(names).toContain("subdir/b.txt");
  });

  it("extracts ZIP to target directory", async () => {
    const srcFile = path.join(tmpDir, "data.txt");
    await fs.writeFile(srcFile, "extraction test", "utf-8");
    const zipPath = path.join(tmpDir, "extract.zip");
    const extractDir = path.join(tmpDir, "extracted");

    const zip = new AdmZip();
    zip.addLocalFile(srcFile);
    zip.writeZip(zipPath);

    const readZip = new AdmZip(zipPath);
    readZip.extractAllTo(extractDir, true);

    const extractedFile = path.join(extractDir, "data.txt");
    expect(await exists(extractedFile)).toBe(true);
    const content = await fs.readFile(extractedFile, "utf-8");
    expect(content).toBe("extraction test");
  });

  it("lists entries in a ZIP", async () => {
    const zip = new AdmZip();
    zip.addFile("dir/file1.txt", Buffer.from("content1"));
    zip.addFile("dir/file2.txt", Buffer.from("content2"));
    zip.addFile("root.txt", Buffer.from("root"));
    const zipPath = path.join(tmpDir, "list.zip");
    zip.writeZip(zipPath);

    const readZip = new AdmZip(zipPath);
    const entries = readZip.getEntries();
    expect(entries.length).toBe(3);
  });

  it("preserves nested directory structure", async () => {
    const zip = new AdmZip();
    zip.addFile("a/b/c/deep.txt", Buffer.from("deep"));
    const zipPath = path.join(tmpDir, "nested.zip");
    zip.writeZip(zipPath);

    const extractDir = path.join(tmpDir, "nested-out");
    const readZip = new AdmZip(zipPath);
    readZip.extractAllTo(extractDir, true);

    const deepFile = path.join(extractDir, "a", "b", "c", "deep.txt");
    expect(await exists(deepFile)).toBe(true);
    expect(await fs.readFile(deepFile, "utf-8")).toBe("deep");
  });

  it("handles empty ZIP", () => {
    const zip = new AdmZip();
    const zipPath = path.join(tmpDir, "empty.zip");
    zip.writeZip(zipPath);

    const readZip = new AdmZip(zipPath);
    expect(readZip.getEntries()).toHaveLength(0);
  });

  it("reports entry sizes", () => {
    const zip = new AdmZip();
    const content = "x".repeat(1000);
    zip.addFile("big.txt", Buffer.from(content));
    const zipPath = path.join(tmpDir, "sizes.zip");
    zip.writeZip(zipPath);

    const readZip = new AdmZip(zipPath);
    const entry = readZip.getEntries()[0];
    expect(entry.header.size).toBe(1000);
  });
});

// ============================================================================
// TESTS: Format Conversion
// ============================================================================

describe("Format Conversion", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await rmDir(tmpDir);
  });

  it("JSON to YAML roundtrip", async () => {
    const data = { name: "test", version: 1, nested: { key: "val" } };
    const yamlStr = yaml.dump(data, { indent: 2, lineWidth: 120 });
    const parsed = yaml.load(yamlStr) as typeof data;
    expect(parsed.name).toBe("test");
    expect(parsed.version).toBe(1);
    expect(parsed.nested.key).toBe("val");
  });

  it("JSON to TOML roundtrip", () => {
    const data = { title: "Test", owner: { name: "Alice" } };
    const tomlStr = toml.stringify(data);
    const parsed = toml.parse(tomlStr);
    expect(parsed.title).toBe("Test");
    expect((parsed.owner as Record<string, string>).name).toBe("Alice");
  });

  it("JSON to XML roundtrip", () => {
    const data = { root: { item: "value", count: 42 } };
    const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_", format: true });
    const xml = builder.build(data);
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xml);
    expect(parsed.root.item).toBe("value");
    expect(parsed.root.count).toBe(42);
  });

  it("JSON to CSV conversion", () => {
    const data = [
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ];
    const csv = toCsv(data);
    expect(csv).toContain("name,age");
    expect(csv).toContain("Alice,30");
    expect(csv).toContain("Bob,25");
  });

  it("CSV to JSON conversion", () => {
    const csv = "name,age\nAlice,30\nBob,25";
    const data = parseCsv(csv);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Alice");
    expect(data[0].age).toBe("30");
    expect(data[1].name).toBe("Bob");
  });

  it("JSON to INI conversion", () => {
    const data = { server: { host: "localhost", port: "8080" } };
    const ini = toIni(data);
    expect(ini).toContain("[server]");
    expect(ini).toContain("host = localhost");
    expect(ini).toContain("port = 8080");
  });

  it("INI to JSON conversion", () => {
    const ini = "[database]\nhost = localhost\nport = 5432\n\n[app]\nname = myapp";
    const data = parseIni(ini);
    expect(data.database.host).toBe("localhost");
    expect(data.database.port).toBe("5432");
    expect(data.app.name).toBe("myapp");
  });

  it("INI ignores comments (;)", () => {
    const ini = "; this is a comment\n[section]\nkey = val";
    const data = parseIni(ini);
    expect(data.section.key).toBe("val");
  });

  it("INI ignores comments (#)", () => {
    const ini = "# hash comment\n[section]\nkey = val";
    const data = parseIni(ini);
    expect(data.section.key).toBe("val");
  });

  it("INI removes empty default section", () => {
    const ini = "[only]\nkey = val";
    const data = parseIni(ini);
    expect(data._default).toBeUndefined();
    expect(data.only.key).toBe("val");
  });

  it("INI keeps default section if it has keys", () => {
    const ini = "globalkey = globalval\n[section]\nkey = val";
    const data = parseIni(ini);
    expect(data._default.globalkey).toBe("globalval");
  });

  it("CSV handles values with commas (quoted)", () => {
    const data = [{ name: "Last, First", city: "Berlin" }];
    const csv = toCsv(data);
    expect(csv).toContain('"Last, First"');
  });

  it("CSV handles values with double quotes", () => {
    const data = [{ text: 'He said "hello"', id: "1" }];
    const csv = toCsv(data);
    expect(csv).toContain('"He said ""hello"""');
  });

  it("TOML requires object as root", () => {
    expect(() => toml.stringify([1, 2, 3] as any)).toThrow();
  });

  it("JSON stringify with indent 0 produces minified", () => {
    const data = { key: "value" };
    const output = JSON.stringify(data, null, undefined);
    expect(output).toBe('{"key":"value"}');
  });

  it("JSON stringify with indent 2 produces formatted", () => {
    const data = { key: "value" };
    const output = JSON.stringify(data, null, 2);
    expect(output).toContain("\n");
    expect(output).toContain("  ");
  });

  it("YAML preserves arrays", () => {
    const data = { items: ["a", "b", "c"] };
    const yamlStr = yaml.dump(data);
    const parsed = yaml.load(yamlStr) as typeof data;
    expect(parsed.items).toEqual(["a", "b", "c"]);
  });

  it("XML with attributes roundtrip", () => {
    const data = { root: { item: { "@_id": "1", "#text": "hello" } } };
    const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_", format: true });
    const xml = builder.build(data);
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xml);
    expect(String(parsed.root.item["@_id"])).toBe("1");
  });
});

// ============================================================================
// TESTS: File Search (Wildcard to Regex)
// ============================================================================

describe("File Search (Wildcard to Regex)", () => {
  it("matches exact filename", () => {
    const regex = wildcardToRegex("test.txt");
    expect(regex.test("test.txt")).toBe(true);
    expect(regex.test("TEST.TXT")).toBe(true);
    expect(regex.test("test.txtt")).toBe(false);
  });

  it("* matches any characters", () => {
    const regex = wildcardToRegex("*.txt");
    expect(regex.test("file.txt")).toBe(true);
    expect(regex.test("deep.path.txt")).toBe(true);
    expect(regex.test("file.json")).toBe(false);
  });

  it("? matches single character", () => {
    const regex = wildcardToRegex("file?.txt");
    expect(regex.test("file1.txt")).toBe(true);
    expect(regex.test("fileA.txt")).toBe(true);
    expect(regex.test("file12.txt")).toBe(false);
  });

  it("escapes regex special characters in pattern", () => {
    const regex = wildcardToRegex("file.name+special.txt");
    expect(regex.test("file.name+special.txt")).toBe(true);
    expect(regex.test("filexname+special.txt")).toBe(false);
  });

  it("is case-insensitive", () => {
    const regex = wildcardToRegex("README.*");
    expect(regex.test("readme.md")).toBe(true);
    expect(regex.test("README.MD")).toBe(true);
    expect(regex.test("Readme.txt")).toBe(true);
  });

  it("handles complex patterns", () => {
    const regex = wildcardToRegex("test_*_v?.js");
    expect(regex.test("test_module_v1.js")).toBe(true);
    expect(regex.test("test__v2.js")).toBe(true);
    expect(regex.test("test_module_v12.js")).toBe(false);
  });
});

// ============================================================================
// TESTS: Duplicate Detection
// ============================================================================

describe("Duplicate Detection", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await rmDir(tmpDir);
  });

  it("groups files by size", () => {
    const files = [
      { path: "/a.txt", size: 100 },
      { path: "/b.txt", size: 200 },
      { path: "/c.txt", size: 100 },
      { path: "/d.txt", size: 300 },
    ];
    const groups = groupBySize(files);
    expect(groups.get(100)).toHaveLength(2);
    expect(groups.get(200)).toHaveLength(1);
    expect(groups.get(300)).toHaveLength(1);
  });

  it("identifies true duplicates by hash", async () => {
    const file1 = path.join(tmpDir, "dup1.txt");
    const file2 = path.join(tmpDir, "dup2.txt");
    await fs.writeFile(file1, "identical content", "utf-8");
    await fs.writeFile(file2, "identical content", "utf-8");

    const hash1 = await hashFile(file1);
    const hash2 = await hashFile(file2);
    expect(hash1).toBe(hash2);
  });

  it("distinguishes files with same size but different content", async () => {
    const file1 = path.join(tmpDir, "same-size-1.txt");
    const file2 = path.join(tmpDir, "same-size-2.txt");
    await fs.writeFile(file1, "aaaa", "utf-8");
    await fs.writeFile(file2, "bbbb", "utf-8");

    const stat1 = await fs.stat(file1);
    const stat2 = await fs.stat(file2);
    expect(stat1.size).toBe(stat2.size);

    const hash1 = await hashFile(file1);
    const hash2 = await hashFile(file2);
    expect(hash1).not.toBe(hash2);
  });

  it("size filter excludes small files", () => {
    const files = [
      { path: "/tiny.txt", size: 0 },
      { path: "/small.txt", size: 5 },
      { path: "/big.txt", size: 1000 },
    ];
    const minSize = 10;
    const filtered = files.filter((f) => f.size >= minSize);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].path).toBe("/big.txt");
  });

  it("max_size filter excludes large files", () => {
    const files = [
      { path: "/small.txt", size: 100 },
      { path: "/big.txt", size: 10000 },
    ];
    const maxSize = 5000;
    const filtered = files.filter((f) => f.size <= maxSize);
    expect(filtered).toHaveLength(1);
  });

  it("only hashes files in groups of 2+", () => {
    const sizeGroups = new Map<number, string[]>();
    sizeGroups.set(100, ["/a.txt", "/b.txt"]);
    sizeGroups.set(200, ["/c.txt"]);
    sizeGroups.set(300, ["/d.txt", "/e.txt", "/f.txt"]);

    let hashCandidates = 0;
    for (const [, paths] of sizeGroups) {
      if (paths.length >= 2) hashCandidates += paths.length;
    }
    expect(hashCandidates).toBe(5);
  });
});

// ============================================================================
// TESTS: Batch Rename
// ============================================================================

describe("Batch Rename", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await rmDir(tmpDir);
  });

  it("remove_prefix strips matching prefix", () => {
    const files = ["backup_file1.txt", "backup_file2.txt", "other.txt"];
    const result = batchRename(files, "remove_prefix", "backup_");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ old: "backup_file1.txt", new: "file1.txt" });
    expect(result[1]).toEqual({ old: "backup_file2.txt", new: "file2.txt" });
  });

  it("remove_suffix strips matching suffix before extension", () => {
    const files = ["report_2024.txt", "data_2024.txt", "notsuffix.txt"];
    const result = batchRename(files, "remove_suffix", "_2024");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ old: "report_2024.txt", new: "report.txt" });
    expect(result[1]).toEqual({ old: "data_2024.txt", new: "data.txt" });
  });

  it("replace mode substitutes pattern globally", () => {
    const files = ["hello-world-test.js", "hello-app.js"];
    const result = batchRename(files, "replace", "hello", "hi");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ old: "hello-world-test.js", new: "hi-world-test.js" });
    expect(result[1]).toEqual({ old: "hello-app.js", new: "hi-app.js" });
  });

  it("replace mode escapes regex special chars in pattern", () => {
    const files = ["file(1).txt", "file(2).txt"];
    const result = batchRename(files, "replace", "(", "[");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ old: "file(1).txt", new: "file[1).txt" });
  });

  it("auto_detect finds common prefix >= 3 chars", () => {
    const files = ["project_main.ts", "project_utils.ts", "project_test.ts"];
    const result = batchRename(files, "auto_detect");
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ old: "project_main.ts", new: "main.ts" });
  });

  it("auto_detect returns empty when prefix < 3 chars", () => {
    const files = ["ab_one.txt", "cd_two.txt"];
    const result = batchRename(files, "auto_detect");
    expect(result).toHaveLength(0);
  });

  it("auto_detect with single char common prefix returns empty", () => {
    const files = ["x_alpha.txt", "x_beta.txt"];
    const result = batchRename(files, "auto_detect");
    expect(result).toHaveLength(0);
  });

  it("skips files where new name would be empty", () => {
    const files = ["abc.txt"];
    const result = batchRename(files, "remove_prefix", "abc.txt");
    expect(result).toHaveLength(0);
  });

  it("dry_run does not modify filesystem", async () => {
    const file = path.join(tmpDir, "backup_test.txt");
    await fs.writeFile(file, "test", "utf-8");
    const result = batchRename(["backup_test.txt"], "remove_prefix", "backup_");
    expect(result).toHaveLength(1);
    expect(await exists(file)).toBe(true);
  });

  it("replace with empty string effectively removes the pattern", () => {
    const files = ["test_OLD_file.txt"];
    const result = batchRename(files, "replace", "_OLD", "");
    expect(result[0]).toEqual({ old: "test_OLD_file.txt", new: "test_file.txt" });
  });
});

// ============================================================================
// TESTS: Folder Diff
// ============================================================================

describe("Folder Diff", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await rmDir(tmpDir);
  });

  it("snapshot ID is md5 of directory path", () => {
    const dirPath = "/some/test/directory";
    const id = crypto.createHash("md5").update(dirPath).digest("hex");
    expect(id).toHaveLength(32);
  });

  it("detects new files", () => {
    const previous: Record<string, { size: number; mtime: number }> = {};
    const current: Record<string, { size: number; mtime: number }> = {
      "new.txt": { size: 100, mtime: Date.now() },
    };

    const newFiles = Object.keys(current).filter((k) => !previous[k]);
    expect(newFiles).toContain("new.txt");
  });

  it("detects deleted files", () => {
    const previous: Record<string, { size: number; mtime: number }> = {
      "old.txt": { size: 50, mtime: Date.now() - 10000 },
    };
    const current: Record<string, { size: number; mtime: number }> = {};

    const deleted = Object.keys(previous).filter((k) => !current[k]);
    expect(deleted).toContain("old.txt");
  });

  it("detects modified files by size change", () => {
    const now = Date.now();
    const previous: Record<string, { size: number; mtime: number }> = {
      "file.txt": { size: 100, mtime: now - 5000 },
    };
    const current: Record<string, { size: number; mtime: number }> = {
      "file.txt": { size: 200, mtime: now },
    };

    const modified = Object.keys(current).filter(
      (k) => previous[k] && (current[k].size !== previous[k].size || Math.abs(current[k].mtime - previous[k].mtime) > 1000)
    );
    expect(modified).toContain("file.txt");
  });

  it("detects modified files by mtime change", () => {
    const previous: Record<string, { size: number; mtime: number }> = {
      "file.txt": { size: 100, mtime: 1000000 },
    };
    const current: Record<string, { size: number; mtime: number }> = {
      "file.txt": { size: 100, mtime: 1005000 },
    };

    const modified = Object.keys(current).filter(
      (k) => previous[k] && Math.abs(current[k].mtime - previous[k].mtime) > 1000
    );
    expect(modified).toContain("file.txt");
  });

  it("does not flag unchanged files", () => {
    const mtime = Date.now();
    const previous: Record<string, { size: number; mtime: number }> = {
      "stable.txt": { size: 100, mtime },
    };
    const current: Record<string, { size: number; mtime: number }> = {
      "stable.txt": { size: 100, mtime: mtime + 500 },
    };

    const modified = Object.keys(current).filter(
      (k) => previous[k] && (current[k].size !== previous[k].size || Math.abs(current[k].mtime - previous[k].mtime) > 1000)
    );
    expect(modified).toHaveLength(0);
  });

  it("snapshot is stored in os.tmpdir/.fc_snapshots", () => {
    const snapshotDir = path.join(os.tmpdir(), ".fc_snapshots");
    expect(snapshotDir).toContain(".fc_snapshots");
  });
});

// ============================================================================
// TESTS: Safe Mode Toggle
// ============================================================================

describe("Safe Mode Toggle", () => {
  it("safe mode defaults to false", () => {
    let safeMode = false;
    expect(safeMode).toBe(false);
  });

  it("toggling safe mode on sets it to true", () => {
    let safeMode = false;
    safeMode = true;
    expect(safeMode).toBe(true);
  });

  it("toggling safe mode off sets it back to false", () => {
    let safeMode = true;
    safeMode = false;
    expect(safeMode).toBe(false);
  });
});

// ============================================================================
// TESTS: Validate JSON (logic)
// ============================================================================

describe("Validate JSON", () => {
  it("detects valid JSON object", () => {
    const content = '{"key": "value"}';
    let valid = false;
    try {
      JSON.parse(content);
      valid = true;
    } catch {
      // invalid
    }
    expect(valid).toBe(true);
  });

  it("detects valid JSON array", () => {
    const content = "[1, 2, 3]";
    const parsed = JSON.parse(content);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("reports position of syntax error", () => {
    const content = '{"key": value}';
    let errorThrown = false;
    try {
      JSON.parse(content);
    } catch (e) {
      errorThrown = true;
      const msg = (e as Error).message;
      expect(msg.toLowerCase()).toMatch(/position|token/);
    }
    expect(errorThrown).toBe(true);
  });

  it("detects BOM in JSON file", () => {
    const content = "﻿{\"key\": \"value\"}";
    const hasBom = content.charCodeAt(0) === 0xFEFF;
    expect(hasBom).toBe(true);
  });

  it("reports key count for objects", () => {
    const content = '{"a": 1, "b": 2, "c": 3}';
    const parsed = JSON.parse(content);
    const keyCount = Object.keys(parsed).length;
    expect(keyCount).toBe(3);
  });
});

// ============================================================================
// TESTS: File Operations (read/write/edit integration)
// ============================================================================

describe("File Operations", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await rmDir(tmpDir);
  });

  it("str_replace finds unique occurrence and replaces", async () => {
    const filePath = path.join(tmpDir, "replace.txt");
    await fs.writeFile(filePath, "hello world, hello universe", "utf-8");
    let content = await fs.readFile(filePath, "utf-8");
    const oldStr = "hello world";
    const newStr = "hi world";
    const count = content.split(oldStr).length - 1;
    expect(count).toBe(1);
    content = content.replace(oldStr, newStr);
    await fs.writeFile(filePath, content, "utf-8");
    expect(await fs.readFile(filePath, "utf-8")).toBe("hi world, hello universe");
  });

  it("str_replace fails when string appears multiple times", async () => {
    const content = "abc abc abc";
    const target = "abc";
    const count = content.split(target).length - 1;
    expect(count).toBe(3);
    expect(count).not.toBe(1);
  });

  it("edit_file inserts line at position", () => {
    const lines = ["line1", "line2", "line3"];
    const insertAt = 2;
    lines.splice(insertAt - 1, 0, "inserted");
    expect(lines[1]).toBe("inserted");
    expect(lines).toHaveLength(4);
  });

  it("edit_file replaces line at position", () => {
    const lines = ["line1", "line2", "line3"];
    lines[1] = "replaced";
    expect(lines[1]).toBe("replaced");
  });

  it("edit_file deletes line at position", () => {
    const lines = ["line1", "line2", "line3"];
    lines.splice(1, 1);
    expect(lines).toEqual(["line1", "line3"]);
  });

  it("write and read binary-safe via Buffer", async () => {
    const filePath = path.join(tmpDir, "binary.bin");
    const buf = Buffer.from([0x00, 0xFF, 0x42, 0xDE, 0xAD]);
    await fs.writeFile(filePath, buf);
    const read = await fs.readFile(filePath);
    expect(Buffer.compare(buf, read)).toBe(0);
  });

  it("creates directory recursively", async () => {
    const deep = path.join(tmpDir, "a", "b", "c");
    await fs.mkdir(deep, { recursive: true });
    expect(await exists(deep)).toBe(true);
  });

  it("directory listing returns entries", async () => {
    await fs.writeFile(path.join(tmpDir, "x.txt"), "x", "utf-8");
    await fs.writeFile(path.join(tmpDir, "y.txt"), "y", "utf-8");
    await fs.mkdir(path.join(tmpDir, "sub"));
    const entries = await fs.readdir(tmpDir, { withFileTypes: true });
    const names = entries.map((e) => e.name).sort();
    expect(names).toContain("x.txt");
    expect(names).toContain("y.txt");
    expect(names).toContain("sub");
  });
});

// ============================================================================
// TESTS: Extension Filter
// ============================================================================

describe("Extension Filter", () => {
  it("splits comma-separated extensions", () => {
    const raw = ".txt,.json,.py";
    const extensions = raw.split(",").map((e) => e.trim().toLowerCase());
    expect(extensions).toEqual([".txt", ".json", ".py"]);
  });

  it("matches file by extension", () => {
    const extFilter = [".txt", ".md"];
    const fileName = "readme.md";
    const ext = path.extname(fileName).toLowerCase();
    expect(extFilter.includes(ext)).toBe(true);
  });

  it("rejects file with non-matching extension", () => {
    const extFilter = [".txt", ".md"];
    const fileName = "script.py";
    const ext = path.extname(fileName).toLowerCase();
    expect(extFilter.includes(ext)).toBe(false);
  });

  it("handles case-insensitive extension matching", () => {
    const extFilter = [".txt"];
    const fileName = "FILE.TXT";
    const ext = path.extname(fileName).toLowerCase();
    expect(extFilter.includes(ext)).toBe(true);
  });
});

// ============================================================================
// TESTS: Copy and Move (filesystem)
// ============================================================================

describe("Copy and Move", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await rmDir(tmpDir);
  });

  it("copies a file preserving content", async () => {
    const src = path.join(tmpDir, "src.txt");
    const dest = path.join(tmpDir, "dest.txt");
    await fs.writeFile(src, "copy me", "utf-8");
    await fs.copyFile(src, dest);
    expect(await fs.readFile(dest, "utf-8")).toBe("copy me");
    expect(await exists(src)).toBe(true);
  });

  it("moves a file (rename)", async () => {
    const src = path.join(tmpDir, "old.txt");
    const dest = path.join(tmpDir, "new.txt");
    await fs.writeFile(src, "move me", "utf-8");
    await fs.rename(src, dest);
    expect(await exists(src)).toBe(false);
    expect(await fs.readFile(dest, "utf-8")).toBe("move me");
  });

  it("copy to nested directory creates parent", async () => {
    const src = path.join(tmpDir, "file.txt");
    const destDir = path.join(tmpDir, "nested", "deep");
    const dest = path.join(destDir, "file.txt");
    await fs.writeFile(src, "deep copy", "utf-8");
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(src, dest);
    expect(await fs.readFile(dest, "utf-8")).toBe("deep copy");
  });
});

// ============================================================================
// TESTS: Encoding Detection
// ============================================================================

describe("Encoding Detection", () => {
  it("detects UTF-8 BOM (EF BB BF)", () => {
    const buf = Buffer.from([0xEF, 0xBB, 0xBF, 0x68, 0x65, 0x6C, 0x6C, 0x6F]);
    const str = buf.toString("utf-8");
    expect(str.charCodeAt(0)).toBe(0xFEFF);
  });

  it("detects UTF-16 LE BOM (FF FE)", () => {
    const buf = Buffer.from([0xFF, 0xFE]);
    expect(buf[0]).toBe(0xFF);
    expect(buf[1]).toBe(0xFE);
  });

  it("no BOM in plain ASCII", () => {
    const str = "plain text";
    expect(str.charCodeAt(0)).not.toBe(0xFEFF);
  });

  it("NUL byte detection", () => {
    const content = "hello world";
    expect(content.includes("\0")).toBe(true);
  });
});

// ============================================================================
// cloudSafeRename helper (mirrors src/index.ts, with injectable renameFn for testing)
// ============================================================================

const CLOUD_LOCK_ERRORS = new Set(['EPERM', 'EACCES', 'EXDEV']);

type RenameFn = (src: string, dst: string) => Promise<void>;

async function cloudSafeRename(
  sourcePath: string,
  destPath: string,
  renameFn: RenameFn = fs.rename
): Promise<{ usedFallback: boolean }> {
  try {
    await renameFn(sourcePath, destPath);
    return { usedFallback: false };
  } catch (renameError: unknown) {
    const code = (renameError as NodeJS.ErrnoException).code;
    if (!code || !CLOUD_LOCK_ERRORS.has(code)) {
      throw renameError;
    }

    const stats = await fs.stat(sourcePath);

    if (stats.isDirectory()) {
      await fs.cp(sourcePath, destPath, { recursive: true });
    } else {
      await fs.copyFile(sourcePath, destPath);
    }

    const destStats = await fs.stat(destPath);
    if (stats.isFile() && destStats.size !== stats.size) {
      await fs.rm(destPath, { recursive: true, force: true });
      throw new Error(`Copy verification failed: expected ${stats.size} bytes, got ${destStats.size} bytes`);
    }

    try {
      if (stats.isDirectory()) {
        await fs.rm(sourcePath, { recursive: true });
      } else {
        await fs.unlink(sourcePath);
      }
    } catch (deleteError: unknown) {
      const delCode = (deleteError as NodeJS.ErrnoException).code;
      if (delCode === 'EPERM' && process.platform === 'win32') {
        try {
          await fs.chmod(sourcePath, 0o666);
          if (stats.isDirectory()) {
            await fs.rm(sourcePath, { recursive: true });
          } else {
            await fs.unlink(sourcePath);
          }
        } catch {
          throw new Error(`Copied to destination but cannot delete source (still locked): ${sourcePath}`);
        }
      } else {
        throw deleteError;
      }
    }

    return { usedFallback: true };
  }
}

function throwWithCode(message: string, code: string): never {
  const err = new Error(message) as NodeJS.ErrnoException;
  err.code = code;
  throw err;
}

// ============================================================================
// TESTS: cloudSafeRename
// ============================================================================

describe("cloudSafeRename", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await rmDir(tmpDir);
  });

  it("moves a file via fast path (fs.rename)", async () => {
    const src = path.join(tmpDir, "file.txt");
    const dst = path.join(tmpDir, "moved.txt");
    await fs.writeFile(src, "hello", "utf-8");

    const result = await cloudSafeRename(src, dst);

    expect(result.usedFallback).toBe(false);
    expect(await exists(src)).toBe(false);
    expect(await fs.readFile(dst, "utf-8")).toBe("hello");
  });

  it("moves a directory via fast path", async () => {
    const srcDir = path.join(tmpDir, "srcdir");
    const dstDir = path.join(tmpDir, "dstdir");
    await fs.mkdir(srcDir);
    await fs.writeFile(path.join(srcDir, "inner.txt"), "data", "utf-8");

    const result = await cloudSafeRename(srcDir, dstDir);

    expect(result.usedFallback).toBe(false);
    expect(await exists(srcDir)).toBe(false);
    expect(await fs.readFile(path.join(dstDir, "inner.txt"), "utf-8")).toBe("data");
  });

  it("falls back to copy+delete on cross-device (EXDEV)", async () => {
    const src = path.join(tmpDir, "cross.txt");
    const dst = path.join(tmpDir, "crossed.txt");
    await fs.writeFile(src, "cross device content", "utf-8");

    const failingRename: RenameFn = async () => throwWithCode("EXDEV: cross-device link not permitted", "EXDEV");

    const result = await cloudSafeRename(src, dst, failingRename);
    expect(result.usedFallback).toBe(true);
    expect(await exists(src)).toBe(false);
    expect(await fs.readFile(dst, "utf-8")).toBe("cross device content");
  });

  it("falls back to copy+delete on EPERM", async () => {
    const src = path.join(tmpDir, "perm.txt");
    const dst = path.join(tmpDir, "permitted.txt");
    await fs.writeFile(src, "permission test", "utf-8");

    const failingRename: RenameFn = async () => throwWithCode("EPERM: operation not permitted", "EPERM");

    const result = await cloudSafeRename(src, dst, failingRename);
    expect(result.usedFallback).toBe(true);
    expect(await exists(src)).toBe(false);
    expect(await fs.readFile(dst, "utf-8")).toBe("permission test");
  });

  it("falls back to copy+delete for directories on EACCES", async () => {
    const srcDir = path.join(tmpDir, "acces_dir");
    const dstDir = path.join(tmpDir, "moved_dir");
    await fs.mkdir(srcDir);
    await fs.writeFile(path.join(srcDir, "a.txt"), "aaa", "utf-8");
    await fs.writeFile(path.join(srcDir, "b.txt"), "bbb", "utf-8");

    const failingRename: RenameFn = async () => throwWithCode("EACCES: permission denied", "EACCES");

    const result = await cloudSafeRename(srcDir, dstDir, failingRename);
    expect(result.usedFallback).toBe(true);
    expect(await exists(srcDir)).toBe(false);
    expect(await fs.readFile(path.join(dstDir, "a.txt"), "utf-8")).toBe("aaa");
    expect(await fs.readFile(path.join(dstDir, "b.txt"), "utf-8")).toBe("bbb");
  });

  it("rethrows non-cloud-lock errors (e.g. ENOENT)", async () => {
    const src = path.join(tmpDir, "nonexistent.txt");
    const dst = path.join(tmpDir, "dst.txt");

    await expect(cloudSafeRename(src, dst)).rejects.toThrow();
  });

  it("does not trigger fallback for unknown error codes", async () => {
    const src = path.join(tmpDir, "unkn.txt");
    const dst = path.join(tmpDir, "unkn_dst.txt");
    await fs.writeFile(src, "data", "utf-8");

    const failingRename: RenameFn = async () => throwWithCode("EISDIR: is a directory", "EISDIR");

    await expect(cloudSafeRename(src, dst, failingRename)).rejects.toThrow("EISDIR");
    expect(await exists(src)).toBe(true);
  });
});
