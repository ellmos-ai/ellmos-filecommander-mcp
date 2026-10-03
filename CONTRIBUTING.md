# Contributing to ellmos-filecommander-mcp / Mitwirken an ellmos-filecommander-mcp

[English](#english) | [Deutsch](#deutsch)

---

<a id="english"></a>
## English

Thank you for your interest in contributing to **ellmos-filecommander-mcp** (`ellmos-ai/ellmos-filecommander-mcp`), a production-grade 50-tool Model Context Protocol (MCP) server providing filesystem management, bounded multi-file content search, default-app path opening, process control, interactive REPL sessions, and format conversion over local stdio transport.

### 1. Architectural Principles & 10 Governance Invariants

All contributions must strictly adhere to our core architectural invariants:

1. **Local Stdio & Explicit Egress (`INV-LOCAL-01`)**: 100% offline-ready by default. All communication operates over local standard input/output (stdio) JSON-RPC without telemetry, analytics, or background open listening ports. Outbound network egress occurs strictly via explicit client calls to `fc_web_fetch`.
2. **Safe Deletion & Trash Protection (`INV-SAFE-02`)**: Deletions are safeguarded against catastrophic permanent data loss. `fc_safe_delete` and global safety mode (`fc_set_safe_mode`) route removals to the operating system Recycle Bin (Windows) or Trash (macOS/Linux).
3. **Cloud-Lock Resilient Move (`INV-LOCK-03`)**: Resilient cross-device file moves. `fc_move` automatically executes copy + SHA-256 integrity verification + source unlink fallback when cloud-sync filters (OneDrive, Dropbox, iCloud) cause EPERM/EBUSY locking.
4. **Cloud-Lock Diagnosis (`INV-DIAG-04`)**: Read-only static path inspection and reparse point detection via `fc_check_cloud_lock` without mutating local filesystem state.
5. **Bounded Multi-File Content Search (`INV-SRCH-05`)**: Bounded search execution via `fc_search_content` strictly capped at 50 explicit files, 10 MB per file, max 200 matches, and 200k characters without unconstrained recursive glob explosions.
6. **Automated Secret & Token Redaction (`INV-MASK-06`)**: Automatic in-flight detection and masking of API keys, bearer tokens, AWS credentials, and authorization headers in search output snippets.
7. **Bounded Inline Preview & Safe Open (`INV-PREV-07`)**: Metadata-first remote inspection via `fc_preview_file` with an explicit 1 MiB inline content boundary; shell-safe operating system default application launching via `fc_open_path`.
8. **Interactive REPL & Session Isolation (`INV-REPL-08`)**: Stateful interactive sessions (`fc_start_session`, `fc_send_input`, `fc_read_output`) employ bounded circular ring buffers to prevent memory exhaustion and zombie process leaks.
9. **Unprivileged Non-Elevation Execution (`INV-PROC-09`)**: Operates strictly in standard user mode (`RunAsInvoker`). Zero administrative elevation, root rights, or UAC prompts are required.
10. **Security Response SLA (`INV-SLA-10`)**: Binding 48-hour initial response SLA, 5-business-day triage assessment, and 30-calendar-day remediation window via `security@open-bricks.org` and `security@ellmos.ai`.

### 2. Plan D Local Development Workflow

In accordance with our cross-system architecture (Plan D), the local git repository at `C:\_Local_DEV\repos\ellmos-filecommander-mcp` serves as the authoritative **Source of Truth**. Development, testing, and commits must take place exclusively in the canonical local clone. Cloud mirrors (e.g., OneDrive) serve solely as gitless read projections.

```bash
# Clone the canonical repository
git clone https://github.com/ellmos-ai/ellmos-filecommander-mcp.git C:\_Local_DEV\repos\ellmos-filecommander-mcp
cd C:\_Local_DEV\repos\ellmos-filecommander-mcp

# Install pinned dependencies
npm install

# Compile TypeScript
npm run build

# Run unit tests and contract test suites
npm test
```

### 3. Version Freeze Discipline (`T-20260920-167562623`)

ellmos-filecommander-mcp operates under strict version-freeze discipline. Version identifiers (`1.11.5` across `package.json`, `package-lock.json`, `server.json`, `glama.json`, and `src/index.ts`) must not be arbitrarily incremented. All improvements, bug fixes, and hygiene adjustments are documented under `## [Unreleased]` in `CHANGELOG.md`.

### 4. Quality Gates

Before submitting a pull request, verify all local quality gates:
1. `npm test`: 100% green test execution across all Vitest suites and standalone i18n checks (305+ tests).
2. `npm run build`: Zero TypeScript compilation errors.
3. `git diff --check`: Zero whitespace or line-ending anomalies.
4. `git diff -G'"version": '`: Zero unauthorized version bumps.
5. Zero new lint or supply-chain vulnerability regressions.

### 5. Statutory Notice (§ 521 BGB) & Liability Disclaimer

This software is provided free of charge as open-source software under the MIT License. In accordance with statutory German law (§ 521 BGB - Gefälligkeitsrecht), liability for defects in quality and title is strictly limited to intentional misconduct (*Vorsatz*) and gross negligence (*grobe Fahrlässigkeit*).

---

<a id="deutsch"></a>
## Deutsch

Vielen Dank für dein Interesse an einer Mitwirkung bei **ellmos-filecommander-mcp** (`ellmos-ai/ellmos-filecommander-mcp`), einem praxiserprobten 50-Tool Model Context Protocol (MCP) Server für Dateisystemverwaltung, begrenzte Mehrdatei-Inhaltssuche, Standard-App-Pfadöffnung, Prozesssteuerung, interaktive REPL-Sitzungen und Formatkonvertierung über lokalen stdio-Transport.

### 1. Architektur-Prinzipien & 10 Governance-Invarianten

Alle Beiträge müssen unsere verbindlichen Kern-Invarianten strikt einhalten:

1. **Lokales Stdio & Expliziter Egress (`INV-LOCAL-01`)**: Standardmäßig zu 100% offline-fähig. Die gesamte Kommunikation erfolgt über lokalen Standard-I/O (stdio) JSON-RPC ohne Telemetrie, Analyse-Tracker oder offene Netzwerk-Ports. Ausgehender Netzwerkverkehr findet ausschließlich über explizite Client-Aufrufe von `fc_web_fetch` statt.
2. **Sicheres Löschen & Papierkorb-Schutz (`INV-SAFE-02`)**: Schutz vor katastrophalem permanentem Datenverlust. `fc_safe_delete` und der globale Sicherheitsmodus (`fc_set_safe_mode`) leiten Löschungen in den Betriebssystem-Papierkorb (Recycle Bin / Trash).
3. **Cloud-Lock-robuste Verschiebung (`INV-LOCK-03`)**: Robuste geräteübergreifende Dateiübertragung. `fc_move` führt automatisch Kopieren + SHA-256-Integritätsprüfung + Quell-Löschung aus, wenn Cloud-Synchronisationsfilter (OneDrive, Dropbox, iCloud) EPERM/EBUSY-Sperren verursachen.
4. **Cloud-Lock-Diagnose (`INV-DIAG-04`)**: Rein lesende statische Pfadprüfung und Reparse-Point-Erkennung via `fc_check_cloud_lock` ohne Veränderung des lokalen Dateisystemzustands.
5. **Begrenzte Mehrdatei-Inhaltssuche (`INV-SRCH-05`)**: Begrenzte Suchausführung über `fc_search_content`, strikt limitiert auf maximal 50 explizite Dateien, 10 MB pro Datei, 200 Treffer und 200.000 Zeichen ohne unkontrollierte rekursive Glob-Explosionen.
6. **Automatische Geheimnis- & Token-Schwärzung (`INV-MASK-06`)**: Automatische Erkennung und Schwärzung von API-Schlüsseln, Bearer-Tokens, AWS-Zugangsdaten und Authorization-Headern in den Suchergebnissen.
7. **Begrenzte Inline-Vorschau & Sicheres Öffnen (`INV-PREV-07`)**: Metadaten-zentrierte Inspektion via `fc_preview_file` mit strikter 1-MiB-Inline-Grenze; sicheres Starten der Standardanwendung über `fc_open_path`.
8. **Interaktive REPL & Sitzungs-Isolation (`INV-REPL-08`)**: Stateful interaktive Sitzungen (`fc_start_session`, `fc_send_input`, `fc_read_output`) nutzen begrenzte Ringpuffer zur Vermeidung von Speichererschöpfung und Prozesslecks.
9. **Unprivilegierter Non-Elevation-Betrieb (`INV-PROC-09`)**: Betrieb ausschließlich im Standard-Benutzermodus (`RunAsInvoker`). Es sind keinerlei Administratorrechte, Root-Rechte oder UAC-Prompts erforderlich.
10. **Sicherheits-Response SLA (`INV-SLA-10`)**: Verbindliche 48-Stunden-Erstantwortgarantie, 5-Werktage-Triage-Bewertung und 30-Kalendertage-Behebungsfenster über `security@open-bricks.org` und `security@ellmos.ai`.

### 2. Plan D Lokaler Entwicklungsworkflow

Gemäß unserer systemweiten Architektur (Plan D) bildet das lokale Repository unter `C:\_Local_DEV\repos\ellmos-filecommander-mcp` die alleinige maßgebliche **Source of Truth**. Entwicklung, Tests und Commits finden ausschließlich im kanonischen lokalen Klon statt. Cloud-Spiegel (z. B. OneDrive) dienen rein als gitlose Leseprojektionen.

```bash
# Kanonischen Klon verwenden
git clone https://github.com/ellmos-ai/ellmos-filecommander-mcp.git C:\_Local_DEV\repos\ellmos-filecommander-mcp
cd C:\_Local_DEV\repos\ellmos-filecommander-mcp

# Abhängigkeiten installieren
npm install

# TypeScript kompilieren
npm run build

# Tests ausführen
npm test
```

### 3. Version-Freeze-Disziplin (`T-20260920-167562623`)

ellmos-filecommander-mcp unterliegt strikter Version-Freeze-Disziplin. Die Versionskennung (`1.11.5` in `package.json`, `package-lock.json`, `server.json`, `glama.json` und `src/index.ts`) darf nicht eigenmächtig erhöht werden. Sämtliche Verbesserungen, Fehlerbehebungen und Hygiene-Anpassungen werden unter `## [Unreleased]` in `CHANGELOG.md` dokumentiert.

### 4. Qualitäts-Tore

Vor dem Einreichen eines Pull Requests müssen alle lokalen Qualitäts-Tore erfüllt sein:
1. `npm test`: 100% grüne Testergebnisse über alle Vitest-Suiten und Standalone-i18n-Prüfungen (305+ Tests).
2. `npm run build`: 0 TypeScript-Kompilierungsfehler.
3. `git diff --check`: 0 Whitespace- oder Zeilenumbruchfehler.
4. `git diff -G'"version": '`: 0 unautorisierte Versionsänderungen.
5. 0 neue Lint- oder Supply-Chain-Sicherheitswarnungen.

### 5. Gesetzlicher Hinweis (§ 521 BGB) & Haftungsausschluss

Diese Software wird unentgeltlich als Open-Source-Software unter der MIT-Lizenz bereitgestellt. Gemäß § 521 BGB (Gefälligkeitsrecht) ist die Haftung für Sach- und Rechtsmängel auf Vorsatz und grobe Fahrlässigkeit beschränkt.
