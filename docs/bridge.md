# FileCommander browser bridge / Browser-Bridge

[English](#english) · [Deutsch](#deutsch)

## English

The optional browser bridge gives a local browser access to the same FileCommander filesystem and process tools used by MCP clients. It starts one persistent stdio server from the same installed package. There is no second FileCommander installation, Cowork dependency, separate desktop companion, or required browser extension for manual use.

The default command still starts the ordinary stdio MCP server. Only the explicit `bridge` subcommand opens a local HTTP listener. Its HTTP API serves the browser UI; it is **not an HTTP MCP endpoint**.

### Start from source

This feature is unreleased and is not present in the published `1.11.6` npm package. Use a source checkout containing the bridge changes, with Node.js 20 or later:

```bash
npm ci
npm run build
npm run bridge -- --cwd "."
```

The terminal prints a complete local connection link and opens it in the default browser. Keep that terminal running. If the browser does not open, copy the complete link from the terminal into a local browser. The fragment token belongs to this running bridge; do not share it publicly.

The equivalent direct command after building is:

```bash
node dist/index.js bridge --cwd "."
```

| Option | Behavior |
|--------|----------|
| `--cwd <directory>` | Set the backend's initial working directory. Relative paths are resolved from the command's working directory. This is not a filesystem sandbox. |
| `--port <number>` | Use a local port; default `47832`. `--port 0` requests a free port from the operating system. |
| `--no-open` | Print the connection link without opening a browser automatically. |

For example, use `node dist/index.js bridge --no-open --port 0` if the default port is occupied. The host always remains `127.0.0.1`; there is no option to bind to a LAN or public interface. Do not expose this UI through a port forward or reverse proxy.

### Use tools and console sessions

Select a tool, edit its JSON arguments, and submit the job. Tool schemas and descriptions come from the running FileCommander. File and process actions run with the permissions of the account that started it. The initial UI is German; FileCommander tool response language is separately controlled by its existing `FC_LANGUAGE`/language tools.

Use `fc_execute_command` for a single command. For a process that must remain alive across calls, use `fc_start_session`, then `fc_send_input` and `fc_read_output`; finish with `fc_close_session`. These are subprocess stdin/stdout sessions, not a terminal emulator or PTY, and they do not attach to an already-open console window. Programs that require terminal cursor control or a TTY may need a different interface.

Browser refreshes preserve the server process, jobs, and process sessions while the bridge remains running. Restarting the FileCommander backend ends its active sessions. Restarting the bridge creates a new connection token and clears in-memory history. Stop it with Ctrl+C or the page's shutdown button. Process tools that deliberately launch detached background programs can leave those programs running; manage them explicitly with the process tools.

Jobs run asynchronously, so a long command does not serialize independent reads. The bridge does not automatically retry a timed-out command: it may still be running in the backend. Inspect its state before issuing another command with side effects. Reuse of a recorded request ID is deduplicated; an expired ID is rejected instead of silently executing again.

### Local access boundary and limits

The browser exchanges the random 256-bit start token for an `HttpOnly`, `SameSite=Strict` cookie valid for eight hours. Requests require the exact loopback Host; mutations also require the exact local Origin and a session-bound CSRF token. Cross-site and foreign-origin requests are rejected. This protects local browser access; it does not sandbox shell commands or replace approval rules in an assistant client.

Requests are capped at 4 MiB, results larger than 8 MiB are reduced to a preview, and at most 16 jobs may run concurrently. Completed history is pruned against 80 jobs and a 32 MiB retention budget. Large text is displayed in pages. Retrieve important results before they leave the in-memory history, and read large files in bounded sections. These limits are resource bounds, not a metered call quota.

The bridge sends no telemetry and creates no public relay. Explicit FileCommander calls can still access the network, including `fc_web_fetch` and network-capable commands. See [SECURITY.md](../SECURITY.md) for the complete capability boundary.

### Connect an assistant

The local UI does not automatically add tools to an assistant. An assistant can operate it through an available, authorized browser connection. Native tool access from ChatGPT instead uses the existing stdio server behind OpenAI's official tunnel client; see [direct ChatGPT setup](chatgpt-tunnel.md#english). That route does not require the browser bridge and must not point the tunnel at this UI's HTTP port.

### Develop and verify

Edit source files, run `npm run build`, and restart the bridge to use the new build. Backend restart alone does not reload bridge/UI source. Package upgrades may replace installed files; keep development in a source checkout under version control.

```bash
npm run build
npm test
npm pack --dry-run
```

The default test command includes the bridge's real-backend integration and lifecycle checks. The bridge adds no package-version bump or automatic npm release.

## Deutsch

Die optionale Browser-Bridge gibt einem lokalen Browser Zugriff auf dieselben Datei- und Prozesswerkzeuge wie einem MCP-Client. Sie startet einen fortlaufenden stdio-Server aus demselben installierten Paket. Dafür sind keine zweite FileCommander-Installation, keine Cowork-Abhängigkeit, kein zusätzlicher Desktop-Companion und zur manuellen Bedienung keine Browsererweiterung erforderlich.

Der Standardbefehl startet weiterhin den gewöhnlichen stdio-MCP-Server. Nur der ausdrückliche Unterbefehl `bridge` öffnet einen lokalen HTTP-Listener. Seine HTTP-API bedient die Browseroberfläche; sie ist **kein HTTP-MCP-Endpunkt**.

### Aus dem Quellcode starten

Diese Funktion ist noch nicht veröffentlicht und fehlt im veröffentlichten npm-Paket `1.11.6`. Verwende einen Quellcode-Checkout mit den Bridge-Änderungen und Node.js ab Version 20:

```bash
npm ci
npm run build
npm run bridge -- --cwd "."
```

Das Terminal gibt einen vollständigen lokalen Verbindungslink aus und öffnet ihn im Standardbrowser. Lass dieses Terminal laufen. Öffnet sich der Browser nicht, kopiere den vollständigen Link aus dem Terminal in einen lokalen Browser. Der Token im Link-Fragment gilt für diese laufende Bridge; teile ihn nicht öffentlich.

Der entsprechende direkte Befehl nach dem Build lautet:

```bash
node dist/index.js bridge --cwd "."
```

| Option | Verhalten |
|--------|-----------|
| `--cwd <Ordner>` | Legt den anfänglichen Arbeitsordner des Backends fest. Relative Pfade werden vom Arbeitsordner des Startbefehls aufgelöst. Das ist keine Dateisystem-Sandbox. |
| `--port <Nummer>` | Wählt den lokalen Port; Standard `47832`. Mit `--port 0` vergibt das Betriebssystem einen freien Port. |
| `--no-open` | Gibt den Verbindungslink aus, ohne automatisch einen Browser zu öffnen. |

Ist der Standardport belegt, verwende beispielsweise `node dist/index.js bridge --no-open --port 0`. Der Host bleibt immer `127.0.0.1`; eine Bindung an LAN- oder öffentliche Schnittstellen ist nicht vorgesehen. Stelle diese Bedienseite nicht über Portweiterleitungen oder Reverse-Proxys bereit.

### Werkzeuge und Konsolensitzungen verwenden

Wähle ein Werkzeug, bearbeite seine JSON-Parameter und führe den Auftrag aus. Schemata und Beschreibungen stammen vom laufenden FileCommander. Datei- und Prozessaktionen laufen mit den Rechten des startenden Benutzerkontos. Die erste Oberfläche ist deutsch; die Sprache der FileCommander-Antworten wird getrennt über die vorhandenen `FC_LANGUAGE`-/Sprachwerkzeuge gesteuert.

Für einen einzelnen Befehl dient `fc_execute_command`. Soll ein Prozess über mehrere Aufrufe bestehen bleiben, nutze `fc_start_session`, anschließend `fc_send_input` und `fc_read_output` und zum Abschluss `fc_close_session`. Diese Sitzungen verwenden stdin/stdout von Unterprozessen. Sie sind kein Terminalemulator oder PTY und verbinden sich nicht mit einem bereits geöffneten Konsolenfenster. Programme, die eine TTY oder Terminal-Cursorsteuerung voraussetzen, benötigen gegebenenfalls eine andere Schnittstelle.

Beim Neuladen der Browserseite bleiben Serverprozess, Aufträge und Prozesssitzungen erhalten, solange die Bridge läuft. Ein FileCommander-Backend-Neustart beendet dessen aktive Sitzungen. Ein Bridge-Neustart erzeugt einen neuen Verbindungstoken und leert den Verlauf im Arbeitsspeicher. Beende die Bridge mit Strg+C oder dem Beenden-Knopf der Seite. Prozesswerkzeuge, die ausdrücklich abgekoppelte Hintergrundprogramme starten, können diese weiterlaufen lassen; verwalte solche Programme gezielt über die Prozesswerkzeuge.

Aufträge laufen asynchron. Ein langer Befehl blockiert dadurch keine unabhängigen Leseaufrufe. Die Bridge wiederholt einen Befehl nach einem Zeitlimit nicht automatisch: Er kann im Backend noch laufen. Prüfe seinen Zustand vor einem weiteren Aufruf mit Nebenwirkungen. Wiederverwendete, bereits erfasste Auftrags-IDs werden dedupliziert; abgelaufene IDs werden abgelehnt, statt den Auftrag stillschweigend erneut auszuführen.

### Lokale Zugriffsgrenze und Limits

Der Browser tauscht den zufälligen 256-Bit-Starttoken gegen ein acht Stunden gültiges Cookie mit `HttpOnly` und `SameSite=Strict`. Anfragen benötigen den exakten Loopback-Host; Änderungen zusätzlich die exakte lokale Origin und einen an die Sitzung gebundenen CSRF-Token. Cross-Site-Anfragen und fremde Origins werden abgelehnt. Das schützt den lokalen Browserzugang, begrenzt aber keine Shell-Befehle und ersetzt keine Freigaberegeln des Assistenten.

Anfragen sind auf 4 MiB begrenzt, Ergebnisse über 8 MiB werden auf eine Vorschau reduziert, und maximal 16 Aufträge laufen gleichzeitig. Abgeschlossener Verlauf wird anhand von 80 Aufträgen und einem Speicherbudget von 32 MiB bereinigt. Lange Texte erscheinen seitenweise. Sichere wichtige Ergebnisse, bevor sie aus dem Verlauf verschwinden, und lies große Dateien in begrenzten Abschnitten. Diese Grenzen betreffen Ressourcen und sind kein gezähltes Aufrufkontingent.

Die Bridge sendet keine Telemetrie und erzeugt kein öffentliches Relay. Ausdrückliche FileCommander-Aufrufe können weiterhin das Netzwerk nutzen, etwa `fc_web_fetch` und netzwerkfähige Befehle. Die vollständige Schutzgrenze steht in [SECURITY.md](../SECURITY.md).

### Einen Assistenten verbinden

Die lokale Bedienseite fügt einem Assistenten nicht automatisch Werkzeuge hinzu. Ein Assistent kann sie über eine verfügbare, autorisierte Browserverbindung bedienen. Für native Werkzeugaufrufe aus ChatGPT wird stattdessen der bestehende stdio-Server über OpenAIs offiziellen Tunnel-Client angebunden; siehe [direkte ChatGPT-Einrichtung](chatgpt-tunnel.md#deutsch). Dieser Weg benötigt die Browser-Bridge nicht. Richte den Tunnel nicht auf deren HTTP-Port.

### Entwickeln und prüfen

Bearbeite die Quelldateien, führe `npm run build` aus und starte die Bridge neu. Ein reiner Backend-Neustart lädt Bridge- und UI-Quellen nicht neu. Paketupdates können installierte Dateien ersetzen; entwickle deshalb in einem Quellcode-Checkout unter Versionskontrolle.

```bash
npm run build
npm test
npm pack --dry-run
```

Der Standard-Testbefehl enthält die Bridge-Integrations- und Lebenszyklustests mit echtem Backend. Die Bridge erhöht keine Paketversion und veröffentlicht kein npm-Release automatisch.
