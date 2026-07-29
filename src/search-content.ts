import * as fs from "node:fs/promises";
import * as path from "node:path";

export const SEARCH_CONTENT_LIMITS = {
  maxPaths: 50,
  maxPathChars: 4096,
  maxQueryChars: 2048,
  maxContextLines: 10,
  maxResults: 200,
  maxResultsPerFile: 100,
  maxFileBytes: 10_000_000,
  maxLineChars: 500,
  maxOutputChars: 200_000,
  maxOutputPathChars: 1024,
} as const;

export type SearchContentErrorCode =
  | "missing"
  | "not_file"
  | "permission_denied"
  | "cloud_unavailable"
  | "encoding_error"
  | "read_error"
  | "too_large"
  | "binary"
  | "global_limit_reached";

export interface SearchContentParams {
  paths: string[];
  query: string;
  regex: boolean;
  caseSensitive: boolean;
  contextLines: number;
  maxResults: number;
  maxResultsPerFile: number;
}

export interface SearchContentContextLine {
  line: number;
  text: string;
}

export interface SearchContentMatch {
  line: number;
  excerpt: string;
  context_before: SearchContentContextLine[];
  context_after: SearchContentContextLine[];
}

export interface SearchContentFileResult {
  path: string;
  status: "ok" | "partial" | "skipped" | "error";
  matches: SearchContentMatch[];
  truncated: boolean;
  error?: {
    code: SearchContentErrorCode;
  };
}

export interface SearchContentResult {
  tool: "fc_search_content";
  mode: "literal" | "regex";
  case_sensitive: boolean;
  context_lines: number;
  limits: {
    max_results: number;
    max_results_per_file: number;
    max_file_bytes: number;
    max_line_chars: number;
    max_output_chars: number;
  };
  summary: {
    requested_files: number;
    searched_files: number;
    matched_files: number;
    skipped_files: number;
    error_files: number;
    matches_returned: number;
    global_limit_reached: boolean;
    output_truncated: boolean;
  };
  files: SearchContentFileResult[];
}

interface FileStats {
  size: number;
  isFile(): boolean;
}

export interface SearchContentDependencies {
  stat?: (filePath: string) => Promise<FileStats>;
  readFile?: (filePath: string) => Promise<Buffer>;
}

export class InvalidRegularExpressionError extends Error {
  constructor() {
    super("Invalid regular expression syntax");
    this.name = "InvalidRegularExpressionError";
  }
}

interface ContentMatcher {
  matches(line: string): { matched: boolean; index: number };
}

function createMatcher(query: string, regex: boolean, caseSensitive: boolean): ContentMatcher {
  if (regex) {
    let expression: RegExp;
    try {
      expression = new RegExp(query, caseSensitive ? "u" : "iu");
    } catch {
      throw new InvalidRegularExpressionError();
    }
    return {
      matches(line: string) {
        const index = line.search(expression);
        return { matched: index >= 0, index };
      },
    };
  }

  const needle = caseSensitive ? query : query.toLowerCase();
  return {
    matches(line: string) {
      const haystack = caseSensitive ? line : line.toLowerCase();
      const index = haystack.indexOf(needle);
      return { matched: index >= 0, index };
    },
  };
}

function isBinaryBuffer(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  if (sample.includes(0)) return true;

  let controlBytes = 0;
  for (const byte of sample) {
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) controlBytes++;
  }
  return sample.length > 0 && controlBytes / sample.length > 0.3;
}

function redactSecrets(text: string): string {
  let redacted = text.replace(
    /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/g,
    "[REDACTED]",
  );
  redacted = redacted.replace(
    /((?:api[_-]?key|access[_-]?token|auth[_-]?token|password|passwd|secret)\s*[:=]\s*)(["'])(.*?)\2/gi,
    "$1$2[REDACTED]$2",
  );
  redacted = redacted.replace(
    /((?:api[_-]?key|access[_-]?token|auth[_-]?token|password|passwd|secret)\s*[:=]\s*)(["']?)[^\s"'`,;]+/gi,
    "$1$2[REDACTED]",
  );
  redacted = redacted.replace(
    /(\b(?:authorization\s*[:=]\s*)?bearer\s+)[A-Za-z0-9._~-]{12,}/gi,
    "$1[REDACTED]",
  );
  return redacted;
}

function redactSensitiveLines(lines: string[]): string[] {
  let inPrivateKeyBlock = false;
  return lines.map((line) => {
    const beginsPrivateKey = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----/i.test(line);
    const endsPrivateKey = /-----END [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----/i.test(line);

    if (beginsPrivateKey) inPrivateKeyBlock = true;
    if (inPrivateKeyBlock) {
      if (endsPrivateKey) inPrivateKeyBlock = false;
      return "[REDACTED PRIVATE KEY]";
    }
    return redactSecrets(line);
  });
}

function boundedLine(line: string, focusIndex = 0): string {
  if (line.length <= SEARCH_CONTENT_LIMITS.maxLineChars) return redactSecrets(line);

  const half = Math.floor(SEARCH_CONTENT_LIMITS.maxLineChars / 2);
  const start = Math.max(0, Math.min(line.length - SEARCH_CONTENT_LIMITS.maxLineChars, focusIndex - half));
  const end = start + SEARCH_CONTENT_LIMITS.maxLineChars;
  return `${start > 0 ? "…" : ""}${redactSecrets(line.slice(start, end))}${end < line.length ? "…" : ""}`;
}

function boundedOutputPath(filePath: string): string {
  if (filePath.length <= SEARCH_CONTENT_LIMITS.maxOutputPathChars) return filePath;
  return `…${filePath.slice(-(SEARCH_CONTENT_LIMITS.maxOutputPathChars - 1))}`;
}

function classifyFileError(error: unknown): SearchContentErrorCode {
  const errno = error as NodeJS.ErrnoException;
  const code = errno.code?.toUpperCase();
  const message = errno.message?.toUpperCase() || "";

  if (code === "ENOENT") return "missing";
  if (code === "EACCES" || code === "EPERM") return "permission_denied";
  if (
    ["ENODATA", "EIO", "EBUSY", "EAGAIN"].includes(code || "")
    || message.includes("CLOUD FILE")
    || message.includes("PLACEHOLDER")
    || message.includes("NOT SYNCED")
  ) {
    return "cloud_unavailable";
  }
  return "read_error";
}

function fileError(filePath: string, code: SearchContentErrorCode): SearchContentFileResult {
  const skipped = code === "binary" || code === "too_large" || code === "global_limit_reached";
  return {
    path: boundedOutputPath(filePath),
    status: skipped ? "skipped" : "error",
    matches: [],
    truncated: code === "global_limit_reached",
    error: { code },
  };
}

function recount(result: SearchContentResult): void {
  result.summary.searched_files = result.files.filter((file) => file.status === "ok" || file.status === "partial").length;
  result.summary.matched_files = result.files.filter((file) => file.matches.length > 0).length;
  result.summary.skipped_files = result.files.filter((file) => file.status === "skipped").length;
  result.summary.error_files = result.files.filter((file) => file.status === "error").length;
  result.summary.matches_returned = result.files.reduce((sum, file) => sum + file.matches.length, 0);
}

export async function searchContent(
  params: SearchContentParams,
  dependencies: SearchContentDependencies = {},
): Promise<SearchContentResult> {
  const stat = dependencies.stat || fs.stat;
  const readFile = dependencies.readFile || fs.readFile;
  const matcher = createMatcher(params.query, params.regex, params.caseSensitive);

  const result: SearchContentResult = {
    tool: "fc_search_content",
    mode: params.regex ? "regex" : "literal",
    case_sensitive: params.caseSensitive,
    context_lines: params.contextLines,
    limits: {
      max_results: params.maxResults,
      max_results_per_file: params.maxResultsPerFile,
      max_file_bytes: SEARCH_CONTENT_LIMITS.maxFileBytes,
      max_line_chars: SEARCH_CONTENT_LIMITS.maxLineChars,
      max_output_chars: SEARCH_CONTENT_LIMITS.maxOutputChars,
    },
    summary: {
      requested_files: params.paths.length,
      searched_files: 0,
      matched_files: 0,
      skipped_files: 0,
      error_files: 0,
      matches_returned: 0,
      global_limit_reached: false,
      output_truncated: false,
    },
    files: [],
  };

  let totalMatches = 0;

  for (const inputPath of params.paths) {
    const filePath = path.normalize(inputPath);
    if (totalMatches >= params.maxResults) {
      result.summary.global_limit_reached = true;
      result.files.push(fileError(filePath, "global_limit_reached"));
      continue;
    }

    let stats: FileStats;
    try {
      stats = await stat(filePath);
    } catch (error) {
      result.files.push(fileError(filePath, classifyFileError(error)));
      continue;
    }

    if (!stats.isFile()) {
      result.files.push(fileError(filePath, "not_file"));
      continue;
    }
    if (stats.size > SEARCH_CONTENT_LIMITS.maxFileBytes) {
      result.files.push(fileError(filePath, "too_large"));
      continue;
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch (error) {
      result.files.push(fileError(filePath, classifyFileError(error)));
      continue;
    }

    if (buffer.length > SEARCH_CONTENT_LIMITS.maxFileBytes) {
      result.files.push(fileError(filePath, "too_large"));
      continue;
    }
    if (isBinaryBuffer(buffer)) {
      result.files.push(fileError(filePath, "binary"));
      continue;
    }

    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      result.files.push(fileError(filePath, "encoding_error"));
      continue;
    }

    const lines = content.split(/\r\n|\n|\r/);
    const safeLines = redactSensitiveLines(lines);
    const fileResult: SearchContentFileResult = {
      path: boundedOutputPath(filePath),
      status: "ok",
      matches: [],
      truncated: false,
    };

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const match = matcher.matches(lines[lineIndex]);
      if (!match.matched) continue;

      if (fileResult.matches.length >= params.maxResultsPerFile || totalMatches >= params.maxResults) {
        fileResult.status = "partial";
        fileResult.truncated = true;
        if (totalMatches >= params.maxResults) result.summary.global_limit_reached = true;
        break;
      }

      const beforeStart = Math.max(0, lineIndex - params.contextLines);
      const afterEnd = Math.min(lines.length - 1, lineIndex + params.contextLines);
      const contextBefore: SearchContentContextLine[] = [];
      const contextAfter: SearchContentContextLine[] = [];

      for (let contextIndex = beforeStart; contextIndex < lineIndex; contextIndex++) {
        contextBefore.push({ line: contextIndex + 1, text: boundedLine(safeLines[contextIndex]) });
      }
      for (let contextIndex = lineIndex + 1; contextIndex <= afterEnd; contextIndex++) {
        contextAfter.push({ line: contextIndex + 1, text: boundedLine(safeLines[contextIndex]) });
      }

      const safeMatch = matcher.matches(safeLines[lineIndex]);
      fileResult.matches.push({
        line: lineIndex + 1,
        excerpt: boundedLine(safeLines[lineIndex], safeMatch.matched ? safeMatch.index : 0),
        context_before: contextBefore,
        context_after: contextAfter,
      });
      totalMatches++;
    }

    result.files.push(fileResult);
  }

  recount(result);
  return result;
}

export function formatSearchContentResult(result: SearchContentResult): string {
  const bounded = JSON.parse(JSON.stringify(result)) as SearchContentResult;
  let output = JSON.stringify(bounded, null, 2);

  while (output.length > SEARCH_CONTENT_LIMITS.maxOutputChars) {
    let removed = false;
    for (let fileIndex = bounded.files.length - 1; fileIndex >= 0; fileIndex--) {
      const file = bounded.files[fileIndex];
      if (file.matches.length > 0) {
        file.matches.pop();
        file.status = "partial";
        file.truncated = true;
        bounded.summary.output_truncated = true;
        removed = true;
        break;
      }
    }
    if (!removed) break;
    recount(bounded);
    output = JSON.stringify(bounded, null, 2);
  }

  return output;
}
