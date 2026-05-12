# Epic Seven GW Tracker

A Tauri + React + SQLite desktop app scaffold for manually scouting Epic Seven Guild War defenses.

## Features

- Windows `.exe` target through Tauri
- Local SQLite database
- Opponent entries
- Round 1 and Round 2
- Three heroes per round
- Stats: ATK, DEF, HP, Speed, EFF, ER
- Speed note field for future logic
- Clickable sets
- Class-based artifact selection
- Basic seeded hero and artifact database
- Export current entry as JSON

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

## Next development steps

1. Add admin screens for editing heroes and artifacts.
2. Add full Epic Seven hero/artifact data.
3. Add speed logic.
4. Add global backup/export of the SQLite database.
5. Add filters by hero, artifact, set, speed range, and opponent.
