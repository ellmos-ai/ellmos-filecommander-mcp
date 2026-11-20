# Security Policy / Sicherheitsrichtlinie

[English](#english) | [Deutsch](#deutsch)

---

<a name="english"></a>
## English: Security Policy

### Important Security Notice

**This MCP server runs with the local permissions of the operating system user invoking it.**

By design, `ellmos-filecommander-mcp` provides AI assistants and MCP clients with powerful local filesystem and process management capabilities. Its default MCP transport is **Local-First** stdio, emits no telemetry, and runs in unprivileged standard user mode. The explicitly selected `bridge` mode adds an authenticated local browser UI, as described below. It is not an absolute zero-egress system: `fc_web_fetch` performs outbound HTTP(S) access when explicitly invoked.

### Tool Risk Classification

| Tool | Risk Level | Description & Mitigation |
|------|------------|--------------------------|
| `fc_execute_command` | **Critical** | Executes shell commands in the user environment. Client approval gates recommended. |
| `fc_start_session` / `fc_send_input` | **Critical** | Starts and controls arbitrary interactive commands. Client approval gates recommended. |
| `fc_start_process` | **High** | Spawns background processes. Monitored via process table. |
| `fc_open_path` | **Medium** | Invokes the OS-associated application for a validated existing local path. The fixed launcher does not interpolate the target into a shell command, but the associated application runs with user permissions. |
| `fc_preview_file` | **Low** | Read-only, metadata-first preview. Content requires explicit `include_content=true`; unsupported files and files above the fixed 1 MiB limit are never read or Base64-encoded inline. |
| `fc_kill_process` | **High** | Terminates processes by PID. Restricted to user-accessible processes. |
| `fc_delete_file` | **High** | Permanent file deletion (bypasses recycle bin unless Safety Mode is active). |
| `fc_delete_directory` | **High** | Recursive directory deletion. |
| `fc_safe_delete` | **Medium** | Safe deletion: routes items to OS Recycle Bin (Windows) or Trash (macOS/Linux). |
| `fc_write_file` / `fc_edit_file` | **Medium** | Atomic/in-place file write and modification within user permissions. |
| `fc_check_cloud_lock` | **Low** | Read-only detection of cloud synchronization locks (OneDrive, Dropbox, iCloud). |
| `fc_search_content` | **Low** | Bounded, read-only search across max 50 explicit files with automatic secret redaction. |
| `fc_checksum` | **Low** | Read-only SHA-256, SHA-512, MD5 hash calculation. |
| `fc_web_fetch` | **Medium** | Explicit outbound access to HTTP(S) targets. Private and loopback targets are blocked unless `allow_private` is explicitly enabled. |

### Core Safety Mechanisms

1. **Safety Mode (`fc_set_safe_mode`)**: When enabled, `fc_delete_file` and `fc_delete_directory` are redirected to `fc_safe_delete` (OS Recycle Bin / Trash). Safe mode does not sandbox `fc_execute_command`, `fc_start_session`, `fc_send_input`, or other process tools.
2. **Cloud-Lock Safe Operations**: Detects and mitigates cloud sync-filter file locking (e.g. OneDrive reparse points) with automatic fallback strategies.
3. **Secret Redaction**: Content search tools (`fc_search_content`) automatically identify and redact common API keys, tokens, and authorization credentials in preview output.
4. **Transport Isolation**: Default operation uses standard input/output (`stdio`) without listening ports or HTTP endpoints. Explicit `bridge` mode binds only to `127.0.0.1` and protects its UI API with the controls below. It is not an HTTP MCP transport.
5. **Non-Elevation**: Designed to run as an unprivileged standard user process. Never requires administrative or root privileges.
6. **Explicit outbound access**: The default MCP server and browser bridge emit no telemetry and make no automatic external network requests. `fc_web_fetch` performs an outbound request only when called by a client. Process tools can run network-capable programs and are not network sandboxes. An operator-configured external MCP tunnel has its own outbound connection and credentials.
7. **Bounded inline preview**: `fc_preview_file` resolves a regular file and reports MIME/size metadata before content. Explicit content requests use standard MCP content blocks and are rejected before reading when the file exceeds 1 MiB or its media type is unsupported.

### Optional Browser Bridge

`ellmos-filecommander bridge` explicitly enables a local HTTP UI with the same user-level filesystem and process capabilities. It does not bind to LAN interfaces, expose a public endpoint, or install a browser extension.

- A fresh 256-bit capability token is printed in the URL fragment for each bridge process. The browser exchanges it for an `HttpOnly`, `SameSite=Strict` session cookie; the session expires after eight hours. Keep the complete start link private.
- Requests must use the exact `127.0.0.1:<port>` Host. Mutations require the exact local Origin and a session-bound CSRF token. Foreign origins and cross-site requests are rejected; frames are blocked by CSP and `X-Frame-Options`.
- Requests are limited to 4 MiB, individual results above 8 MiB are truncated, concurrent jobs are capped at 16, and completed history is pruned against 80 jobs and a 32 MiB retention budget. Retrying a recorded request ID cannot silently repeat the same mutation; expired IDs require state inspection.
- This is a local browser access boundary, not an operating-system sandbox or a substitute for client approvals. Anyone controlling the authenticated local session can invoke the exposed tools. Do not forward this UI port or use it as the endpoint for an MCP tunnel.

See the [bridge guide](docs/bridge.md#english) for lifecycle and session limits and the separate [ChatGPT tunnel guide](docs/chatgpt-tunnel.md#english) for native MCP access.

### Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:
- **Email**: [security@open-bricks.org](mailto:security@open-bricks.org) (Umbrella Security), [security@ellmos.ai](mailto:security@ellmos.ai), [support@lukasgeiger.com](mailto:support@lukasgeiger.com), or [lukas@open-bricks.org](mailto:lukas@open-bricks.org)
- **GitHub**: [GitHub Security Advisories](https://github.com/ellmos-ai/ellmos-filecommander-mcp/security/advisories)

We commit to a binding initial response SLA within 48 hours and a formal triage assessment within 5 business days. Confirmed critical and high-severity security vulnerabilities are patched and released within a 30-calendar-day remediation window.

### Supported Versions

| Version | Supported |
|---------|-----------|
| 1.11.x  | :white_check_mark: Yes |
| < 1.11  | :x: No (Please upgrade) |

---

<a name="deutsch"></a>
## Deutsch: Sicherheitsrichtlinie

### Wichtiger Sicherheitshinweis

**Dieser MCP-Server arbeitet mit den Berechtigungen des lokalen Betriebssystem-Benutzers.**

`ellmos-filecommander-mcp` stellt KI-Assistenten und MCP-Clients erweiterte Dateisystem- und Prozessverwaltungsfunktionen bereit. Sein standardmäßiger MCP-Transport arbeitet **Local-First** über stdio, übermittelt keine Telemetrie und läuft im unprivilegierten Standard-Benutzerkontext. Der ausdrücklich gewählte `bridge`-Modus ergänzt eine authentifizierte lokale Browserseite; die Schutzgrenze steht unten. Das System ist nicht vollständig egressfrei: `fc_web_fetch` führt nach einem ausdrücklichen Aufruf ausgehende HTTP(S)-Zugriffe aus.

### Risikoklassifizierung der Werkzeuge

| Werkzeug | Risikostufe | Beschreibung & Schutzmaßnahmen |
|----------|-------------|--------------------------------|
| `fc_execute_command` | **Kritisch** | Führt Shell-Befehle aus. Bestätigungsdialoge im MCP-Client empfohlen. |
| `fc_start_session` / `fc_send_input` | **Kritisch** | Startet und steuert beliebige interaktive Befehle. Bestätigungsdialoge im MCP-Client empfohlen. |
| `fc_start_process` | **Hoch** | Startet Hintergrundprozesse mit Benutzerrechten. |
| `fc_open_path` | **Mittel** | Startet für einen geprüften vorhandenen lokalen Pfad die zugeordnete Betriebssystem-Anwendung. Der feste Launcher setzt den Zielpfad nicht in einen Shell-Befehl ein; die zugeordnete Anwendung läuft jedoch mit Benutzerrechten. |
| `fc_preview_file` | **Niedrig** | Nur lesende, metadatenbasierte Vorschau. Inhalt erfordert ausdrücklich `include_content=true`; nicht unterstützte Dateien und Dateien über dem festen 1-MiB-Limit werden nie inline gelesen oder Base64-kodiert. |
| `fc_kill_process` | **Hoch** | Beendet Prozesse anhand der PID. |
| `fc_delete_file` | **Hoch** | Dauerhaftes Löschen von Dateien (umgeht Papierkorb, außer Safety Mode ist aktiv). |
| `fc_delete_directory` | **Hoch** | Rekursives Löschen von Verzeichnissen. |
| `fc_safe_delete` | **Mittel** | Sicheres Löschen: Verschiebt Dateien in den Papierkorb (Windows/macOS/Linux). |
| `fc_write_file` / `fc_edit_file` | **Mittel** | Schreibzugriffe innerhalb der bestehenden Dateisystemberechtigungen. |
| `fc_check_cloud_lock` | **Niedrig** | Lese-Diagnose für Cloud-Synchronisationssperren (OneDrive, Dropbox, iCloud). |
| `fc_search_content` | **Niedrig** | Bounded Read-Only Suche über max. 50 explizite Dateien mit Geheimnis-Redaktionsfilter. |
| `fc_checksum` | **Niedrig** | Lese-Prüfsummenberechnung (SHA-256, SHA-512, MD5). |
| `fc_web_fetch` | **Mittel** | Expliziter ausgehender Zugriff auf HTTP(S)-Ziele. Private Ziele und Loopback-Adressen sind gesperrt, sofern `allow_private` nicht ausdrücklich aktiviert wird. |

### Zentrale Schutzfunktionen

1. **Sicherheitsmodus (`fc_set_safe_mode`)**: Leitet `fc_delete_file` und `fc_delete_directory` bei Aktivierung über den System-Papierkorb (`fc_safe_delete`). Der Sicherheitsmodus beschränkt `fc_execute_command`, `fc_start_session`, `fc_send_input` oder andere Prozesswerkzeuge nicht.
2. **Cloud-Lock-Resilienz**: Erkennt Cloud-Sync-Filter-Sperren (z. B. OneDrive Platzhalter) und greift auf sichere Ersatzroutinen zurück.
3. **Automatische Schwärzung von Geheimnissen**: `fc_search_content` maskiert bekannte API-Schlüssel, Tokens und Zugangsdaten in Suchergebnissen.
4. **Transport-Isolation**: Der Standardbetrieb kommuniziert über Standard-Ein-/Ausgabe (`stdio`) ohne offene Netzwerk-Ports oder HTTP-Endpunkte. Der ausdrücklich gestartete `bridge`-Modus bindet nur an `127.0.0.1` und schützt seine Bedien-API wie unten beschrieben. Er ist kein HTTP-MCP-Transport.
5. **Keine Rechteerweiterung (Non-Elevation)**: Vollständiger Verzicht auf Administrator-/Root-Berechtigungen.
6. **Expliziter ausgehender Zugriff**: Der standardmäßige MCP-Server und die Browser-Bridge senden keine Telemetrie und keine automatischen externen Netzwerkanfragen. `fc_web_fetch` sendet nur nach einem Client-Aufruf eine ausgehende Anfrage. Prozesswerkzeuge können netzwerkfähige Programme starten und sind keine Netzwerk-Sandbox. Ein separat eingerichteter externer MCP-Tunnel besitzt eine eigene ausgehende Verbindung und eigene Zugangsdaten.
7. **Begrenzte Inline-Vorschau**: `fc_preview_file` löst eine reguläre Datei auf und meldet zuerst MIME-/Größenmetadaten. Ausdrückliche Inhaltsnachforderungen verwenden Standard-MCP-Content-Blocks und werden vor dem Lesen abgewiesen, wenn die Datei größer als 1 MiB oder ihr Medientyp nicht unterstützt ist.

### Optionale Browser-Bridge

`ellmos-filecommander bridge` aktiviert ausdrücklich eine lokale HTTP-Bedienseite mit denselben Datei- und Prozessrechten des Benutzerkontos. Sie bindet nicht an LAN-Schnittstellen, stellt keinen öffentlichen Endpunkt bereit und installiert keine Browsererweiterung.

- Jeder Bridge-Prozess erzeugt einen zufälligen 256-Bit-Verbindungstoken im URL-Fragment. Der Browser tauscht ihn gegen ein Sitzungscookie mit `HttpOnly` und `SameSite=Strict`; die Sitzung läuft nach acht Stunden ab. Den vollständigen Startlink privat halten.
- Anfragen müssen den exakten Host `127.0.0.1:<port>` verwenden. Änderungen benötigen die exakte lokale Origin und einen an die Sitzung gebundenen CSRF-Token. Fremde Origins und Cross-Site-Anfragen werden abgelehnt; CSP und `X-Frame-Options` unterbinden Frames.
- Anfragen sind auf 4 MiB begrenzt; Einzelergebnisse über 8 MiB werden gekürzt. Maximal 16 Aufträge laufen gleichzeitig. Abgeschlossener Verlauf wird anhand von 80 Aufträgen und einem Speicherbudget von 32 MiB bereinigt. Ein bereits erfasster Auftragsbezeichner löst dieselbe Änderung bei Wiederholung nicht stillschweigend erneut aus; nach Ablauf zuerst den Zustand prüfen.
- Diese Grenze schützt den lokalen Browserzugang. Sie ist weder eine Betriebssystem-Sandbox noch ein Ersatz für Client-Freigaben. Wer eine authentifizierte lokale Sitzung kontrolliert, kann die Werkzeuge aufrufen. Den UI-Port nicht weiterleiten oder als MCP-Tunnel-Endpunkt verwenden.

Sitzungsverhalten und Grenzen stehen in der [Bridge-Anleitung](docs/bridge.md#deutsch); nativen MCP-Zugriff beschreibt die separate [ChatGPT-Tunnel-Anleitung](docs/chatgpt-tunnel.md#deutsch).

### Schwachstellen melden

Bitte melden Sie gefundene Sicherheitslücken direkt an:
- **E-Mail**: [security@open-bricks.org](mailto:security@open-bricks.org) (Dachorganisation Security), [security@ellmos.ai](mailto:security@ellmos.ai), [support@lukasgeiger.com](mailto:support@lukasgeiger.com) oder [lukas@open-bricks.org](mailto:lukas@open-bricks.org)
- **GitHub**: [GitHub Security Advisories](https://github.com/ellmos-ai/ellmos-filecommander-mcp/security/advisories)

Wir garantieren eine verbindliche Eingangsbestätigung (Initial Response SLA) innerhalb von 48 Stunden sowie eine strukturierte Triage-Rückmeldung innerhalb von 5 Werktagen. Bestätigte kritische und hochgradige Sicherheitslücken werden innerhalb einer Frist von 30 Kalendertagen behoben und bereitgestellt (30-Tage-Remediation-SLA).

### Unterstützte Versionen

| Version | Unterstützt |
|---------|-------------|
| 1.11.x  | :white_check_mark: Ja |
| < 1.11  | :x: Nein (Bitte aktualisieren) |
