# Epic Seven Guild War Tracker

A desktop scouting tool for Epic Seven Guild War defenses.

The app helps you save enemy defenses, track hero stats, calculate estimated enemy speed from CR position, and copy clean Discord-ready notes.

## Features

- Two Guild War rounds
- Three heroes per round
- Hero stats:
  - ATK
  - DEF
  - HP
  - Speed
  - EFF
  - ER
- Set selection with custom icons
- Class-based artifact selection
- Searchable hero and artifact dropdowns
- SQLite local database
- Save/load/delete opponents
- Export/import JSON backups
- Discord-ready copy output
- Per-round team notes
- Speed calculator for CR-based speed estimation
- Dark mode UI
- Fribbels master data update button

## Requirements

Install these first:

1. Node.js LTS
2. Rust
3. Tauri prerequisites for Windows

## Setup

```bash
npm install
npm run tauri:dev
```

## Build Windows executable

```bash
npm run tauri:build
```

The installer/exe will be created inside:

```text
src-tauri/target/release/bundle/
```
For easy use, you can run the portable:

```text
e7-gw-tracker.exe
```
## Credits

This project uses community-maintained Epic Seven data from Fribbels.
Epic Seven is owned by Smilegate. This project is a fan-made scouting tool and is not affiliated with or endorsed by Smilegate.
