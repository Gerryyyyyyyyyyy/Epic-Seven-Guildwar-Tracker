import { invoke } from "@tauri-apps/api/core";
import React, { useEffect, useMemo, useState } from "react";
import Database from "@tauri-apps/plugin-sql";
import {
  Plus,
  Save,
  Search,
  Trash2,
  RotateCcw,
  Swords,
  Shield,
  Users,
  Download,
  Upload,
  Copy,
  FolderArchive,
  MoreVertical,
  Database as DatabaseIcon,
} from "lucide-react";

const DB_URL = "sqlite:e7_gw_tracker.db";

const STAT_FIELDS = ["ATK", "DEF", "HP", "Speed", "EFF", "ER"];

const SET_OPTIONS = [
  { name: "Immunity", image: "icons/sets/immunity.png", fallback: "🛡️" },
  { name: "Counter", image: "icons/sets/counter.png", fallback: "↩️" },
  { name: "Riposte", image: "icons/sets/riposte.png", fallback: "⚔️" },
  { name: "Warfare", image: "icons/sets/warfare.png", fallback: "🔥" },
  { name: "Pursuit", image: "icons/sets/pursuit.png", fallback: "🏹" },
  { name: "Protection", image: "icons/sets/protection.png", fallback: "🛡" },
  { name: "Injury", image: "icons/sets/injury.png", fallback: "🩸" },
];

const CLASS_OPTIONS = [
  { name: "Knight", image: "icons/classes/knight.png", fallback: "🛡️" },
  { name: "Warrior", image: "icons/classes/warrior.png", fallback: "🪓" },
  { name: "Thief", image: "icons/classes/thief.png", fallback: "🗡️" },
  { name: "Ranger", image: "icons/classes/ranger.png", fallback: "🏹" },
  { name: "Mage", image: "icons/classes/mage.png", fallback: "🔮" },
  { name: "Soul Weaver", image: "icons/classes/soul-weaver.png", fallback: "✨" },
];

const HERO_MASTER_DATA = [
  { id: "peira", name: "Peira", class: "Thief", element: "Ice", rarity: 5, icon: "", thumbnail: "" },
  { id: "luna", name: "Luna", class: "Warrior", element: "Ice", rarity: 5, icon: "", thumbnail: "" },
  { id: "yufine", name: "Yufine", class: "Warrior", element: "Earth", rarity: 5, icon: "", thumbnail: "" },
  { id: "ilynav", name: "Ilynav", class: "Knight", element: "Fire", rarity: 5, icon: "", thumbnail: "" },
  { id: "arunka", name: "Arunka", class: "Warrior", element: "Earth", rarity: 5, icon: "", thumbnail: "" },
  { id: "mercedes", name: "Mercedes", class: "Mage", element: "Fire", rarity: 4, icon: "", thumbnail: "" },
  { id: "ran", name: "Ran", class: "Thief", element: "Ice", rarity: 5, icon: "", thumbnail: "" },
  { id: "conqueror-lilias", name: "Conqueror Lilias", class: "Warrior", element: "Dark", rarity: 5, icon: "", thumbnail: "" },
  { id: "angel-of-light-angelica", name: "Angel of Light Angelica", class: "Mage", element: "Light", rarity: 4, icon: "", thumbnail: "" },
  { id: "ae-karina", name: "ae-KARINA", class: "Knight", element: "Ice", rarity: 5, icon: "", thumbnail: "" },
];

const ARTIFACT_MASTER_DATA = [
  { id: "elbris-ritual-sword", name: "Elbris Ritual Sword", class: "Knight", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "aurius", name: "Aurius", class: "Knight", rarity: 4, code: "", attack: null, health: null, defense: null },
  { id: "adamant-shield", name: "Adamant Shield", class: "Knight", rarity: 4, code: "", attack: null, health: null, defense: null },
  { id: "noble-oath", name: "Noble Oath", class: "Knight", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "holy-sacrifice", name: "Holy Sacrifice", class: "Knight", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "uberiuss-tooth", name: "Uberius's Tooth", class: "Warrior", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "sigurd-scythe", name: "Sigurd Scythe", class: "Warrior", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "draco-plate", name: "Draco Plate", class: "Warrior", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "merciless-glutton", name: "Merciless Glutton", class: "Warrior", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "creation-destruction", name: "Creation & Destruction", class: "Warrior", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "rhianna-luciella", name: "Rhianna & Luciella", class: "Thief", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "alexas-basket", name: "Alexa's Basket", class: "Thief", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "moonlight-dreamblade", name: "Moonlight Dreamblade", class: "Thief", rarity: 4, code: "", attack: null, health: null, defense: null },
  { id: "shepherd-of-the-hollow", name: "Shepherd of the Hollow", class: "Thief", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "dust-devil", name: "Dust Devil", class: "Thief", rarity: 4, code: "", attack: null, health: null, defense: null },
  { id: "guiding-light", name: "Guiding Light", class: "Ranger", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "song-of-stars", name: "Song of Stars", class: "Ranger", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "bloodstone", name: "Bloodstone", class: "Ranger", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "sashe-ithanes", name: "Sashe Ithanes", class: "Ranger", rarity: 4, code: "", attack: null, health: null, defense: null },
  { id: "infinity-basket", name: "Infinity Basket", class: "Ranger", rarity: 4, code: "", attack: null, health: null, defense: null },
  { id: "tagehels-ancient-book", name: "Tagehel's Ancient Book", class: "Mage", rarity: 4, code: "", attack: null, health: null, defense: null },
  { id: "abyssal-crown", name: "Abyssal Crown", class: "Mage", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "eticas-scepter", name: "Etica's Scepter", class: "Mage", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "iela-violin", name: "Iela Violin", class: "Mage", rarity: 4, code: "", attack: null, health: null, defense: null },
  { id: "necro-undine", name: "Necro & Undine", class: "Mage", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "rod-of-amaryllis", name: "Rod of Amaryllis", class: "Soul Weaver", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "celestine", name: "Celestine", class: "Soul Weaver", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "waters-origin", name: "Water's Origin", class: "Soul Weaver", rarity: 4, code: "", attack: null, health: null, defense: null },
  { id: "idols-cheer", name: "Idol's Cheer", class: "Soul Weaver", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "shimadra-staff", name: "Shimadra Staff", class: "Soul Weaver", rarity: 5, code: "", attack: null, health: null, defense: null },
];

function uid() {
  return crypto.randomUUID();
}

function slugify(value) {
  return (
    String(value || "unnamed")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") || "unnamed"
  );
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function mapFribbelsRole(role) {
  const normalized = String(role || "").toLowerCase();
  const roleMap = {
    warrior: "Warrior",
    knight: "Knight",
    assassin: "Thief",
    ranger: "Ranger",
    mage: "Mage",
    manauser: "Soul Weaver",
  };
  return roleMap[normalized] || "";
}

function mapFribbelsElement(attribute) {
  const normalized = String(attribute || "").toLowerCase();
  const elementMap = {
    fire: "Fire",
    ice: "Ice",
    wind: "Earth",
    light: "Light",
    dark: "Dark",
  };
  return elementMap[normalized] || attribute || "";
}

function normalizeFribbelsHeroes(raw) {
  return Object.values(raw || {})
    .map((hero) => ({
      id: hero._id || slugify(hero.name),
      name: hero.name,
      class: mapFribbelsRole(hero.role) || "Knight",
      element: mapFribbelsElement(hero.attribute),
      rarity: hero.rarity ?? null,
      icon: hero.assets?.icon ?? "",
      thumbnail: hero.assets?.thumbnail ?? "",
    }))
    .filter((hero) => hero.id && hero.name);
}

function normalizeFribbelsArtifacts(raw) {
  return Object.values(raw || {})
    .map((artifact) => ({
      id: slugify(artifact.name),
      name: artifact.name,
      class: mapFribbelsRole(artifact.role),
      rarity: artifact.rarity ?? null,
      code: artifact.code ?? "",
      attack: artifact.stats?.attack ?? null,
      health: artifact.stats?.health ?? null,
      defense: artifact.stats?.defense ?? null,
    }))
    .filter((artifact) => artifact.id && artifact.name);
}

function getClassMeta(className) {
  return CLASS_OPTIONS.find((item) => item.name === className) ?? CLASS_OPTIONS[0];
}

function getSetMeta(setName) {
  return SET_OPTIONS.find((item) => item.name === setName) ?? { name: setName, image: "", fallback: "•" };
}

function emptyStats() {
  return { ATK: "", DEF: "", HP: "", Speed: "", EFF: "", ER: "" };
}

function blankHero() {
  return {
    heroId: "",
    name: "",
    class: "Knight",
    stats: emptyStats(),
    sets: [],
    artifactId: "",
    additionalNotes: "",
  };
}

function normalizeHeroEntry(hero) {
  return {
    heroId: hero?.heroId ?? "",
    name: hero?.name ?? "",
    class: hero?.class ?? "Knight",
    stats: {
      ATK: hero?.stats?.ATK ?? "",
      DEF: hero?.stats?.DEF ?? "",
      HP: hero?.stats?.HP ?? "",
      Speed: hero?.stats?.Speed ?? "",
      EFF: hero?.stats?.EFF ?? "",
      ER: hero?.stats?.ER ?? "",
    },
    sets: Array.isArray(hero?.sets) ? hero.sets : [],
    artifactId: hero?.artifactId ?? "",
    additionalNotes: hero?.additionalNotes ?? hero?.speedNote ?? "",
  };
}

function blankEntry() {
  const now = new Date().toISOString();
  return {
    id: uid(),
    opponent: "",
    note: "",
    createdAt: now,
    updatedAt: now,
    rounds: {
      R1: [blankHero(), blankHero(), blankHero()],
      R2: [blankHero(), blankHero(), blankHero()],
    },
  };
}

async function getDb() {
  try {
    return await Database.load(DB_URL);
  } catch (error) {
    console.error("SQLite load failed:", error);
    throw new Error(
      "SQLite could not be loaded. This usually means the app is not running inside Tauri, the SQL plugin is missing, or SQL permissions are not configured."
    );
  }
}

async function ensureColumn(db, tableName, columnName, columnType) {
  try {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
  } catch {
    // Column already exists.
  }
}

async function initDb() {
  const db = await getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS heroes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      class TEXT NOT NULL,
      element TEXT,
      rarity INTEGER,
      icon TEXT,
      thumbnail TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      class TEXT,
      rarity INTEGER,
      code TEXT,
      attack INTEGER,
      health INTEGER,
      defense INTEGER
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS opponents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS scout_entries (
      id TEXT PRIMARY KEY,
      opponent_id TEXT NOT NULL,
      round_key TEXT NOT NULL,
      slot_number INTEGER NOT NULL,
      hero_id TEXT,
      hero_name_custom TEXT,
      class TEXT NOT NULL,
      atk TEXT,
      def TEXT,
      hp TEXT,
      speed TEXT,
      eff TEXT,
      er TEXT,
      speed_note TEXT,
      artifact_id TEXT,
      sets_json TEXT NOT NULL,
      FOREIGN KEY (opponent_id) REFERENCES opponents(id) ON DELETE CASCADE
    );
  `);

  await ensureColumn(db, "heroes", "rarity", "INTEGER");
  await ensureColumn(db, "heroes", "icon", "TEXT");
  await ensureColumn(db, "heroes", "thumbnail", "TEXT");
  await ensureColumn(db, "artifacts", "rarity", "INTEGER");
  await ensureColumn(db, "artifacts", "code", "TEXT");
  await ensureColumn(db, "artifacts", "attack", "INTEGER");
  await ensureColumn(db, "artifacts", "health", "INTEGER");
  await ensureColumn(db, "artifacts", "defense", "INTEGER");

  await seedMasterData(db);
  await importBundledMasterData(db);
  return db;
}

async function fetchBundledJson(paths) {
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) return await response.json();
    } catch {
      // Try next path.
    }
  }
  return null;
}

async function importBundledMasterData(db) {
  const rawHeroes = await fetchBundledJson(["./data/herodata.json", "data/herodata.json", "/data/herodata.json"]);
  if (rawHeroes) {
    await upsertHeroes(db, normalizeFribbelsHeroes(rawHeroes));
  }

  const rawArtifacts = await fetchBundledJson(["./data/artifactdata.json", "data/artifactdata.json", "/data/artifactdata.json"]);
  if (rawArtifacts) {
    await upsertArtifacts(db, normalizeFribbelsArtifacts(rawArtifacts));
  }
}

async function upsertHeroes(db, heroes) {
  for (const hero of heroes) {
    await db.execute(
      `INSERT INTO heroes (id, name, class, element, rarity, icon, thumbnail)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         id = excluded.id,
         class = excluded.class,
         element = excluded.element,
         rarity = excluded.rarity,
         icon = excluded.icon,
         thumbnail = excluded.thumbnail`,
      [hero.id, hero.name, hero.class, hero.element, hero.rarity, hero.icon, hero.thumbnail]
    );
  }
}

async function upsertArtifacts(db, artifacts) {
  for (const artifact of artifacts) {
    await db.execute(
      `INSERT INTO artifacts (id, name, class, rarity, code, attack, health, defense)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         class = excluded.class,
         rarity = excluded.rarity,
         code = excluded.code,
         attack = excluded.attack,
         health = excluded.health,
         defense = excluded.defense`,
      [artifact.id, artifact.name, artifact.class, artifact.rarity, artifact.code, artifact.attack, artifact.health, artifact.defense]
    );
  }
}

async function seedMasterData(db) {
  await upsertHeroes(db, HERO_MASTER_DATA);
  await upsertArtifacts(db, ARTIFACT_MASTER_DATA);
}

async function loadMasterData() {
  const db = await getDb();
  const heroes = await db.select("SELECT id, name, class, element, rarity, icon, thumbnail FROM heroes ORDER BY name ASC");
  const artifacts = await db.select("SELECT id, name, class, rarity, code, attack, health, defense FROM artifacts ORDER BY name ASC");
  return { heroes, artifacts };
}

async function loadOpponents() {
  const db = await getDb();
  return await db.select(
    "SELECT id, name AS opponent, note, created_at AS createdAt, updated_at AS updatedAt FROM opponents ORDER BY updated_at DESC"
  );
}

async function loadEntryFromDb(opponentId) {
  const db = await getDb();

  const opponents = await db.select(
    "SELECT id, name AS opponent, note, created_at AS createdAt, updated_at AS updatedAt FROM opponents WHERE id = ?",
    [opponentId]
  );

  if (!opponents[0]) return null;

  const rows = await db.select("SELECT * FROM scout_entries WHERE opponent_id = ? ORDER BY round_key ASC, slot_number ASC", [opponentId]);

  const entry = {
    ...opponents[0],
    rounds: { R1: [blankHero(), blankHero(), blankHero()], R2: [blankHero(), blankHero(), blankHero()] },
  };

  for (const row of rows) {
    const hero = normalizeHeroEntry({
      heroId: row.hero_id ?? "",
      name: row.hero_name_custom ?? "",
      class: row.class ?? "Knight",
      stats: {
        ATK: row.atk ?? "",
        DEF: row.def ?? "",
        HP: row.hp ?? "",
        Speed: row.speed ?? "",
        EFF: row.eff ?? "",
        ER: row.er ?? "",
      },
      additionalNotes: row.speed_note ?? "",
      artifactId: row.artifact_id ?? "",
      sets: JSON.parse(row.sets_json || "[]"),
    });

    if (entry.rounds[row.round_key] && row.slot_number >= 1 && row.slot_number <= 3) {
      entry.rounds[row.round_key][row.slot_number - 1] = hero;
    }
  }

  return entry;
}

async function saveEntryToDb(entry) {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  const opponent = entry.opponent.trim() || "Unnamed opponent";
  const createdAt = entry.createdAt || updatedAt;

  await db.execute(
    `INSERT INTO opponents (id, name, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, note = excluded.note, updated_at = excluded.updated_at`,
    [entry.id, opponent, entry.note ?? "", createdAt, updatedAt]
  );

  await db.execute("DELETE FROM scout_entries WHERE opponent_id = ?", [entry.id]);

  for (const roundKey of ["R1", "R2"]) {
    for (let i = 0; i < 3; i += 1) {
      const hero = normalizeHeroEntry(entry.rounds[roundKey][i]);

      await db.execute(
        `INSERT INTO scout_entries (
          id, opponent_id, round_key, slot_number, hero_id, hero_name_custom, class,
          atk, def, hp, speed, eff, er, speed_note, artifact_id, sets_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uid(),
          entry.id,
          roundKey,
          i + 1,
          hero.heroId || null,
          hero.name || null,
          hero.class,
          hero.stats.ATK,
          hero.stats.DEF,
          hero.stats.HP,
          hero.stats.Speed,
          hero.stats.EFF,
          hero.stats.ER,
          hero.additionalNotes,
          hero.artifactId || null,
          JSON.stringify(hero.sets),
        ]
      );
    }
  }

  return { ...entry, opponent, createdAt, updatedAt };
}

async function deleteEntryFromDb(id) {
  const db = await getDb();
  await db.execute("DELETE FROM scout_entries WHERE opponent_id = ?", [id]);
  await db.execute("DELETE FROM opponents WHERE id = ?", [id]);
}

async function importEntriesToDb(entries) {
  let imported = 0;
  for (const entry of entries) {
    if (entry?.id && entry?.rounds?.R1 && entry?.rounds?.R2) {
      await saveEntryToDb(entry);
      imported += 1;
    }
  }
  return imported;
}

function AppIcon({ meta, size = 22 }) {
  const [failed, setFailed] = useState(false);

  if (!meta?.image || failed) {
    return (
      <span style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {meta?.fallback ?? "•"}
      </span>
    );
  }

  return (
    <img
      src={meta.image}
      alt=""
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block" }}
    />
  );
}

function buildDiscordSummary(entry, artifactMaster) {
  const artifactName = (artifactId) => artifactMaster.find((artifact) => artifact.id === artifactId)?.name ?? "?";
  const statLine = (hero) =>
    `ATK ${hero.stats.ATK || "?"} | DEF ${hero.stats.DEF || "?"} | HP ${hero.stats.HP || "?"} | SPD ${
      hero.stats.Speed || "?"
    } | EFF ${hero.stats.EFF || "?"} | ER ${hero.stats.ER || "?"}`;

  const lines = [];
  lines.push(`**${entry.opponent || "Unnamed opponent"}**`);
  if (entry.note) lines.push(`_${entry.note}_`);
  lines.push("");

  for (const roundKey of ["R1", "R2"]) {
    lines.push(`__${roundKey === "R1" ? "Round 1" : "Round 2"}__`);
    lines.push("");

    entry.rounds[roundKey].forEach((hero, index) => {
      const normalizedHero = normalizeHeroEntry(hero);
      const sets = normalizedHero.sets.length ? normalizedHero.sets.join(", ") : "?";
      const artifact = artifactName(normalizedHero.artifactId);

      lines.push(`${index + 1}. **${normalizedHero.name || "?"}**`);
      lines.push("");
      lines.push(`**Stats:** ${statLine(normalizedHero)}`);
      lines.push("");
      lines.push(`**Sets:** ${sets}`);
      lines.push("");
      lines.push(`**Artifact:** ${artifact}`);
      lines.push("");

      if (normalizedHero.additionalNotes) {
        lines.push(`**Additional Notes:** ${normalizedHero.additionalNotes}`);
        lines.push("");
      }
    });

    lines.push("");
  }

  return lines.join("\n").trim();
}

function Field({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-950"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-950"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value ?? option.name ?? option} value={option.value ?? option.name ?? option}>
            {option.label ?? option.name ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchableSelect({ label, value, onChange, options, placeholder }) {
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const nextSelected = options.find((option) => option.value === value);
    setQuery(nextSelected?.label ?? "");
  }, [value, options]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options.slice(0, 50);
    return options
      .filter((option) => option.label.toLowerCase().includes(normalizedQuery) || option.searchText?.includes(normalizedQuery))
      .slice(0, 50);
  }, [options, query]);

  const closeAndResetIfNeeded = () => {
    window.setTimeout(() => {
      setOpen(false);
      const nextSelected = options.find((option) => option.value === value);
      setQuery(nextSelected?.label ?? "");
    }, 120);
  };

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (!event.target.value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={closeAndResetIfNeeded}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              event.currentTarget.blur();
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-950"
        />
      </label>

      {open && (
        <div className="absolute z-20 mt-1 max-h-80 w-[min(42rem,90vw)] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-2xl">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">No results</div>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setQuery(option.label);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left text-sm text-slate-100 hover:bg-slate-800"
              >
                <span className="min-w-0 flex-1 whitespace-normal leading-snug">{option.label}</span>
                {option.meta && <span className="shrink-0 text-xs text-slate-400">{option.meta}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function HeroCard({ roundKey, heroIndex, hero, heroes, artifacts, onHeroChange }) {
  const normalizedHero = normalizeHeroEntry(hero);

  const heroOptions = heroes.map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.class}${item.rarity ? ` · ${item.rarity}★` : ""}`,
    meta: item.element || "",
    searchText: `${item.name} ${item.class} ${item.element || ""}`.toLowerCase(),
  }));

  const artifactOptions = artifacts
    .filter((artifact) => !artifact.class || artifact.class === normalizedHero.class)
    .map((artifact) => ({
      value: artifact.id,
      label: `${artifact.name}${artifact.rarity ? ` · ${artifact.rarity}★` : ""}`,
      meta: artifact.class || "Universal",
      searchText: `${artifact.name} ${artifact.class || "Universal"} ${artifact.rarity || ""}`.toLowerCase(),
    }));

  const classOptions = CLASS_OPTIONS.map((item) => ({ value: item.name, label: item.name }));
  const classMeta = getClassMeta(normalizedHero.class);

  const updateHero = (patch) => onHeroChange(roundKey, heroIndex, { ...normalizedHero, ...patch });

  const updateStat = (stat, value) => {
    updateHero({ stats: { ...normalizedHero.stats, [stat]: value } });
  };

  const toggleSet = (setName) => {
    const hasSet = normalizedHero.sets.includes(setName);
    updateHero({ sets: hasSet ? normalizedHero.sets.filter((item) => item !== setName) : [...normalizedHero.sets, setName] });
  };

  const changeHero = (heroId) => {
    const selectedHero = heroes.find((item) => item.id === heroId);
    if (!selectedHero) {
      updateHero({ heroId: "", name: "", artifactId: "" });
      return;
    }

    updateHero({
      heroId: selectedHero.id,
      name: selectedHero.name,
      class: selectedHero.class,
      artifactId: "",
    });
  };

  const changeClass = (nextClass) => {
    updateHero({ class: nextClass, heroId: "", artifactId: "" });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hero {heroIndex + 1}</p>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <AppIcon meta={classMeta} />
            <span>{normalizedHero.name || "Unnamed Hero"}</span>
          </h3>
        </div>
        <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">{roundKey}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SearchableSelect label="Hero database" value={normalizedHero.heroId} onChange={changeHero} options={heroOptions} placeholder="Search hero..." />
        <Field label="Custom hero name" value={normalizedHero.name} onChange={(value) => updateHero({ name: value, heroId: "" })} placeholder="e.g. Peira" />
        <SelectField label="Class" value={normalizedHero.class} onChange={changeClass} options={classOptions} />
        <SearchableSelect
          label={`Artifact (${normalizedHero.class})`}
          value={normalizedHero.artifactId}
          onChange={(value) => updateHero({ artifactId: value })}
          options={artifactOptions}
          placeholder="Search artifact..."
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {STAT_FIELDS.map((stat) => (
          <Field
            key={stat}
            label={stat}
            value={normalizedHero.stats[stat]}
            onChange={(value) => updateStat(stat, value)}
            placeholder={stat === "Speed" ? "e.g. 285+" : "Value"}
          />
        ))}
      </div>

      <div className="mt-3">
        <Field
          label="Additional Notes"
          value={normalizedHero.additionalNotes}
          onChange={(value) => updateHero({ additionalNotes: value })}
          placeholder="e.g. opener, slower than Ran, speed contest, unknown, artifact proc"
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-slate-400">Sets</p>
        <div className="flex flex-wrap gap-2">
          {SET_OPTIONS.map((setOption) => {
            const active = normalizedHero.sets.includes(setOption.name);
            return (
              <button
                key={setOption.name}
                type="button"
                onClick={() => toggleSet(setOption.name)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition ${
                  active
                    ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:bg-slate-800"
                }`}
              >
                <AppIcon meta={setOption} size={28} />
                {setOption.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RoundPanel({ roundKey, heroes, heroMaster, artifactMaster, onHeroChange }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="rounded-2xl bg-indigo-600 p-2 text-white">
          <Swords size={18} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Round {roundKey === "R1" ? "1" : "2"}</h2>
          <p className="text-sm text-slate-400">Three heroes with stats, custom set icons, and class-based artifact selection.</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {heroes.map((hero, index) => (
          <HeroCard
            key={`${roundKey}-${index}`}
            roundKey={roundKey}
            heroIndex={index}
            hero={hero}
            heroes={heroMaster}
            artifacts={artifactMaster}
            onHeroChange={onHeroChange}
          />
        ))}
      </div>
    </section>
  );
}

function SummaryTable({ entry, artifactMaster, onCopyDiscord }) {
  const rows = ["R1", "R2"].flatMap((roundKey) => entry.rounds[roundKey].map((hero, index) => ({ roundKey, index, hero: normalizeHeroEntry(hero) })));
  const artifactName = (artifactId) => artifactMaster.find((artifact) => artifact.id === artifactId)?.name ?? "—";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-bold text-slate-100">Summary</h2>
          <p className="text-sm text-slate-400">Copy the full defense as Discord-ready text.</p>
        </div>
        <button onClick={onCopyDiscord} className="inline-flex items-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500">
          <Copy className="mr-2 h-4 w-4" /> Copy for Discord
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Round</th>
              <th className="px-4 py-3">Hero</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">ATK</th>
              <th className="px-4 py-3">DEF</th>
              <th className="px-4 py-3">HP</th>
              <th className="px-4 py-3">Speed</th>
              <th className="px-4 py-3">EFF</th>
              <th className="px-4 py-3">ER</th>
              <th className="px-4 py-3">Sets</th>
              <th className="px-4 py-3">Artifact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(({ roundKey, index, hero }) => (
              <tr key={`${roundKey}-summary-${index}`} className="text-slate-300">
                <td className="px-4 py-3 font-semibold text-slate-100">{roundKey}</td>
                <td className="px-4 py-3">{hero.name || "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <AppIcon meta={getClassMeta(hero.class)} size={18} />
                    {hero.class}
                  </span>
                </td>
                {STAT_FIELDS.map((stat) => (
                  <td key={stat} className="px-4 py-3">
                    {hero.stats[stat] || "—"}
                  </td>
                ))}
                <td className="px-4 py-3">
                  {hero.sets.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {hero.sets.map((setName) => (
                        <span key={setName} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200">
                          <AppIcon meta={getSetMeta(setName)} size={22} />
                          {setName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{artifactName(hero.artifactId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EpicSevenGwTrackerApp() {
  const [entry, setEntry] = useState(blankEntry());
  const [savedEntries, setSavedEntries] = useState([]);
  const [heroes, setHeroes] = useState(HERO_MASTER_DATA);
  const [artifacts, setArtifacts] = useState(ARTIFACT_MASTER_DATA);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState("Starting SQLite database...");
  const [actionsOpen, setActionsOpen] = useState(false);

  async function refreshList() {
    const opponents = await loadOpponents();
    setSavedEntries(opponents);
  }

  async function refreshMasterDataStatus(prefix = "SQLite database ready") {
    const master = await loadMasterData();
    setHeroes(master.heroes.length ? master.heroes : HERO_MASTER_DATA);
    setArtifacts(master.artifacts.length ? master.artifacts : ARTIFACT_MASTER_DATA);
    setStatus(`${prefix}. Loaded ${master.heroes.length} heroes and ${master.artifacts.length} artifacts.`);
  }

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        await refreshMasterDataStatus("SQLite database ready");
        await refreshList();
      } catch (error) {
        console.error(error);
        setStatus(`SQLite could not start: ${error.message || error}. Make sure this runs inside Tauri and that @tauri-apps/plugin-sql is configured.`);
      }
    })();
  }, []);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return savedEntries;
    return savedEntries.filter((item) => item.opponent.toLowerCase().includes(query));
  }, [savedEntries, search]);

  const updateHero = (roundKey, heroIndex, nextHero) => {
    setEntry((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      rounds: {
        ...current.rounds,
        [roundKey]: current.rounds[roundKey].map((hero, index) => (index === heroIndex ? normalizeHeroEntry(nextHero) : hero)),
      },
    }));
  };

  const newEntry = () => {
    setEntry(blankEntry());
    setSelectedId(null);
    setStatus("New opponent created. Remember to save it.");
  };

  const saveEntry = async () => {
    try {
      const saved = await saveEntryToDb(entry);
      setEntry(saved);
      setSelectedId(saved.id);
      await refreshList();
      setStatus(`Saved to SQLite: ${saved.opponent}`);
    } catch (error) {
      console.error(error);
      setStatus(`Save failed: ${error.message || error}`);
    }
  };

  const loadEntry = async (item) => {
    try {
      const loaded = await loadEntryFromDb(item.id);
      if (!loaded) return;
      setEntry(loaded);
      setSelectedId(item.id);
      setStatus(`Loaded: ${loaded.opponent}`);
    } catch (error) {
      console.error(error);
      setStatus(`Load failed: ${error.message || error}`);
    }
  };

  const deleteEntry = async (id) => {
    try {
      await deleteEntryFromDb(id);
      await refreshList();
      if (selectedId === id) {
        setEntry(blankEntry());
        setSelectedId(null);
      }
      setStatus("Entry deleted from SQLite.");
    } catch (error) {
      console.error(error);
      setStatus(`Delete failed: ${error.message || error}`);
    }
  };

  const exportCurrentEntry = () => {
    const safeName = slugify(entry.opponent || "unnamed-opponent");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `e7-scouts__opponents__${safeName}__${date}-${safeName}.json`;
    downloadTextFile(filename, JSON.stringify(entry, null, 2));
    setStatus("Current entry exported as JSON.");
  };

  const exportAllEntries = async () => {
    try {
      const fullEntries = [];
      for (const item of savedEntries) {
        const full = await loadEntryFromDb(item.id);
        if (full) fullEntries.push(full);
      }

      const payload = {
        app: "Epic Seven GW Tracker",
        version: 6,
        exportedAt: new Date().toISOString(),
        savedEntries: fullEntries,
      };

      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(`e7-scouts__backups__backup-${date}.json`, JSON.stringify(payload, null, 2));
      setStatus("Full SQLite backup exported as JSON.");
    } catch (error) {
      console.error(error);
      setStatus(`Backup export failed: ${error.message || error}`);
    }
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedEntries = Array.isArray(parsed.savedEntries) ? parsed.savedEntries : [parsed];
      const imported = await importEntriesToDb(importedEntries);
      await refreshList();
      setStatus(`Imported ${imported} entry/entries into SQLite.`);
    } catch (error) {
      console.error(error);
      setStatus(`Import failed: ${error.message || error}`);
    } finally {
      event.target.value = "";
    }
  };

  const importHeroMasterJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalizedHeroes = normalizeFribbelsHeroes(parsed);
      const db = await getDb();
      await upsertHeroes(db, normalizedHeroes);
      await refreshMasterDataStatus(`Imported ${normalizedHeroes.length} heroes into SQLite`);
    } catch (error) {
      console.error(error);
      setStatus(`Hero import failed: ${error.message || error}`);
    } finally {
      event.target.value = "";
    }
  };

  const importArtifactMasterJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalizedArtifacts = normalizeFribbelsArtifacts(parsed);
      const db = await getDb();
      await upsertArtifacts(db, normalizedArtifacts);
      await refreshMasterDataStatus(`Imported ${normalizedArtifacts.length} artifacts into SQLite`);
    } catch (error) {
      console.error(error);
      setStatus(`Artifact import failed: ${error.message || error}`);
    } finally {
      event.target.value = "";
    }
  };

  const copyDiscord = async () => {
    try {
      await navigator.clipboard.writeText(buildDiscordSummary(entry, artifacts));
      setStatus("Discord summary copied to clipboard.");
    } catch (error) {
      console.error(error);
      setStatus(`Discord copy failed: ${error.message || error}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-6">
      <div className="mx-auto max-w-[2400px] space-y-5 px-2">
        <header className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-slate-300">
                <Shield size={16} /> Epic Seven Guild War Tracker
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-50 md:text-5xl">Defense Scout Interface</h1>
              <p className="mt-3 max-w-2xl text-slate-400">
                SQLite desktop version with Fribbels master data, custom image icons, JSON import/export, and Discord copy output.
              </p>
            </div>

            <div className="relative flex items-start gap-2">
              <button
                onClick={newEntry}
                className="inline-flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm hover:bg-slate-800"
              >
                <Plus className="mr-2 h-4 w-4" /> New opponent
              </button>

              <button
                onClick={() => setActionsOpen((value) => !value)}
                className="inline-flex items-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
              >
                <MoreVertical className="mr-2 h-4 w-4" /> Actions
              </button>

              {actionsOpen && (
                <div className="absolute right-0 top-12 z-30 w-56 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-xl">
                  <button
                    onClick={() => {
                      saveEntry();
                      setActionsOpen(false);
                    }}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                  >
                    <Save className="mr-2 h-4 w-4" /> Save to SQLite
                  </button>

                  <button
                    onClick={() => {
                      exportCurrentEntry();
                      setActionsOpen(false);
                    }}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                  >
                    <Download className="mr-2 h-4 w-4" /> Export entry
                  </button>

                  <button
                    onClick={() => {
                      exportAllEntries();
                      setActionsOpen(false);
                    }}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                  >
                    <FolderArchive className="mr-2 h-4 w-4" /> Export backup
                  </button>

                  <label className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800">
                    <Upload className="mr-2 h-4 w-4" /> Import JSON
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(event) => {
                        importJson(event);
                        setActionsOpen(false);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center gap-2">
                <Users size={18} />
                <h2 className="font-bold text-slate-100">Opponent</h2>
              </div>
              <Field
                label="Current opponent name"
                value={entry.opponent}
                onChange={(value) => setEntry((current) => ({ ...current, opponent: value }))}
                placeholder="e.g. 315 lidi"
              />
              <div className="mt-3">
                <Field
                  label="Note"
                  value={entry.note}
                  onChange={(value) => setEntry((current) => ({ ...current, note: value }))}
                  placeholder="Optional scouting note"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
              <div className="mb-3 flex items-center gap-2">
                <DatabaseIcon size={17} />
                <h2 className="font-bold text-slate-100">SQLite</h2>
              </div>
              <p className="mb-3 text-xs font-medium text-slate-400">{status}</p>
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 shadow-sm hover:bg-slate-800">
                  <Upload className="mr-2 h-3 w-3" /> Import heroes
                  <input type="file" accept="application/json" onChange={importHeroMasterJson} className="hidden" />
                </label>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 shadow-sm hover:bg-slate-800">
                  <Upload className="mr-2 h-3 w-3" /> Import artifacts
                  <input type="file" accept="application/json" onChange={importArtifactMasterJson} className="hidden" />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
              <div className="mb-3 flex items-center gap-2">
                <Search size={17} />
                <h2 className="font-bold text-slate-100">Saved entries</h2>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search..."
                className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
              />

              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {filteredEntries.length === 0 ? (
                  <p className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-500">No saved opponents yet.</p>
                ) : (
                  filteredEntries.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-3 transition ${
                        selectedId === item.id ? "border-indigo-500 bg-slate-950" : "border-slate-800 bg-slate-950"
                      }`}
                    >
                      <button type="button" onClick={() => loadEntry(item)} className="w-full text-left">
                        <p className="font-semibold text-slate-100">{item.opponent}</p>
                        <p className="text-xs text-slate-500">Updated: {new Date(item.updatedAt).toLocaleString()}</p>
                      </button>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => loadEntry(item)} className="inline-flex h-8 items-center rounded-xl border border-slate-700 px-2 text-xs text-slate-200">
                          <RotateCcw className="mr-1 h-3 w-3" /> Load
                        </button>
                        <button onClick={() => deleteEntry(item.id)} className="inline-flex h-8 items-center rounded-xl border border-slate-700 px-2 text-xs text-red-400">
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            <RoundPanel roundKey="R1" heroes={entry.rounds.R1} heroMaster={heroes} artifactMaster={artifacts} onHeroChange={updateHero} />
            <RoundPanel roundKey="R2" heroes={entry.rounds.R2} heroMaster={heroes} artifactMaster={artifacts} onHeroChange={updateHero} />
            <SummaryTable entry={entry} artifactMaster={artifacts} onCopyDiscord={copyDiscord} />
          </div>
        </div>
      </div>
    </main>
  );
}
