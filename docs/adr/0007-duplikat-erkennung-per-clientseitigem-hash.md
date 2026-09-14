# Duplikat-Erkennung per clientseitigem Hash, Ablehnung statt Silent-Skip

Uploads sollen abgelehnt werden, wenn dieselbe Datei (bytegleich) bereits im selben Album existiert. Erwogen wurden ein serverseitiger Hash-Vergleich (während des ohnehin laufenden Schreibvorgangs, kein Mehraufwand an I/O, aber die komplette Datei wird auch bei einem späteren Duplikat immer erst vollständig hochgeladen) und ein clientseitiger Vorab-Check (Browser hasht die Datei per WebCrypto und fragt vor dem eigentlichen Upload an, ob der Hash im Album schon existiert). Wir haben uns für den clientseitigen Check entschieden, weil bei diesem Album-Formfaktor (Videos von Handykameras, oft per Mobilfunk hochgeladen) das Vermeiden unnötiger Datenübertragung bei einem Duplikat stärker wiegt als die zusätzliche Client-Komplexität und CPU-Last beim Hashen auf dem Gerät.

Bei erkanntem Duplikat wird der Upload abgelehnt (keine neue Mediendatei angelegt) statt still übersprungen — der Uploader bekommt eine Meldung, dass und von wem die Datei schon hochgeladen wurde, statt fälschlich einen Upload-Erfolg zu sehen.

Der Vergleich ist pro Album begrenzt (Index/Unique-Constraint auf `(albumId, contentHash)`), nicht global über alle Alben — dieselbe Datei in zwei unabhängigen Alben ist kein Duplikat, siehe Glossar-Eintrag "Duplikat".

Konsequenz: Der Hash wird ausschließlich für den Duplikat-Vergleich verwendet, nicht als Integritätsprüfung des Uploads. Ein manipulierter/gefälschter Client könnte einen falschen Hash mitschicken; das serverseitige Upload-Handling verifiziert den tatsächlichen Datei-Hash nach Abschluss des Schreibvorgangs, bevor der `MediaItem`-Eintrag angelegt wird — der clientseitige Vorab-Check ist nur eine Optimierung, um unnötige Übertragungen zu vermeiden, keine Vertrauensgrundlage.
