# Erfragte Berechtigungen

Für eine allgemeine Erklärung von Add-on-Berechtigungen siehe [diesen Support-Artikel](https://support.mozilla.org/de/kb/berechtigungsdialoge-der-firefox-erweiterungen).

## Berechtigungen bei Installation

Zurzeit werden bei Installation des Add-ons oder beim Update folgende Berechtigungen abgefragt:

| Interne ID   | Berechtigung                               | Erklärung                          |
|:-------------|:-------------------------------------------|:-----------------------------------|
| `<all_urls>` | Auf Ihre Daten für alle Websites zugreifen | Benötigt für Eingabe-Autokorrektur |
| `tabs`       | Auf Browsertabs zugreifen                  | Benötigt für Eingabe-Autokorrektur |

## Feature-spezifische (optionale) Berechtigungen

Diese Berechtigungen werden bei bestimmten Aktionen abgefragt, wenn sie dafür benötigt werden.

## Versteckte Berechtigungen

Zusätzlich verlangt dieses Add-on folgende Berechtigungen, welche in Firefox aber nicht abgefragt werden, da sie keine tiefgreifenden Berechtigungen sind.

| Interne ID       | Berechtigung                      | Erklärung                                                           |
|:-----------------|:----------------------------------|:--------------------------------------------------------------------|
| `storage`        | Zugriff auf Einstellungsspeicher  | Benötigt um Einstellungen abzuspeichern                             |
| `[context]menus` | Browser-Kontextmenüs modifizieren | Benötigt um Kontextmenüeinträge zur Texttransformation hinzuzufügen |
