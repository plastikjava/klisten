# Vercel Deployment-Anleitung für Kita-Listen

Diese Anleitung erklärt Schritt für Schritt, wie du deine lokale **Kita-Listen-App** auf [Vercel](https://vercel.com) veröffentlichst. Sobald das eingerichtet ist, wird die App bei jedem `git push` in dein GitHub-Repository automatisch für deine iPads aktualisiert.

---

## 🚀 Schritt 1: Bei Vercel anmelden

1. Gehe auf die Website [https://vercel.com](https://vercel.com).
2. Klicke oben rechts auf **„Sign Up“** (registrieren) oder **„Log In“** (anmelden).
3. Wähle **„Continue with GitHub“** und autorisiere Vercel mit deinem GitHub-Konto.

---

## 📦 Schritt 2: Projekt importieren

1. Nach der Anmeldung befindest du dich auf deinem Vercel-Dashboard.
2. Klicke auf die blaue Schaltfläche **„Add New...“** und wähle **„Project“**.
3. In der Liste deiner GitHub-Repositories siehst du dein Repository **`klisten`**.
4. Klicke daneben auf **„Import“**.

---

## 🛠️ Schritt 3: Einstellungen anpassen & Deployen

1. Vercel erkennt automatisch, dass es sich um ein **Next.js**-Projekt handelt und wählt das Framework aus.
2. Du musst **keine** Umgebungsvariablen (Environment Variables) einstellen.
3. Klicke einfach unten auf die Schaltfläche **„Deploy“**.
4. Vercel baut die App nun im Hintergrund zusammen (das dauert ca. 1–2 Minuten).
5. Herzlichen Glückwunsch! Deine App ist nun live unter einer Adresse wie `klisten-XXXX.vercel.app` (oder einer ähnlichen, die Vercel generiert) erreichbar.

---

## 📱 Schritt 4: Auf den iPads einrichten

1. Öffne den **Safari-Browser** auf beiden iPads.
2. Rufe deine Vercel-URL auf (z.B. `https://klisten.vercel.app`).
3. Klicke in Safari auf das **Teilen-Symbol** (Rechteck mit Pfeil nach oben).
4. Wähle **„Zum Home-Bildschirm hinzufügen“** (Add to Home Screen).
5. Die App wird nun als eigenständige App (PWA) auf deinem iPad installiert und hat ihr eigenes, kinderfreundliches App-Icon. Sie funktioniert ab jetzt auch **vollständig offline**!

---

## 🔄 Schritt 5: Automatische Updates erhalten

Wenn du in Zukunft Code-Änderungen machst:
1. Mache deine Änderungen im Code.
2. Führe einen Git-Commit und Push durch:
   ```bash
   git add .
   git commit -m "deine änderung"
   git push
   ```
3. Vercel bemerkt den Push automatisch und baut die App im Hintergrund neu.
4. **Auf den iPads:** Sobald die iPads das nächste Mal Internetverbindung haben und du die App öffnest, lädt die PWA das Update im Hintergrund herunter. Beim nächsten Schließen und Wiederöffnen der App ist die neue Version aktiv.

---

## 🔒 Datenschutz-Hinweis

Vercel dient in diesem Setup **ausschließlich** als Hoster für den Programmcode (die HTML-, CSS- und JavaScript-Dateien). 
Es werden **keinerlei Kinder- oder Listendaten in einer Cloud oder auf Vercel-Servern gespeichert**. Alle personenbezogenen Daten der Kinder liegen zu 100 % in der lokalen Datenbank (IndexedDB) des jeweiligen iPad-Browsers.
