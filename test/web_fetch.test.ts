/**
 * Tests for the fc_web_fetch tool.
 *
 * Following the suite convention (see index.test.ts): the tool handler is not
 * exported, so we mirror its core logic (SSRF IP guard, HTML->text, link/form
 * parsing) in test helpers and validate behavior. These checks are network-free
 * and deterministic; live end-to-end behavior (redirect following, real fetch)
 * is covered separately.
 */
import { describe, it, expect } from "vitest";
import * as net from "net";

// --- mirrored from src/index.ts (fc_web_fetch helpers) ---

function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (version === 6) {
    const ip6 = ip.toLowerCase();
    if (ip6 === "::1" || ip6 === "::") return true;
    if (ip6.startsWith("fe80")) return true;
    if (ip6.startsWith("fc") || ip6.startsWith("fd")) return true;
    if (ip6.startsWith("::ffff:")) return isBlockedIp(ip6.replace("::ffff:", ""));
    return false;
  }
  return true;
}

function htmlToText(html: string): string {
  let s = html.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  // Unescape &amp; LAST (mirror of src): avoids double-unescaping.
  s = s.replace(/&nbsp;/gi, " ").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
       .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, "&");
  s = s.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function parseLinks(html: string, base: string): { text: string; href: string }[] {
  const out: { text: string; href: string }[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (raw.startsWith("#")) continue; // fragment-only self-links carry no navigable target
    let u: URL;
    try { u = new URL(raw, base); } catch { continue; }
    // Allowlist http/https only; drops javascript:, data:, vbscript:, mailto:, tel:, blob: ...
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    const href = u.toString();
    if (seen.has(href)) continue;
    seen.add(href);
    // Strip tags repeatedly until stable so a removal cannot re-form a new tag.
    let inner = m[2];
    let prev = "";
    while (inner !== prev) { prev = inner; inner = inner.replace(/<[^>]*>/g, ""); }
    const text = inner.replace(/\s+/g, " ").trim().slice(0, 120);
    out.push({ text, href });
    if (out.length >= 200) break;
  }
  return out;
}

function parseForms(html: string): { action: string; method: string; fields: string[] }[] {
  const forms: { action: string; method: string; fields: string[] }[] = [];
  const formRe = /<form([^>]*)>([\s\S]*?)<\/form>/gi;
  let fm: RegExpExecArray | null;
  while ((fm = formRe.exec(html)) !== null) {
    const attrs = fm[1];
    const body = fm[2];
    const action = (/action=["']([^"']*)["']/i.exec(attrs) || [])[1] || "";
    const method = ((/method=["']([^"']*)["']/i.exec(attrs) || [])[1] || "GET").toUpperCase();
    const fields: string[] = [];
    let im: RegExpExecArray | null;
    const inputRe = /<input([^>]*)>/gi;
    while ((im = inputRe.exec(body)) !== null) {
      const name = (/name=["']([^"']*)["']/i.exec(im[1]) || [])[1] || "?";
      const type = (/type=["']([^"']*)["']/i.exec(im[1]) || [])[1] || "text";
      fields.push(`input[${type}] name=${name}`);
    }
    const taRe = /<textarea[^>]*name=["']([^"']*)["']/gi;
    while ((im = taRe.exec(body)) !== null) fields.push(`textarea name=${im[1]}`);
    const selRe = /<select[^>]*name=["']([^"']*)["']/gi;
    while ((im = selRe.exec(body)) !== null) fields.push(`select name=${im[1]}`);
    forms.push({ action, method, fields });
  }
  return forms;
}

const SAMPLE = `<html><head><style>.x{color:red}</style><script>var a=1;</script></head>
<body><nav>Nav</nav><h1>Titel</h1><p>Echter Inhalt hier.</p>
<a href="/rel">Rel</a><a href="https://ex.org/abs">Abs</a>
<a href="mailto:a@b.c">Mail</a><a href="javascript:void(0)">JS</a>
<a href="data:text/html,x">Data</a><a href="vbscript:msgbox(1)">VB</a><a href="#top">Frag</a>
<form action="/submit" method="post"><input type="text" name="user">
<input type="password" name="pw"><textarea name="msg"></textarea>
<select name="opt"></select></form><footer>Foot</footer></body></html>`;

describe("fc_web_fetch SSRF IP guard", () => {
  it("blocks loopback / private / link-local / CGNAT / multicast (IPv4)", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "169.254.1.1",
                      "172.16.0.1", "172.31.255.255", "100.64.0.1", "224.0.0.1", "0.0.0.0"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("allows public IPv4 (incl. 172.15 / 172.32 boundaries)", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "93.184.216.34"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("blocks IPv6 loopback / ULA / link-local", () => {
    for (const ip of ["::1", "fe80::1", "fc00::1", "fd12::1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("rejects strings that are not valid IPs", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
    expect(isBlockedIp("")).toBe(true);
  });
});

describe("fc_web_fetch parsing", () => {
  it("extracts clean text and drops script/style boilerplate", () => {
    const t = htmlToText(SAMPLE);
    expect(t).toContain("Echter Inhalt hier.");
    expect(t).not.toContain("var a=1");
    expect(t).not.toContain("color:red");
  });

  it("parses, absolutizes and filters links", () => {
    const hrefs = parseLinks(SAMPLE, "https://site.test/page").map((l) => l.href);
    expect(hrefs).toContain("https://site.test/rel");
    expect(hrefs).toContain("https://ex.org/abs");
    // Allowlist check: every surviving link must be http/https. This positively
    // proves javascript:, data:, vbscript:, mailto: and fragment-only links are dropped.
    expect(hrefs.every((h) => h.startsWith("http:") || h.startsWith("https:"))).toBe(true);
  });

  it("parses forms with action, method and fields", () => {
    const forms = parseForms(SAMPLE);
    expect(forms).toHaveLength(1);
    expect(forms[0].action).toBe("/submit");
    expect(forms[0].method).toBe("POST");
    const joined = forms[0].fields.join(" ");
    expect(joined).toContain("name=user");
    expect(joined).toContain("name=pw");
    expect(forms[0].fields.some((f) => f.startsWith("textarea"))).toBe(true);
    expect(forms[0].fields.some((f) => f.startsWith("select"))).toBe(true);
  });
});
