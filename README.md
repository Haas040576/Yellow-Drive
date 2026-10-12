# Yellow-Drive – Website

Die aktuelle Website liegt in `index.html` und funktioniert ohne Build-Schritt, npm oder Framework.

## Einmalig auf dem Mac herunterladen

```bash
cd ~/Downloads
git clone https://github.com/Haas040576/Yellow-Drive.git yellow-drive-git
cd yellow-drive-git
python3 -m http.server 5174
```

Dann [http://localhost:5174](http://localhost:5174) öffnen.

## Spätere Updates

Im Terminal im Ordner `yellow-drive-git`:

```bash
git pull origin main
```

Browser danach mit `Cmd + Shift + R` neu laden. Wenn der Webserver nicht läuft, mit `python3 -m http.server 5174` starten. Laufenden Server mit `Ctrl + C` beenden.

## Hero-Video

Die lokale Seite verwendet zur Vorschau einen Full-HD-Fahrclip von Pexels ([Quelle](https://www.pexels.com/video/dramatic-highway-drive-at-sunset-30764435/)), der über eine externe URL geladen wird. Wenn der Clip nicht erreichbar ist, erscheint eine animierte Routenvisualisierung. Ein eigenes dreiteiliges Video kann in `assets/yellow-drive-journey.mp4` abgelegt werden (empfohlen: 16:9, H.264/MP4, 8–12 Sekunden, All-Intra) und hat Vorrang vor dem Stockclip.

Der Film läuft **nicht automatisch**. Im 12-Sekunden-Scrollablauf wechseln nur beim Scrollen die Standbilder. Die drei schlanken Hero-Titel erscheinen bei Anmeldung (Sekunde 0–4), Theorie (Sekunde 4–8) und Praxis (Sekunde 8–12). Es gibt keinen großen Glaskasten im Hero. Ist das Video kürzer als zwölf Sekunden, wird seine Gesamtlänge gleichmäßig auf die drei Stationen aufgeteilt. Das externe Standard-MP4 kann beim Spulen wegen der Videokompression gelegentlich verzögert reagieren; für möglichst flüssiges, bildgenaues Scrubbing ist ein selbst gehostetes All-Intra-MP4 ideal. Die Website enthält weiterhin alle Führerscheinklassen und Kontaktdaten.

## Vor einem öffentlichen Livegang

Inhalte zu Führerscheinklassen, Öffnungszeiten und Rechtstexten nochmals prüfen. Vor allem vollständige Impressumsangaben, Hostinginformationen, Datenschutz und die Nutzung des externen Videodienstes müssen abgestimmt werden. Das Anfrageformular öffnet die E-Mail-Anwendung und sendet nicht eigenständig an einen Server.
