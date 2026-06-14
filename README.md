# Rental Income Tracker

Eine React Native App zur Verwaltung von Mieteinnahmen und Mieterkonten.

## Features

### Mieterverwaltung
- **Mieter hinzufügen** mit Namen, Einzugsdatum, Jahresmiete und Notizen
- **Aktive & ehemalige Mieter** automatisch getrennt nach Kündigungsstatus
- **Kündigungsdatum setzen** für Mieterwechsel
- **Tagegenaue Berechnung** der Sollmiete (anteilige Berechnung bei Ein-/Auszug)

### Zahlungserfassung
- Zahlungen mit Datum und Betrag erfassen
- Automatische Berechnung von Soll, Ist und Saldo
- Zahlungshistorie mit Löschfunktion

### Mietjahr-Übersicht (Dez-Nov)
- Detaillierte Aufschlüsselung nach Mietjahren
- Quartalsweise Ansicht (Q1: Dez-Feb, Q2: Mär-Mai, Q3: Jun-Aug, Q4: Sep-Nov)
- Monatliche Detailansicht mit Soll/Ist-Vergleich
- Automatisches Filtern von Zeiträumen vor Einzug oder nach Auszug

### PDF-Berichte
- **Einzelmieter-Bericht**: Komplette Übersicht mit Zahlungshistorie und Mietjahren
- **Globaler Quartalsbericht**: Übersicht aller Mieter für ein bestimmtes Quartal
- Englische Berichtsausgabe mit aktuellem Status (Active/Former)

### Lebenszyklus-Management
- Kündigungsdatum setzen/bearbeiten/entfernen
- Automatische Trennung in aktive und ehemalige Mieter
- Dauerhafte Löschung (inkl. aller Zahlungen) für versehentlich angelegte Mieter

## Tech Stack

- **React Native** mit Expo SDK 54
- **TypeScript** für Typsicherheit
- **SQLite** (expo-sqlite) für lokale Datenspeicherung
- **expo-print** & **expo-sharing** für PDF-Generierung

## Installation

```bash
# Dependencies installieren
npm install

# App starten
npm start

# Oder direkt mit Expo
npx expo start
```

## Datenbank

Die App verwendet SQLite mit folgenden Tabellen:

### Tenants (Mieter)
- `id`, `name`, `mietanfang_datum`, `jahresmiete`, `anmerkungen`
- `termination_date` (optional - für Kündigungen)
- Automatische Timestamps: `created_at`, `updated_at`

### Payments (Zahlungen)
- `id`, `mieter_id`, `datum`, `betrag`
- Foreign Key mit CASCADE DELETE

## Berechnungslogik

### Sollmiete
Die Sollmiete wird taggenau berechnet:
- **Voller Monat**: Jahresmiete ÷ 12
- **Teilmonat bei Einzug**: Anteilig ab Einzugsdatum
- **Teilmonat bei Auszug**: Anteilig bis Kündigungsdatum
- **Nach Kündigung**: Keine weitere Sollmiete

### Mietjahr (Fiscal Year)
- Mietjahr läuft von **Dezember bis November** (nicht Kalenderjahr)
- Quartale: Q1 (Dez-Feb), Q2 (Mär-Mai), Q3 (Jun-Aug), Q4 (Sep-Nov)
- Automatisches Filtern von Monaten vor Einzug

## Projektstruktur

```
src/
├── models/           # TypeScript Interfaces
├── screens/          # React Native Screens
├── services/         # Business Logic & Database
│   ├── database.ts          # SQLite Operations
│   ├── calculationService.ts # Soll/Ist Berechnungen
│   ├── pdfService.ts        # Einzelmieter-PDFs
│   └── globalReportPdfService.ts # Globale PDFs
└── utils/            # Helper Functions
    └── rentCalculations.ts  # Mietjahr-Berechnungen
```

## Lizenz

MIT
