# Direct ChatGPT access / Direkter ChatGPT-Zugriff

[English](#english) · [Deutsch](#deutsch) · [PowerShell commands](#powershell)

## English

FileCommander's existing stdio MCP server can run behind OpenAI's **Secure MCP Tunnel**. The official client starts FileCommander and relays requests over outbound HTTPS. No public listener, additional HTTP server, or browser extension is needed for this route. The [browser bridge](bridge.md) is a separate option; its local UI port is not an MCP endpoint. [1]

You need a Platform tunnel associated with the owning organization and intended ChatGPT workspace, a runtime key with **Tunnels Read + Use**, and permission to add custom MCP plugins in that workspace. Tunnel administration requires Read + Manage. Availability must be checked for your account. [1][2]

Download the **full** client from [official releases](https://github.com/openai/tunnel-client/releases/latest), not a runtime-only variant: the latter omits setup commands. [3] Create or inspect the tunnel in [Platform settings](https://platform.openai.com/settings/organization/tunnels). Use `CONTROL_PLANE_API_KEY` for the running client; an admin key is for administration, not the daemon. Keep keys out of chat and Git. [4]

Use the shared PowerShell example below, replacing the FileCommander path. Forward slashes avoid Windows backslash escaping in the client's command parser; quote paths containing spaces. [5] Keep only one stdio client active per tunnel ID. [4]

In [ChatGPT Plugins](https://chatgpt.com/plugins), choose **Add custom MCP server → Tunnel**, select the tunnel, configure MCP authentication, create and install the plugin, then select it with `@` in the conversation. Confirm a harmless read-only FileCommander call; a successful local `doctor` check alone does not establish that the chat can call tools. [2]

Tunnel calls have a 120-second deadline. For longer work, use FileCommander sessions (`fc_start_session`, `fc_read_output`, `fc_send_input`) across separate calls. Tunnels support private connections; a public ChatGPT plugin requires a public HTTPS endpoint. Publishing these files on GitHub does not publish such a plugin: each operator connects their own machine. [1]

## Deutsch

Der vorhandene stdio-MCP-Server von FileCommander kann hinter einem **Secure MCP Tunnel** laufen. OpenAIs offizieller Client startet FileCommander und übermittelt Aufrufe über ausgehendes HTTPS. Dieser Weg benötigt weder einen öffentlichen Listener noch einen zusätzlichen HTTP-Server oder eine Browsererweiterung. Die [Browser-Bridge](bridge.md#deutsch) bleibt eine eigene Option; ihr UI-Port ist kein MCP-Endpunkt. [1]

Erforderlich sind ein der Organisation und ChatGPT-Workspace zugeordneter Platform-Tunnel, ein Runtime-Key mit **Tunnels Read + Use** und Zugriff auf benutzerdefinierte MCP-Plugins. Zur Tunnelverwaltung ist Read + Manage erforderlich. Prüfe die Verfügbarkeit im eigenen Konto. [1][2]

Lade den **vollständigen** Client aus den [offiziellen Releases](https://github.com/openai/tunnel-client/releases/latest); Runtime-Varianten enthalten keine Einrichtungskommandos. [3] Erstelle oder prüfe den Tunnel in den [Platform-Einstellungen](https://platform.openai.com/settings/organization/tunnels). Der laufende Client verwendet `CONTROL_PLANE_API_KEY`, keinen Admin-Key. Schlüssel gehören weder in den Chat noch ins Repository. [4]

Passe im folgenden Beispiel den FileCommander-Pfad an. Schrägstriche vermeiden das Windows-Backslash-Escaping des Argumentparsers; Pfade mit Leerzeichen benötigen Anführungszeichen. [5] Pro Tunnel-ID darf nur ein stdio-Client gleichzeitig laufen. [4]

Unter [ChatGPT Plugins](https://chatgpt.com/plugins) **Add custom MCP server → Tunnel** wählen, Tunnel auswählen, MCP-Authentifizierung konfigurieren, Plugin erstellen und installieren. Anschließend im Gespräch mit `@` auswählen und einen lesenden FileCommander-Aufruf prüfen. Ein erfolgreicher `doctor`-Check bestätigt allein noch keinen Werkzeugzugriff aus dem Chat. [2]

Ein Tunnel-Aufruf hat 120 Sekunden Zeit. Längere Arbeiten über FileCommander-Sitzungen starten und Ausgabe/Eingaben getrennt abrufen. Tunnel sind für private Verbindungen; ein öffentliches ChatGPT-Plugin benötigt einen öffentlichen HTTPS-Endpunkt. Diese GitHub-Anleitung veröffentlicht kein solches Plugin: Jeder Betreiber verbindet seinen eigenen Rechner. [1]

## PowerShell

Run from the folder containing `tunnel-client.exe`; `node` must be on PATH. FileCommander must already be installed or built. / Im Ordner mit `tunnel-client.exe` ausführen; `node` muss im PATH liegen. FileCommander muss bereits installiert oder gebaut sein.

```powershell
# Masked local input / Verdeckte lokale Eingabe
$fcTunnelSecret = Read-Host "Runtime API key" -AsSecureString
$env:CONTROL_PLANE_API_KEY = [System.Net.NetworkCredential]::new("", $fcTunnelSecret).Password
$fcTunnelSecret.Dispose()
Remove-Variable fcTunnelSecret
$env:CONTROL_PLANE_TUNNEL_ID = Read-Host "Tunnel ID"

# Replace this example path / Diesen Beispielpfad ersetzen
.\tunnel-client.exe init --sample sample_mcp_stdio_local --profile filecommander --tunnel-id $env:CONTROL_PLANE_TUNNEL_ID --mcp-command 'node "C:/Tools/filecommander/node_modules/ellmos-filecommander-mcp/dist/index.js"'

.\tunnel-client.exe doctor --profile filecommander --explain
.\tunnel-client.exe run --profile filecommander
```

The profile setup is one-time. For later sessions, supply the runtime key locally and run the saved profile. Stop the client with Ctrl+C. / Das Profil wird einmalig eingerichtet. Später den Runtime-Key lokal bereitstellen und das gespeicherte Profil starten. Beenden mit Strg+C.

## Official references / Offizielle Quellen

1. [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels.md)
2. [Custom MCP servers in ChatGPT](https://developers.openai.com/api/docs/guides/custom-mcp-server.md)
3. [OpenAI tunnel-client: full and runtime variants](https://github.com/openai/tunnel-client/blob/master/README.md)
4. [OpenAI tunnel-client configuration](https://github.com/openai/tunnel-client/blob/master/docs/configuration.md)
5. [Command parser: parseCommandArgv](https://github.com/openai/tunnel-client/blob/master/pkg/runtimeconfig/config.go)
