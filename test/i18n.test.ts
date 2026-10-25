import { readFile } from "fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { getIntlLocale, getLanguage, getSupportedLanguages, resolveStartupLanguage, setLanguage, t, type Lang } from "../src/i18n/index.js";

type NonFallbackLang = Exclude<Lang, "de" | "en">;

const localizedExpectations: Record<NonFallbackLang, {
  serverStarted: string;
  jsonRepaired: string;
  noDuplicates: string;
  searchContentMissing: string;
}> = {
  es: {
    serverStarted: "Servidor MCP FileCommander iniciado",
    jsonRepaired: "JSON reparado: demo.json",
    noDuplicates: "No se encontraron duplicados",
    searchContentMissing: "Archivo no encontrado",
  },
  zh: {
    serverStarted: "FileCommander MCP 服务器已启动",
    jsonRepaired: "JSON 已修复: demo.json",
    noDuplicates: "未找到重复文件",
    searchContentMissing: "文件不存在",
  },
  ja: {
    serverStarted: "FileCommander MCPサーバーを起動しました",
    jsonRepaired: "JSONを修復しました: demo.json",
    noDuplicates: "重複は見つかりませんでした",
    searchContentMissing: "ファイルが見つかりません",
  },
  ru: {
    serverStarted: "MCP-сервер FileCommander запущен",
    jsonRepaired: "JSON восстановлен: demo.json",
    noDuplicates: "Дубликаты не найдены",
    searchContentMissing: "Файл не найден",
  },
  fr: {
    serverStarted: "Serveur MCP ellmos FileCommander démarré",
    jsonRepaired: "JSON réparé : demo.json",
    noDuplicates: "Aucun doublon trouvé",
    searchContentMissing: "Fichier introuvable",
  },
  hi: {
    serverStarted: "ellmos FileCommander MCP Server सफलतापूर्वक शुरू हुआ",
    jsonRepaired: "JSON की मरम्मत हो गई: demo.json",
    noDuplicates: "कोई डुप्लिकेट नहीं मिला",
    searchContentMissing: "फ़ाइल नहीं मिली",
  },
  ar: {
    serverStarted: "بدأ تشغيل خادم ellmos FileCommander MCP",
    jsonRepaired: "تم إصلاح JSON: demo.json",
    noDuplicates: "لم يتم العثور على تكرارات",
    searchContentMissing: "لم يتم العثور على الملف",
  },
  bn: {
    serverStarted: "ellmos FileCommander MCP Server শুরু হয়েছে",
    jsonRepaired: "JSON মেরামত হয়েছে: demo.json",
    noDuplicates: "কোনো ডুপ্লিকেট পাওয়া যায়নি",
    searchContentMissing: "ফাইল পাওয়া যায়নি",
  },
  pt: {
    serverStarted: "Servidor MCP do ellmos FileCommander iniciado",
    jsonRepaired: "JSON reparado: demo.json",
    noDuplicates: "Nenhuma duplicata encontrada",
    searchContentMissing: "Arquivo não encontrado",
  },
};

describe("i18n language packs", () => {
  afterEach(() => {
    setLanguage("de");
  });

  it("exposes all supported language codes in stable order", () => {
    expect(getSupportedLanguages()).toEqual(["de", "en", "es", "zh", "ja", "ru", "fr", "hi", "ar", "bn", "pt"]);
  });

  it("selects only exact supported FC_LANGUAGE values and falls back to German", () => {
    for (const language of ["de", "en", "es", "zh", "ja", "ru", "fr", "hi", "ar", "bn", "pt"] as const) {
      expect(resolveStartupLanguage(language)).toBe(language);
    }
    for (const value of [undefined, "", "FR", "pt-BR", "xx"]) {
      expect(resolveStartupLanguage(value)).toBe("de");
    }
  });

  it("uses a locale-aware date format for each supported language", () => {
    const expected: Record<Lang, string> = {
      de: "de-DE", en: "en-US", es: "es-ES", zh: "zh-CN", ja: "ja-JP", ru: "ru-RU",
      fr: "fr-FR", hi: "hi-IN", ar: "ar", bn: "bn-BD", pt: "pt-BR",
    };
    for (const lang of getSupportedLanguages()) {
      setLanguage(lang);
      expect(getIntlLocale()).toBe(expected[lang]);
      expect(() => new Intl.DateTimeFormat(getIntlLocale()).format(new Date("2026-10-25T12:34:00Z"))).not.toThrow();
    }
  });

  it("defaults back to German after tests reset the language", () => {
    expect(getLanguage()).toBe("de");
    expect(t().server.started).toBe("\uD83D\uDE80 ellmos FileCommander MCP Server gestartet");
  });

  for (const [lang, expected] of Object.entries(localizedExpectations) as Array<[NonFallbackLang, typeof localizedExpectations.es]>) {
    it(`uses real ${lang} translations instead of English fallback`, () => {
      setLanguage(lang);

      expect(t().server.started).toContain(expected.serverStarted);
      expect(t().fc_fix_json.repairedHeader("demo.json")).toContain(expected.jsonRepaired);
      expect(t().fc_detect_duplicates.noDuplicates(5, 5)).toContain(expected.noDuplicates);
      expect(t().fc_search_content.missing).toContain(expected.searchContentMissing);
      expect(t().server.started).not.toContain("FileCommander MCP Server started");
      expect(t().fc_detect_duplicates.noDuplicates(5, 5)).not.toContain("No duplicates found");
      expect(t().fc_search_content.missing).not.toContain("File was not found");
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

  it("formats fc_get_language output natively in all eleven runtime languages", () => {
    const supported = getSupportedLanguages();
    const expectations: Record<Lang, string> = {
      de: "Aktuelle Sprache: de",
      en: "Current language: en",
      es: "Idioma actual: es",
      zh: "当前语言: zh",
      ja: "現在の言語: ja",
      ru: "Текущий язык: ru",
      fr: "Langue actuelle : fr",
      hi: "वर्तमान भाषा: hi",
      ar: "اللغة الحالية: ar",
      bn: "বর্তমান ভাষা: bn",
      pt: "Idioma atual: pt",
    };

    for (const lang of supported) {
      setLanguage(lang);
      expect(t().server.languageGet(lang, supported)).toContain(expectations[lang]);
      expect(t().server.languageGet(lang, supported)).toContain(supported.join(", "));
    }
  });

  it("formats fc_open_path launch acknowledgements natively in all eleven runtime languages", () => {
    const expectations: Record<Lang, string> = {
      de: "Öffnungsanforderung gestartet",
      en: "Open request started",
      es: "Solicitud de apertura iniciada",
      zh: "已启动打开请求",
      ja: "開く要求を開始しました",
      ru: "Запрос на открытие запущен",
      fr: "Demande d’ouverture lancée",
      hi: "खोलने का अनुरोध शुरू किया गया",
      ar: "بدأ طلب فتح المسار",
      bn: "খোলার অনুরোধ শুরু হয়েছে",
      pt: "Solicitação para abrir iniciada",
    };

    for (const lang of getSupportedLanguages()) {
      setLanguage(lang);
      expect(t().fc_open_path.launchRequested("C:/OneDrive/Prüfung ä.pdf", "win32")).toContain(expectations[lang]);
      expect(t().fc_open_path.launchRequested("C:/OneDrive/Prüfung ä.pdf", "win32")).toContain("Prüfung ä.pdf");
      expect(t().fc_open_path.noVisibleConfirmation).toBeTruthy();
      expect(t().fc_open_path.fallbackRecommended("fc_preview_file")).toContain("fc_preview_file");
      expect(t().fc_preview_file.description).toContain("MIME");
      expect(t().fc_preview_file.metadataOnly("demo.png", "image/png", 4, "metadata_only")).toContain("demo.png");
    }
  });

  for (const lang of ["es", "zh", "ja", "ru", "fr", "hi", "ar", "bn", "pt"] as const) {
    it(`does not keep the old ${lang} English-fallback stub`, async () => {
      const source = await readFile(new URL(`../src/i18n/${lang}.ts`, import.meta.url), "utf-8");

      expect(source).not.toContain("falls back to English");
      expect(source).not.toContain("...en");
      expect(source).not.toContain("from './en.js'");
    });
  }
});
