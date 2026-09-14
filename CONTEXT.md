# Quick Photo Uploader

Web-App, mit der man ohne Login schnell Fotos und Videos in ein gemeinsam genutztes Album hochladen und ansehen kann. Der Album-Link wird typischerweise per Messenger (z.B. WhatsApp) verteilt.

## Language

**Album**:
Eine per Slug adressierte, gemeinsam nutzbare Sammlung von Mediendateien. Entsteht implizit mit dem ersten erfolgreichen Upload und hört auf zu existieren, sobald die letzte Mediendatei daraus entfernt wurde — unabhängig davon, ob das über die Oberfläche oder direkt auf dem Server geschah.
_Avoid_: Ordner, Folder

**Slug**:
Der URL-Pfadabschnitt, der ein Album eindeutig identifiziert und adressiert (z.B. `album-test` in `.../album-test`). Lowercase, alphanumerisch plus Bindestrich; reservierte Systempfade sind ausgeschlossen.
_Avoid_: Album-Name, Ordnername

**Mediendatei**:
Ein einzelnes hochgeladenes Foto oder Video innerhalb eines Albums. Besteht aus einem Original und einem Vorschaubild und trägt den Anzeigenamen des Uploaders zum Zeitpunkt des Uploads.
_Avoid_: Datei, Asset, File, Foto (wenn auch Video gemeint sein kann)

**Original**:
Die in voller Auflösung gespeicherte Mediendatei, wie sie hochgeladen wurde (nach eventuell nötiger Format-Konvertierung für die Anzeige). Wird zum Download angeboten.

**Vorschaubild**:
Eine verkleinerte, serverseitig erzeugte Repräsentation einer Mediendatei für die schnelle Darstellung in der Galerie. Kann zeitversetzt zum Original entstehen.
_Avoid_: Thumbnail (im UI-Text), Preview

**Galerie**:
Die Ansicht, die alle Mediendateien eines Albums darstellt, inklusive Sortierung, Ansichtsmodus (Liste/Raster) und Mehrfachauswahl zum Löschen.
_Avoid_: Übersicht, Liste (Liste ist nur einer der Ansichtsmodi der Galerie, kein Synonym dafür)

**Anzeigename**:
Der einem Uploader zugeordnete Name, der bei jeder von ihm hochgeladenen Mediendatei angezeigt wird. Standardmäßig zufällig generiert, vom Uploader änderbar, gilt geräteweit (nicht album-spezifisch) und wird pro Mediendatei zum Upload-Zeitpunkt fest eingefroren — eine spätere Namensänderung wirkt nur auf künftige Uploads.
_Avoid_: Benutzername, Username, Profilname (es gibt keine Benutzerkonten)
