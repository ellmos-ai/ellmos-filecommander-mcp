import { readFile } from "fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { getLanguage, getSupportedLanguages, setLanguage, t, type Lang } from "../src/i18n/index.js";

type NonFallbackLang = Exclude<Lang, "de" | "en">;

const localizedExpectations: Record<NonFallbackLang, {
  serverStarted: string;
  jsonRepaired: string;
  noDuplicates: string;
}> = {
  es: {
    serverStarted: "Servidor MCP FileCommander iniciado",
    jsonRepaired: "JSON reparado: demo.json",
    noDuplicates: "No se encontraron duplicados",
  },
  zh: {
    serverStarted: "FileCommander MCP 服务器已启动",
    jsonRepaired: "JSON 已修复: demo.json",
    noDuplicates: "未找到重复文件",
  },
  ja: {
    serverStarted: "FileCommander MCPサーバーを起動しました",
    jsonRepaired: "JSONを修復しました: demo.json",
    noDuplicates: "重複は見つかりませんでした",
  },
  ru: {
    serverStarted: "MCP-сервер FileCommander запущен",
    jsonRepaired: "JSON восстановлен: demo.json",
    noDuplicates: "Дубликаты не найдены",
  },
};

describe("i18n language packs", () => {
  afterEach(() => {
    setLanguage("de");
  });

  it("exposes all supported language codes in stable order", () => {
    expect(getSupportedLanguages()).toEqual(["de", "en", "es", "zh", "ja", "ru"]);
  });

  it("defaults back to German after tests reset the language", () => {
    expect(getLanguage()).toBe("de");
    expect(t().server.started).toBe("\uD83D\uDE80 BACH FileCommander MCP Server gestartet");
  });

  for (const [lang, expected] of Object.entries(localizedExpectations) as Array<[NonFallbackLang, typeof localizedExpectations.es]>) {
    it(`uses real ${lang} translations instead of English fallback`, () => {
      setLanguage(lang);

      expect(t().server.started).toContain(expected.serverStarted);
      expect(t().fc_fix_json.repairedHeader("demo.json")).toContain(expected.jsonRepaired);
      expect(t().fc_detect_duplicates.noDuplicates(5, 5)).toContain(expected.noDuplicates);
      expect(t().server.started).not.toContain("FileCommander MCP Server started");
      expect(t().fc_detect_duplicates.noDuplicates(5, 5)).not.toContain("No duplicates found");
    });
  }

  it("keeps placeholder interpolation intact across non-English languages", () => {
    setLanguage("zh");
    expect(t().fc_archive.extracted("backup.zip", "out")).toContain("backup.zip");
    expect(t().fc_archive.extracted("backup.zip", "out")).toContain("out");

    setLanguage("ja");
    expect(t().fc_batch_rename.useTip("tmp_")).toContain("tmp_");

    setLanguage("ru");
    expect(t().fc_validate_json.errorPosition(12, 3)).toContain("12");
    expect(t().fc_validate_json.errorPosition(12, 3)).toContain("3");

    setLanguage("es");
    expect(t().fc_check_cloud_lock.checkError("cldflt")).toContain("cldflt");
  });

  for (const lang of ["es", "zh", "ja", "ru"] as const) {
    it(`does not keep the old ${lang} English-fallback stub`, async () => {
      const source = await readFile(new URL(`../src/i18n/${lang}.ts`, import.meta.url), "utf-8");

      expect(source).not.toContain("falls back to English");
      expect(source).not.toContain("...en");
      expect(source).not.toContain("from './en.js'");
    });
  }
});
