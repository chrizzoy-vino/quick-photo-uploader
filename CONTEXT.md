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

**Lösch-Token**:
Ein pro Mediendatei beim Upload erzeugtes Geheimnis, das nur im Browser des Uploaders hinterlegt wird und ausschließlich diesem erlaubt, genau diese Mediendatei zu löschen. Wie der Anzeigename wird es zum Upload-Zeitpunkt fest an die Mediendatei gebunden, ist aber kein Identitätsnachweis und dient einzig der Löschberechtigung — wer Speicher/Gerät verliert, verliert die Löschmöglichkeit für seine eigenen Uploads.
_Avoid_: Owner-Token, Besitz-Token, Passwort

**Administrator**:
Die Rolle, die sich über den Admin-Bereich anmeldet und dadurch alle Beschränkungen umgehen darf, die für gewöhnliche Uploader gelten — insbesondere das Löschen fremder Mediendateien oder ganzer Alben ohne Lösch-Token. Es gibt genau eine Administrator-Identität für die gesamte Installation, keine einzelnen Admin-Konten.
_Avoid_: Admin (als Substantiv im Fließtext), Betreiber (das meint die Person, die den Server betreibt, nicht diese App-Rolle)

**Admin-Bereich**:
Der geschützte Teil der App, in dem der Administrator alle Alben mit Kennzahlen (Dateianzahl, Größe, letzte Aktivität) einsehen und Mediendateien oder ganze Alben unabhängig von Lösch-Token löschen kann.
_Avoid_: Admin-Panel, Backend, Dashboard

**Duplikat**:
Eine hochzuladende Datei, deren Inhalt (Datei-Bytes, per Hash verglichen) exakt einer bereits im selben Album vorhandenen Mediendatei entspricht — unabhängig vom Dateinamen. Der Vergleich gilt ausschließlich innerhalb desselben Albums; dieselbe Datei in einem anderen Album ist kein Duplikat. Ein erkanntes Duplikat wird nicht als neue Mediendatei gespeichert; der Upload wird abgelehnt, mit Hinweis darauf, von wem die vorhandene Mediendatei stammt. Eine inhaltlich neu komprimierte Version derselben Aufnahme (z.B. nach einer WhatsApp-Weiterleitung) hat andere Bytes und gilt nicht als Duplikat.
_Avoid_: Kopie, doppelte Datei
