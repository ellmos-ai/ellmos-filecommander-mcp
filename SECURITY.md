# Security Policy / Sicherheitsrichtlinie

[English](#english) | [Deutsch](#deutsch)

---

<a name="english"></a>
## English: Security Policy

### Important Security Notice

**This MCP server runs with the local permissions of the operating system user invoking it.**

By design, `ellmos-filecommander-mcp` provides AI assistants and MCP clients with powerful local filesystem and process management capabilities. It adheres strictly to **Local-First** and **Zero-Egress** principles: no telemetry, no cloud transmission of user data, and strictly unprivileged standard user-mode execution.

### Tool Risk Classification

| Tool | Risk Level | Description & Mitigation |
|------|------------|--------------------------|
| `fc_execute_command` | **Critical** | Executes shell commands in the user environment. Client approval gates recommended. |
| `fc_start_process` | **High** | Spawns background processes. Monitored via process table. |
| `fc_kill_process` | **High** | Terminates processes by PID. Restricted to user-accessible processes. |
| `fc_delete_file` | **High** | Permanent file deletion (bypasses recycle bin unless Safety Mode is active). |
| `fc_delete_directory` | **High** | Recursive directory deletion. |
| `fc_safe_delete` | **Medium** | Safe deletion: routes items to OS Recycle Bin (Windows) or Trash (macOS/Linux). |
| `fc_write_file` / `fc_edit_file` | **Medium** | Atomic/in-place file write and modification within user permissions. |
| `fc_check_cloud_lock` | **Low** | Read-only detection of cloud synchronization locks (OneDrive, Dropbox, iCloud). |
| `fc_search_content` | **Low** | Bounded, read-only search across max 50 explicit files with automatic secret redaction. |
| `fc_checksum` | **Low** | Read-only SHA-256, SHA-512, MD5 hash calculation. |

### Core Safety Mechanisms

1. **Safety Mode (`fc_set_safe_mode`)**: When enabled, all delete operations (`fc_delete_file`, `fc_delete_directory`) are automatically redirected to `fc_safe_delete` (OS Recycle Bin / Trash).
2. **Cloud-Lock Safe Operations**: Detects and mitigates cloud sync-filter file locking (e.g. OneDrive reparse points) with automatic fallback strategies.
3. **Secret Redaction**: Content search tools (`fc_search_content`) automatically identify and redact common API keys, tokens, and authorization credentials in preview output.
4. **Transport Isolation**: Operates exclusively over standard input/output (`stdio`). Does not bind to network ports or expose HTTP endpoints.
5. **Non-Elevation**: Designed to run as an unprivileged standard user process. Never requires administrative or root privileges.

### Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:
- **Email**: [security@ellmos.ai](mailto:security@ellmos.ai) or [support@lukasgeiger.com](mailto:support@lukasgeiger.com) / [lukas@open-bricks.org](mailto:lukas@open-bricks.org)
- **GitHub**: [GitHub Security Advisories](https://github.com/ellmos-ai/ellmos-filecommander-mcp/security/advisories)

We aim to respond to security reports within 24 hours and provide timely remediation.

### Supported Versions

| Version | Supported |
|---------|-----------|
| 1.10.x  | :white_check_mark: Yes |
| < 1.10  | :x: No (Please upgrade) |

---

<a name="deutsch"></a>
## Deutsch: Sicherheitsrichtlinie

### Wichtiger Sicherheitshinweis

**Dieser MCP-Server arbeitet mit den Berechtigungen des lokalen Betriebssystem-Benutzers.**

`ellmos-filecommander-mcp` stellt KI-Assistenten und MCP-Clients erweiterte Dateisystem- und Prozessverwaltungs-Funktionen bereit. Das Design folgt strikten **Local-First-** und **Zero-Egress-**Prinzipien: keine Telemetrie, keine Datenübertragung an externe Server und reiner Betrieb im unprivilegierten Standard-Benutzerkontext.

### Risikoklassifizierung der Werkzeuge

| Werkzeug | Risikostufe | Beschreibung & Schutzmaßnahmen |
|----------|-------------|--------------------------------|
| `fc_execute_command` | **Kritisch** | Führt Shell-Befehle aus. Bestätigungsdialoge im MCP-Client empfohlen. |
| `fc_start_process` | **Hoch** | Startet Hintergrundprozesse mit Benutzerrechten. |
| `fc_kill_process` | **Hoch** | Beendet Prozesse anhand der PID. |
| `fc_delete_file` | **Hoch** | Dauerhaftes Löschen von Dateien (umgeht Papierkorb, außer Safety Mode ist aktiv). |
| `fc_delete_directory` | **Hoch** | Rekursives Löschen von Verzeichnissen. |
| `fc_safe_delete` | **Mittel** | Sicheres Löschen: Verschiebt Dateien in den Papierkorb (Windows/macOS/Linux). |
| `fc_write_file` / `fc_edit_file` | **Mittel** | Schreibzugriffe innerhalb der bestehenden Dateisystemberechtigungen. |
| `fc_check_cloud_lock` | **Niedrig** | Lese-Diagnose für Cloud-Synchronisationssperren (OneDrive, Dropbox, iCloud). |
| `fc_search_content` | **Niedrig** | Bounded Read-Only Suche über max. 50 explizite Dateien mit Geheimnis-Redaktionsfilter. |
| `fc_checksum` | **Niedrig** | Lese-Prüfsummenberechnung (SHA-256, SHA-512, MD5). |

### Zentrale Schutzfunktionen

1. **Sicherheitsmodus (`fc_set_safe_mode`)**: Leitet bei Aktivierung alle Löschbefehle automatisch über den System-Papierkorb (`fc_safe_delete`).
2. **Cloud-Lock-Resilienz**: Erkennt Cloud-Sync-Filter-Sperren (z. B. OneDrive Platzhalter) und greift auf sichere Ersatzroutinen zurück.
3. **Automatische Schwärzung von Geheimnissen**: `fc_search_content` maskiert bekannte API-Schlüssel, Tokens und Zugangsdaten in Suchergebnissen.
4. **Transport-Isolation**: Ausschließliche Kommunikation über Standard-Ein-/Ausgabe (`stdio`). Keine Netzwerk-Ports, keine offenen Sockets.
5. **Keine Rechteerweiterung (Non-Elevation)**: Vollständiger Verzicht auf Administrator-/Root-Berechtigungen.

### Schwachstellen melden

Bitte melden Sie gefundene Sicherheitslücken direkt an:
- **E-Mail**: [security@ellmos.ai](mailto:security@ellmos.ai) oder [support@lukasgeiger.com](mailto:support@lukasgeiger.com) / [lukas@open-bricks.org](mailto:lukas@open-bricks.org)
- **GitHub**: [GitHub Security Advisories](https://github.com/ellmos-ai/ellmos-filecommander-mcp/security/advisories)

### Unterstützte Versionen

| Version | Unterstützt |
|---------|-------------|
| 1.10.x  | :white_check_mark: Ja |
| < 1.10  | :x: Nein (Bitte aktualisieren) |
