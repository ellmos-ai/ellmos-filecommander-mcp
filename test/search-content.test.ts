import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  InvalidRegularExpressionError,
  SEARCH_CONTENT_LIMITS,
  formatSearchContentResult,
  searchContent,
  type SearchContentDependencies,
  type SearchContentParams,
} from "../src/search-content.js";

const defaults: Omit<SearchContentParams, "paths" | "query"> = {
  regex: false,
  caseSensitive: false,
  contextLines: 1,
  maxResults: 100,
  maxResultsPerFile: 50,
};

describe("searchContent", () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), "filecommander-search-content-"));
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it("searches only explicit files and preserves input order", async () => {
    const first = join(tempDirectory, "first.txt");
    const second = join(tempDirectory, "second.txt");
    await writeFile(first, "needle one\n");
    await writeFile(second, "needle two\n");

    const result = await searchContent({
      ...defaults,
      paths: [second, first],
      query: "needle",
    });

    expect(result.files.map((file) => file.path)).toEqual([second, first]);
    expect(result.files.map((file) => file.matches[0].excerpt)).toEqual(["needle two", "needle one"]);
    expect(result.summary.matches_returned).toBe(2);
  });

  it("uses literal matching by default and validates optional regex syntax", async () => {
    const file = join(tempDirectory, "literal.txt");
    await writeFile(file, "a.b\naxb\n");

    const literal = await searchContent({ ...defaults, paths: [file], query: "a.b" });
    const regex = await searchContent({ ...defaults, paths: [file], query: "a.b", regex: true });

    expect(literal.files[0].matches).toHaveLength(1);
    expect(regex.files[0].matches).toHaveLength(2);
    await expect(
      searchContent({ ...defaults, paths: [file], query: "[", regex: true }),
    ).rejects.toBeInstanceOf(InvalidRegularExpressionError);
  });

  it("supports Unicode-aware case-insensitive and case-sensitive matching", async () => {
    const file = join(tempDirectory, "unicode.txt");
    await writeFile(file, "Äpfel\näPFEL\n");

    const insensitive = await searchContent({ ...defaults, paths: [file], query: "äpfel" });
    const sensitive = await searchContent({
      ...defaults,
      paths: [file],
      query: "Äpfel",
      caseSensitive: true,
    });

    expect(insensitive.files[0].matches).toHaveLength(2);
    expect(sensitive.files[0].matches).toHaveLength(1);
  });

  it("returns bounded context with one-based line numbers", async () => {
    const file = join(tempDirectory, "context.txt");
    await writeFile(file, "zero\none\nneedle\nthree\nfour\n");

    const result = await searchContent({
      ...defaults,
      paths: [file],
      query: "needle",
      contextLines: 2,
    });
    const match = result.files[0].matches[0];

    expect(match.line).toBe(3);
    expect(match.context_before).toEqual([
      { line: 1, text: "zero" },
      { line: 2, text: "one" },
    ]);
    expect(match.context_after).toEqual([
      { line: 4, text: "three" },
      { line: 5, text: "four" },
    ]);
  });

  it("enforces per-file and global match limits deterministically", async () => {
    const first = join(tempDirectory, "many.txt");
    const second = join(tempDirectory, "later.txt");
    await writeFile(first, "hit\nhit\nhit\n");
    await writeFile(second, "hit\n");

    const perFile = await searchContent({
      ...defaults,
      paths: [first],
      query: "hit",
      maxResultsPerFile: 2,
    });
    expect(perFile.files[0]).toMatchObject({ status: "partial", truncated: true });
    expect(perFile.files[0].matches).toHaveLength(2);

    const global = await searchContent({
      ...defaults,
      paths: [first, second],
      query: "hit",
      maxResults: 2,
    });
    expect(global.summary.global_limit_reached).toBe(true);
    expect(global.summary.matches_returned).toBe(2);
    expect(global.files[1].error?.code).toBe("global_limit_reached");
  });

  it("does not recurse or expand directories and glob patterns", async () => {
    const childDirectory = join(tempDirectory, "child");
    await mkdir(childDirectory);
    await writeFile(join(childDirectory, "hidden.txt"), "needle");

    const result = await searchContent({
      ...defaults,
      paths: [childDirectory, join(tempDirectory, "*.txt")],
      query: "needle",
    });

    expect(result.files[0].error?.code).toBe("not_file");
    expect(result.files[1].error?.code).toBe("missing");
    expect(result.summary.matches_returned).toBe(0);
  });

  it("reports binary, invalid UTF-8, and oversized files independently", async () => {
    const binary = join(tempDirectory, "binary.bin");
    const invalidUtf8 = join(tempDirectory, "invalid.txt");
    await writeFile(binary, Buffer.from([0, 1, 2, 3]));
    await writeFile(invalidUtf8, Buffer.from([0xc3, 0x28]));

    const dependencies: SearchContentDependencies = {
      stat: async (filePath) => ({
        size: filePath.endsWith("large.txt") ? SEARCH_CONTENT_LIMITS.maxFileBytes + 1 : 4,
        isFile: () => true,
      }),
      readFile: async (filePath) => {
        if (filePath === binary) return Buffer.from([0, 1, 2, 3]);
        return Buffer.from([0xc3, 0x28]);
      },
    };
    const result = await searchContent(
      {
        ...defaults,
        paths: [binary, invalidUtf8, join(tempDirectory, "large.txt")],
        query: "needle",
      },
      dependencies,
    );

    expect(result.files.map((file) => file.error?.code)).toEqual([
      "binary",
      "encoding_error",
      "too_large",
    ]);
  });

  it.each([
    ["ENOENT", "missing"],
    ["EACCES", "permission_denied"],
    ["EPERM", "permission_denied"],
    ["EIO", "cloud_unavailable"],
    ["UNKNOWN", "read_error"],
  ] as const)("maps %s failures to %s without aborting other files", async (errno, expected) => {
    const good = join(tempDirectory, "good.txt");
    const bad = join(tempDirectory, "bad.txt");
    const dependencies: SearchContentDependencies = {
      stat: async (filePath) => {
        if (filePath === bad) throw Object.assign(new Error("unavailable"), { code: errno });
        return { size: 6, isFile: () => true };
      },
      readFile: async () => Buffer.from("needle"),
    };

    const result = await searchContent(
      { ...defaults, paths: [bad, good], query: "needle" },
      dependencies,
    );

    expect(result.files[0].error?.code).toBe(expected);
    expect(result.files[1].matches).toHaveLength(1);
  });

  it("redacts common secrets and bounds long lines and serialized output", async () => {
    const file = join(tempDirectory, "secrets.txt");
    const token = `sk-${"a".repeat(30)}`;
    const keyMaterial = "SUPERSECRETBASE64MATERIAL";
    await writeFile(
      file,
      [
        `needle ${"x".repeat(700)} api_key=${token}`,
        'password="hunter two" needle',
        "needle -----BEGIN PRIVATE KEY-----",
        keyMaterial,
        "-----END PRIVATE KEY-----",
        "",
      ].join("\n"),
    );

    const result = await searchContent({
      ...defaults,
      paths: [file],
      query: "needle",
      contextLines: 2,
    });
    const output = formatSearchContentResult(result);

    expect(output).not.toContain(token);
    expect(output).not.toContain("hunter two");
    expect(output).not.toContain(keyMaterial);
    expect(output).not.toContain("BEGIN PRIVATE KEY");
    expect(output).not.toContain("END PRIVATE KEY");
    expect(output).toContain("[REDACTED PRIVATE KEY]");
    expect(result.files[0].matches.every((match) => match.excerpt.length <= 502)).toBe(true);
    expect(output.length).toBeLessThanOrEqual(SEARCH_CONTENT_LIMITS.maxOutputChars);
    expect(formatSearchContentResult(result)).toBe(output);
  });
});
