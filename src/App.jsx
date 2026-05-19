import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import { createClient } from "@supabase/supabase-js";
import {
  Plus, Save, Search, Trash2, RotateCcw, Swords, Shield, Users, Image as ImageIcon, X,
  Download, Upload, Copy, FolderArchive, MoreVertical, Database as DatabaseIcon,
} from "lucide-react";

const DB_URL = "sqlite:e7_gw_tracker.db";


// Do NOT use the service_role key in the app.
const SUPABASE_URL = "https://xihgqvybglezyyargzvm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpaGdxdnliZ2xlenl5YXJnenZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDUxMzgsImV4cCI6MjA5NDc4MTEzOH0.H4_xRJ3csHyhbio5WDc4o6t3Ui98WFRgKMQl8qr_TNM";

const FRIBBELS_HERO_DATA_URL = "https://raw.githubusercontent.com/fribbels/Fribbels-Epic-7-Optimizer/main/data/cache/herodata.json";
const FRIBBELS_ARTIFACT_DATA_URL = "https://raw.githubusercontent.com/fribbels/Fribbels-Epic-7-Optimizer/main/data/cache/artifactdata.json";
const STAT_FIELDS = ["ATK", "DEF", "HP", "Speed", "EFF", "ER"];

const SET_OPTIONS = [
  { name: "Immunity", image: "icons/sets/immunity.png", fallback: "🛡️" },
  { name: "Counter", image: "icons/sets/counter.png", fallback: "↩️" },
  { name: "Riposte", image: "icons/sets/riposte.png", fallback: "⚔️" },
  { name: "Warfare", image: "icons/sets/warfare.png", fallback: "🔥" },
  { name: "Pursuit", image: "icons/sets/pursuit.png", fallback: "🏹" },
  { name: "Protection", image: "icons/sets/protection.png", fallback: "🛡" },
  { name: "Injury", image: "icons/sets/injury.png", fallback: "🩸" },
  { name: "Lifesteal", image: "icons/sets/lifesteal.png", fallback: "💚" },
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
  { id: "ran", name: "Ran", class: "Thief", element: "Ice", rarity: 5, icon: "", thumbnail: "" },
];

const ARTIFACT_MASTER_DATA = [
  { id: "aurius", name: "Aurius", class: "Knight", rarity: 4, code: "", attack: null, health: null, defense: null },
  { id: "proof-of-valor", name: "Proof of Valor", class: "", rarity: 5, code: "", attack: null, health: null, defense: null },
  { id: "guiding-light", name: "Guiding Light", class: "Ranger", rarity: 5, code: "", attack: null, health: null, defense: null },
];

function uid() {
  return crypto.randomUUID();
}

function slugify(value) {
  return String(value || "unnamed")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "unnamed";
}

function mapFribbelsRole(role) {
  const map = {
    warrior: "Warrior",
    knight: "Knight",
    assassin: "Thief",
    ranger: "Ranger",
    mage: "Mage",
    manauser: "Soul Weaver",
  };
  return map[String(role || "").toLowerCase()] || "";
}

function mapFribbelsElement(attribute) {
  const map = { fire: "Fire", ice: "Ice", wind: "Earth", light: "Light", dark: "Dark" };
  return map[String(attribute || "").toLowerCase()] || attribute || "";
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
    roundNotes: { R1: "", R2: "" },
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
    throw new Error("SQLite could not be loaded. Check Tauri SQL plugin and permissions.");
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
      round1_note TEXT,
      round2_note TEXT,
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
  await ensureColumn(db, "opponents", "round1_note", "TEXT");
  await ensureColumn(db, "opponents", "round2_note", "TEXT");

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
      // try next
    }
  }
  return null;
}

async function fetchJsonFromUrl(url) {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not fetch data. Status: ${response.status}`);
  }

  return await response.json();
}

async function importBundledMasterData(db) {
  const rawHeroes = await fetchBundledJson(["./data/herodata.json", "data/herodata.json", "/data/herodata.json"]);
  if (rawHeroes) await upsertHeroes(db, normalizeFribbelsHeroes(rawHeroes));

  const rawArtifacts = await fetchBundledJson(["./data/artifactdata.json", "data/artifactdata.json", "/data/artifactdata.json"]);
  if (rawArtifacts) await upsertArtifacts(db, normalizeFribbelsArtifacts(rawArtifacts));
}


async function updateMasterDataFromFribbels() {
  const [rawHeroes, rawArtifacts] = await Promise.all([
    fetchJsonFromUrl(FRIBBELS_HERO_DATA_URL),
    fetchJsonFromUrl(FRIBBELS_ARTIFACT_DATA_URL),
  ]);

  const heroes = normalizeFribbelsHeroes(rawHeroes);
  const artifacts = normalizeFribbelsArtifacts(rawArtifacts);

  if (heroes.length < 100) {
    throw new Error(`Hero data looks wrong. Only ${heroes.length} heroes found.`);
  }

  if (artifacts.length < 50) {
    throw new Error(`Artifact data looks wrong. Only ${artifacts.length} artifacts found.`);
  }

  const db = await getDb();

  await upsertHeroes(db, heroes);
  await upsertArtifacts(db, artifacts);

  return {
    heroesCount: heroes.length,
    artifactsCount: artifacts.length,
  };
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
    "SELECT id, name AS opponent, note, round1_note AS round1Note, round2_note AS round2Note, created_at AS createdAt, updated_at AS updatedAt FROM opponents ORDER BY updated_at DESC"
  );
}

async function loadEntryFromDb(opponentId) {
  const db = await getDb();
  const opponents = await db.select(
    "SELECT id, name AS opponent, note, round1_note AS round1Note, round2_note AS round2Note, created_at AS createdAt, updated_at AS updatedAt FROM opponents WHERE id = ?",
    [opponentId]
  );

  if (!opponents[0]) return null;

  const rows = await db.select("SELECT * FROM scout_entries WHERE opponent_id = ? ORDER BY round_key ASC, slot_number ASC", [opponentId]);

  const entry = {
    ...opponents[0],
    roundNotes: {
      R1: opponents[0].round1Note ?? "",
      R2: opponents[0].round2Note ?? "",
    },
    rounds: {
      R1: [blankHero(), blankHero(), blankHero()],
      R2: [blankHero(), blankHero(), blankHero()],
    },
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
    `INSERT INTO opponents (id, name, note, round1_note, round2_note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       note = excluded.note,
       round1_note = excluded.round1_note,
       round2_note = excluded.round2_note,
       updated_at = excluded.updated_at`,
    [
      entry.id,
      opponent,
      entry.note ?? "",
      entry.roundNotes?.R1 ?? "",
      entry.roundNotes?.R2 ?? "",
      createdAt,
      updatedAt,
    ]
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

  return {
    ...entry,
    opponent,
    createdAt,
    updatedAt,
    roundNotes: {
      R1: entry.roundNotes?.R1 ?? "",
      R2: entry.roundNotes?.R2 ?? "",
    },
  };
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
      await saveEntryToDb({ ...entry, roundNotes: entry.roundNotes ?? { R1: "", R2: "" } });
      imported += 1;
    }
  }
  return imported;
}

async function saveJsonNextToExe(filename, payload) {
  const content = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return await invoke("save_json_next_to_exe", { filename, content });
}

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY in App.jsx.");
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function getRoundDefenseHeroNames(entry, roundKey) {
  return (entry.rounds?.[roundKey] ?? [])
    .map((hero) => normalizeHeroEntry(hero).name)
    .map((name) => String(name || "").trim())
    .filter(Boolean);
}

async function fetchCounterGuidesForDefense(defenseHeroes) {
  const names = defenseHeroes
    .map((name) => String(name || "").trim())
    .filter(Boolean);

  if (names.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("counter_guides")
    .select("id, defense_heroes, offense_heroes, notes, rating, author, source, created_at")
    .eq("is_public", true)

    // Order-independent exact team match:
    // DB defense must contain all searched heroes.
    .contains("defense_heroes", names)

    // Searched heroes must contain all DB defense heroes.
    // This prevents a 2-hero search from matching a 3-hero defense by accident.
    .containedBy("defense_heroes", names)

    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function submitCounterGuide({ defenseHeroes, offenseHeroes, notes, rating, author }) {
  const cleanDefenseHeroes = defenseHeroes
    .map((name) => String(name || "").trim())
    .filter(Boolean);

  const cleanOffenseHeroes = offenseHeroes
    .map((name) => String(name || "").trim())
    .filter(Boolean);

  if (cleanDefenseHeroes.length === 0) {
    throw new Error("Defense heroes are missing.");
  }

  if (cleanOffenseHeroes.length === 0) {
    throw new Error("Offense heroes are missing.");
  }

  const supabase = getSupabaseClient();

  const { error } = await supabase.from("counter_guides").insert({
    defense_heroes: cleanDefenseHeroes,
    offense_heroes: cleanOffenseHeroes,
    notes: notes?.trim() || null,
    rating: rating || "Good",
    author: author?.trim() || "Community",
    source: "app",
    is_public: false,
  });

  if (error) {
    throw new Error(error.message);
  }
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
  const artifactName = (artifactId) =>
    artifactMaster.find((artifact) => artifact.id === artifactId)?.name ?? "?";

  const statLine = (hero) =>
    `ATK ${hero.stats.ATK || "?"} | DEF ${hero.stats.DEF || "?"} | HP ${hero.stats.HP || "?"} | SPD ${
      hero.stats.Speed || "?"
    } | EFF ${hero.stats.EFF || "?"} | ER ${hero.stats.ER || "?"}`;

  const lines = [];

  if (entry.opponent) {
  lines.push(`**${entry.opponent}**`);
  }

  if (entry.note) {
    lines.push(`Note: ${entry.note}`);
  }

  if (entry.opponent || entry.note) {
    lines.push("");
  }

  for (const roundKey of ["R1", "R2"]) {
    lines.push(roundKey === "R1" ? "__Round 1__" : "__Round 2__");

    const roundNote = entry.roundNotes?.[roundKey] ?? "";
    if (roundNote) {
      lines.push(`Team note: ${roundNote}`);
    }

    lines.push("");

    entry.rounds[roundKey].forEach((hero, index) => {
      const normalizedHero = normalizeHeroEntry(hero);
      const sets = normalizedHero.sets.length ? normalizedHero.sets.join(", ") : "?";
      const artifact = artifactName(normalizedHero.artifactId);

      lines.push(`${index + 1}. **${normalizedHero.name || "?"}**`);
      lines.push(statLine(normalizedHero));
      lines.push(`**Sets:** ${sets}`);
      lines.push(`**Artifact:** ${artifact}`);

      if (normalizedHero.additionalNotes) {
        lines.push(`**Additional note:** ${normalizedHero.additionalNotes}`);
      }

      lines.push("");
    });
  }

  return lines.join("\n").trim();
}

function sanitizeRestrictedInput(value, allowedCharacters) {
  const allowed = new Set(allowedCharacters);
  return String(value || "")
    .split("")
    .filter((character) => allowed.has(character))
    .join("");
}

const HP_ALLOWED_CHARACTERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "+", "~", "<", ">", "k", "K"];
const SPEED_ALLOWED_CHARACTERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "~", "<", ">"];

function RestrictedField({ label, value, onChange, placeholder = "", allowedCharacters }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      <input
        value={value}
        onBeforeInput={(event) => {
          const data = event.data ?? "";
          if (data && sanitizeRestrictedInput(data, allowedCharacters) !== data) {
            event.preventDefault();
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          const pasted = event.clipboardData.getData("text");
          const currentTarget = event.currentTarget;
          const start = currentTarget.selectionStart ?? String(value || "").length;
          const end = currentTarget.selectionEnd ?? String(value || "").length;
          const currentValue = String(value || "");
          const nextValue =
            currentValue.slice(0, start) +
            sanitizeRestrictedInput(pasted, allowedCharacters) +
            currentValue.slice(end);
          onChange(sanitizeRestrictedInput(nextValue, allowedCharacters));
        }}
        onChange={(event) => onChange(sanitizeRestrictedInput(event.target.value, allowedCharacters))}
        placeholder={placeholder}
        inputMode="text"
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-950"
      />
    </label>
  );
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
  const [open, setOpen] = useState(true);

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

  const classMeta = getClassMeta(normalizedHero.class);
  const selectedArtifactName = artifacts.find((artifact) => artifact.id === normalizedHero.artifactId)?.name ?? "No artifact";

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

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/20">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left hover:bg-slate-800/70"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hero {heroIndex + 1}</p>
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-100">
            <AppIcon meta={classMeta} size={18} />
            <span className="truncate">{normalizedHero.name || "Unnamed Hero"}</span>
          </h3>
          <p className="mt-1 truncate text-xs text-slate-500">
            HP {normalizedHero.stats.HP || "?"} · SPD {normalizedHero.stats.Speed || "?"} · {selectedArtifactName}
          </p>
        </div>

        <div className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
          {open ? "Hide" : "Show"}
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-800 p-4">
          <div className="grid gap-3 xl:grid-cols-[1.35fr_1.35fr_0.65fr_0.65fr]">
            <SearchableSelect
              label="Hero"
              value={normalizedHero.heroId}
              onChange={changeHero}
              options={heroOptions}
              placeholder="Search hero..."
            />

            <SearchableSelect
              label={`Artifact (${normalizedHero.class})`}
              value={normalizedHero.artifactId}
              onChange={(value) => updateHero({ artifactId: value })}
              options={artifactOptions}
              placeholder="Search artifact..."
            />

            <RestrictedField
              label="HP"
              value={normalizedHero.stats.HP}
              onChange={(value) => updateStat("HP", value)}
              placeholder="e.g. 25k, ~25000, >20k"
              allowedCharacters={HP_ALLOWED_CHARACTERS}
            />

            <RestrictedField
              label="Speed"
              value={normalizedHero.stats.Speed}
              onChange={(value) => updateStat("Speed", value)}
              placeholder="e.g. 285+, ~250, >270"
              allowedCharacters={SPEED_ALLOWED_CHARACTERS}
            />
          </div>

          <Field
            label="Additional Notes"
            value={normalizedHero.additionalNotes}
            onChange={(value) => updateHero({ additionalNotes: value })}
            placeholder="Optional note"
          />

          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Sets</p>
            <div className="flex flex-wrap gap-2">
              {SET_OPTIONS.map((setOption) => {
                const active = normalizedHero.sets.includes(setOption.name);
                return (
                  <button
                    key={setOption.name}
                    type="button"
                    onClick={() => toggleSet(setOption.name)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:bg-slate-800"
                    }`}
                  >
                    <AppIcon meta={setOption} size={22} />
                    {setOption.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseNumberInput(value) {
  const match = String(value || "").replace(",", ".").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function calculateEnemySpeed(mySpeedRaw, enemyCrRaw, mode) {
  const mySpeed = parseNumberInput(mySpeedRaw);
  const enemyCr = parseNumberInput(enemyCrRaw);

  if (!Number.isFinite(mySpeed) || mySpeed <= 0) {
    return {
      valid: false,
      message: "Enter your unit speed.",
    };
  }

  if (!Number.isFinite(enemyCr) || enemyCr < 0) {
    return {
      valid: false,
      message: "Enter enemy CR percentage.",
    };
  }

  const displayedEnemyCr = mode === "second" ? 100 + enemyCr : enemyCr;

  // Normal estimate without start CR RNG.
  const estimatedSpeed = mySpeed * (displayedEnemyCr / 100);

  // Epic Seven start CR RNG: every unit can start between 0% and 5%.
  // Extreme 1: I have 0%, enemy has 5% => enemy speed estimate becomes lower.
  // Extreme 2: I have 5%, enemy has 0% => enemy speed estimate becomes higher.
  const lowestPossibleSpeed = mySpeed * ((displayedEnemyCr - 5) / 100);
  const highestPossibleSpeed = mySpeed * ((displayedEnemyCr + 5) / 100);

  return {
    valid: true,
    mySpeed,
    enemyCr,
    mode,
    displayedEnemyCr,
    estimatedSpeed,
    estimatedSpeedRounded: Math.round(estimatedSpeed),
    lowestPossibleSpeed,
    highestPossibleSpeed,
    lowestPossibleSpeedRounded: Math.round(lowestPossibleSpeed),
    highestPossibleSpeedRounded: Math.round(highestPossibleSpeed),
  };
}

function SpeedCalculator({ roundKey }) {
  const [mySpeed, setMySpeed] = useState("");
  const [enemyCr, setEnemyCr] = useState("");
  const [mode, setMode] = useState("first");

  const result = useMemo(
    () => calculateEnemySpeed(mySpeed, enemyCr, mode),
    [mySpeed, enemyCr, mode]
  );

  const formulaText =
    mode === "second"
      ? "Estimated speed = my speed × (100% + enemy current CR%)"
      : "Estimated speed = my speed × enemy current CR%";

  const crRngText =
    "Start CR RNG can shift the estimate because each unit can start with 0–5% CR. The two extremes are: I start at 0% and enemy starts at 5%, or I start at 5% and enemy starts at 0%.";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="font-bold text-slate-100">
          Speed Calculator · {roundKey === "R1" ? "Round 1" : "Round 2"}
        </h3>
        <p className="text-xs text-slate-400">
          Estimate enemy speed from CR position.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
        <Field
          label="My unit speed"
          value={mySpeed}
          onChange={setMySpeed}
          placeholder="e.g. 300"
        />

        <Field
          label="Enemy CR %"
          value={enemyCr}
          onChange={setEnemyCr}
          placeholder={mode === "second" ? "e.g. 20" : "e.g. 85"}
        />

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            Situation
          </span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-950"
          >
            <option value="first">I go first</option>
            <option value="second">I go second / enemy already moved</option>
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        {!result.valid ? (
          <p className="text-sm text-slate-500">{result.message}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">{formulaText}</p>

            <p className="text-2xl font-black text-slate-50">
              Estimated speed:{" "}
              <span className="text-indigo-400">
                {result.estimatedSpeedRounded}
              </span>
            </p>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                With 0–5% start CR RNG
              </p>

              <p className="text-sm text-slate-300">
                Possible range:{" "}
                <span className="font-bold text-emerald-400">
                  {result.lowestPossibleSpeedRounded}
                </span>{" "}
                –{" "}
                <span className="font-bold text-red-400">
                  {result.highestPossibleSpeedRounded}
                </span>
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Exact range: {result.lowestPossibleSpeed.toFixed(2)} –{" "}
                {result.highestPossibleSpeed.toFixed(2)}
              </p>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              <p>
                Effective enemy CR used:{" "}
                <span className="text-slate-300">
                  {result.displayedEnemyCr.toFixed(2)}%
                </span>
              </p>
              <p>{crRngText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoundPanel({
  roundKey,
  heroes,
  heroMaster,
  artifactMaster,
  roundNote,
  isOpen,
  onToggle,
  wideHeroLayout,
  onRoundNoteChange,
  onHeroChange,
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-3xl p-4 text-left hover:bg-slate-900/70"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-2xl bg-indigo-600 p-2 text-white">
            <Swords size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-100">{roundKey === "R1" ? "Round 1" : "Round 2"}</h2>
            <p className="truncate text-sm text-slate-400">
              {heroes.map((hero) => normalizeHeroEntry(hero).name || "Unnamed").join(" · ")}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
          {isOpen ? "Collapse" : "Expand"}
        </div>
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-slate-800 p-4">
          <Field
            label={`${roundKey === "R1" ? "Round 1" : "Round 2"} Team Note`}
            value={roundNote}
            onChange={(value) => onRoundNoteChange(roundKey, value)}
            placeholder="Optional note for this team"
          />

          <SpeedCalculator roundKey={roundKey} />

          <div className={wideHeroLayout ? "grid gap-3 xl:grid-cols-3" : "space-y-3"}>
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
        </div>
      )}
    </section>
  );
}

function TemporaryScreenshots({ roundKey, screenshots, onAddScreenshots, onRemoveScreenshot }) {
  const inputId = `screenshot-upload-${roundKey}`;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-slate-100">
            <ImageIcon size={18} />
            Temporary Screenshots
          </h3>
          <p className="text-xs text-slate-400">
            Add quick CR bar screenshots. They are not saved to SQLite and disappear after restart.
          </p>
        </div>

        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-800"
        >
          <Upload className="mr-2 h-3 w-3" />
          Add
        </label>

        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            onAddScreenshots(roundKey, event.target.files);
            event.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {screenshots.length === 0 ? (
        <p className="rounded-xl bg-slate-950 p-3 text-sm text-slate-500">
          No screenshots added.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {screenshots.map((screenshot) => (
            <div
              key={screenshot.id}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
                <p className="truncate text-xs text-slate-400">{screenshot.name}</p>
                <button
                  type="button"
                  onClick={() => onRemoveScreenshot(roundKey, screenshot.id)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                  title="Remove screenshot"
                >
                  <X size={15} />
                </button>
              </div>

              <img
                src={screenshot.url}
                alt={screenshot.name}
                className="max-h-64 w-full object-contain"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CounterSuggestions({ entry, heroMaster }) {
  const [activeRound, setActiveRound] = useState("R1");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("Select a round and search for matching community counters.");
  const [loading, setLoading] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [offenseHeroIds, setOffenseHeroIds] = useState(["", "", ""]);
  const [counterNotes, setCounterNotes] = useState("");
  const [counterRating, setCounterRating] = useState("Good");
  const [counterAuthor, setCounterAuthor] = useState("");

  const defenseHeroes = useMemo(() => getRoundDefenseHeroNames(entry, activeRound), [entry, activeRound]);

  const heroOptions = useMemo(
    () =>
      heroMaster.map((item) => ({
        value: item.id,
        label: `${item.name} · ${item.class}${item.rarity ? ` · ${item.rarity}★` : ""}`,
        meta: item.element || "",
        searchText: `${item.name} ${item.class} ${item.element || ""}`.toLowerCase(),
      })),
    [heroMaster]
  );

  const offenseHeroNames = offenseHeroIds
    .map((heroId) => heroMaster.find((hero) => hero.id === heroId)?.name ?? "")
    .filter(Boolean);

  const findCounters = async () => {
    try {
      setLoading(true);
      setStatus(`Searching counters for ${activeRound}...`);

      const guides = await fetchCounterGuidesForDefense(defenseHeroes);
      setResults(guides);

      if (guides.length === 0) {
        setStatus("No matching counters found yet.");
      } else {
        setStatus(`Found ${guides.length} matching counter(s).`);
      }
    } catch (error) {
      console.error(error);
      setStatus(`Counter search failed: ${error.message || error}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const submitCounter = async () => {
    try {
      setSubmitting(true);
      setStatus("Submitting counter for review...");

      await submitCounterGuide({
        defenseHeroes,
        offenseHeroes: offenseHeroNames,
        notes: counterNotes,
        rating: counterRating,
        author: counterAuthor,
      });

      setStatus("Counter submitted. It will become public after approval.");
      setSubmitOpen(false);
      setOffenseHeroIds(["", "", ""]);
      setCounterNotes("");
      setCounterRating("Good");
    } catch (error) {
      console.error(error);
      setStatus(`Counter submit failed: ${error.message || error}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-bold text-slate-100">Counter Suggestions</h2>
          <p className="text-sm text-slate-400">
            Search public counters or submit a new counter for review.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["R1", "R2"].map((roundKey) => (
            <button
              key={roundKey}
              type="button"
              onClick={() => {
                setActiveRound(roundKey);
                setResults([]);
                setStatus("Select a round and search for matching community counters.");
              }}
              className={`rounded-xl px-3 py-2 text-xs font-medium ${
                activeRound === roundKey
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {roundKey === "R1" ? "Round 1" : "Round 2"}
            </button>
          ))}

          <button
            type="button"
            onClick={findCounters}
            disabled={loading || defenseHeroes.length === 0}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Searching..." : "Find counters"}
          </button>

          <button
            type="button"
            onClick={() => setSubmitOpen((value) => !value)}
            disabled={defenseHeroes.length === 0}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitOpen ? "Hide submit" : "Submit counter"}
          </button>
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-slate-950 p-3 text-sm text-slate-400">
        <p>
          Defense:{" "}
          <span className="font-semibold text-slate-200">
            {defenseHeroes.length ? defenseHeroes.join(" / ") : "No heroes selected"}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-500">{status}</p>
      </div>

      {submitOpen && (
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="mb-3">
            <h3 className="font-bold text-slate-100">Submit counter for {activeRound === "R1" ? "Round 1" : "Round 2"}</h3>
            <p className="text-xs text-slate-500">
              Uploaded counters are saved as private first and become public after approval.
            </p>
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <SearchableSelect
                key={`offense-hero-${index}`}
                label={`Offense Hero ${index + 1}`}
                value={offenseHeroIds[index]}
                onChange={(value) =>
                  setOffenseHeroIds((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? value : item))
                  )
                }
                options={heroOptions}
                placeholder="Search offense hero..."
              />
            ))}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">Rating</span>
              <select
                value={counterRating}
                onChange={(event) => setCounterRating(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-950"
              >
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Risky">Risky</option>
                <option value="Tech">Tech</option>
              </select>
            </label>

            <Field
              label="Author"
              value={counterAuthor}
              onChange={setCounterAuthor}
              placeholder="e.g. Gerry"
            />

            <Field
              label="Notes"
              value={counterNotes}
              onChange={setCounterNotes}
              placeholder="How does the counter work?"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Offense: {offenseHeroNames.length ? offenseHeroNames.join(" / ") : "No offense heroes selected"}
            </p>

            <button
              type="button"
              onClick={submitCounter}
              disabled={submitting || defenseHeroes.length === 0 || offenseHeroNames.length === 0}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit for review"}
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-3 xl:grid-cols-2">
          {results.map((guide) => (
            <article key={guide.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {guide.rating || "Counter"}
                </p>
                <p className="text-xs text-slate-500">
                  {guide.author ? `By ${guide.author}` : "Community"}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-slate-400">
                  Defense: <span className="font-semibold text-slate-200">{(guide.defense_heroes ?? []).join(" / ")}</span>
                </p>
                <p className="text-slate-400">
                  Offense: <span className="font-semibold text-emerald-400">{(guide.offense_heroes ?? []).join(" / ")}</span>
                </p>
                {guide.notes && <p className="text-slate-300">{guide.notes}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryTable({ entry, artifactMaster, onCopyDiscord }) {
  const rows = ["R1", "R2"].flatMap((roundKey) =>
    entry.rounds[roundKey].map((hero, index) => ({ roundKey, index, hero: normalizeHeroEntry(hero) }))
  );
  const artifactName = (artifactId) => artifactMaster.find((artifact) => artifact.id === artifactId)?.name ?? "—";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-bold text-slate-100">Summary</h2>
          <p className="text-sm text-slate-400">Copy the full defense as Discord-ready text.</p>
        </div>
        <button
          onClick={onCopyDiscord}
          className="inline-flex items-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
        >
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
  const [savedEntriesOpen, setSavedEntriesOpen] = useState(false);
  const [roundOpen, setRoundOpen] = useState({ R1: true, R2: true });
  const actionsMenuRef = useRef(null);
  const [temporaryScreenshots, setTemporaryScreenshots] = useState({
    R1: [],
    R2: [],
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (!actionsMenuRef.current) return;
      if (!actionsMenuRef.current.contains(event.target)) setActionsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const updateMasterData = async () => {
  try {
    setStatus("Updating master data from Fribbels...");

    const result = await updateMasterDataFromFribbels();

    const master = await loadMasterData();
    setHeroes(master.heroes.length ? master.heroes : HERO_MASTER_DATA);
    setArtifacts(master.artifacts.length ? master.artifacts : ARTIFACT_MASTER_DATA);

    setStatus(
      `Master data updated from Fribbels. Loaded ${result.heroesCount} heroes and ${result.artifactsCount} artifacts.`
    );
  } catch (error) {
    console.error(error);
    setStatus(`Master data update failed: ${error.message || error}`);
  }
};

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

  const openRoundCount = Number(roundOpen.R1) + Number(roundOpen.R2);
  const oneRoundOpen = openRoundCount === 1;
  const roundGridClass =
    openRoundCount === 2
      ? "grid gap-4 2xl:grid-cols-2"
      : oneRoundOpen
      ? "mx-auto grid max-w-[1700px] gap-4"
      : "grid gap-4 2xl:grid-cols-2";

  const toggleRound = (roundKey) => {
    setRoundOpen((current) => ({
      ...current,
      [roundKey]: !current[roundKey],
    }));
  };

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

  const updateRoundNote = (roundKey, value) => {
    setEntry((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      roundNotes: {
        ...(current.roundNotes ?? { R1: "", R2: "" }),
        [roundKey]: value,
      },
    }));
  };

  const addTemporaryScreenshots = (roundKey, files) => {
  const selectedFiles = Array.from(files || []);
  if (selectedFiles.length === 0) return;

  const nextScreenshots = selectedFiles
    .filter((file) => file.type.startsWith("image/"))
    .map((file) => ({
      id: uid(),
      name: file.name,
      url: URL.createObjectURL(file),
    }));

  setTemporaryScreenshots((current) => ({
    ...current,
    [roundKey]: [...(current[roundKey] ?? []), ...nextScreenshots],
  }));
};

  const removeTemporaryScreenshot = (roundKey, screenshotId) => {
    setTemporaryScreenshots((current) => {
      const removed = current[roundKey]?.find((item) => item.id === screenshotId);

      if (removed?.url) {
        URL.revokeObjectURL(removed.url);
      }

      return {
        ...current,
        [roundKey]: (current[roundKey] ?? []).filter((item) => item.id !== screenshotId),
      };
    });
  };

  useEffect(() => {
    return () => {
      for (const roundKey of ["R1", "R2"]) {
        for (const screenshot of temporaryScreenshots[roundKey] ?? []) {
          URL.revokeObjectURL(screenshot.url);
        }
      }
    };
  }, [temporaryScreenshots]);

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

  const exportCurrentEntry = async () => {
    try {
      const safeName = slugify(entry.opponent || "unnamed-opponent");
      const date = new Date().toISOString().slice(0, 10);
      const filename = `${date}-${safeName}.json`;
      const savedPath = await saveJsonNextToExe(filename, entry);
      setStatus(`Current entry saved: ${savedPath}`);
    } catch (error) {
      console.error(error);
      setStatus(`Export failed: ${error.message || error}`);
    }
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
        version: 7,
        exportedAt: new Date().toISOString(),
        savedEntries: fullEntries,
      };

      const date = new Date().toISOString().slice(0, 10);
      const filename = `backup-${date}.json`;
      const savedPath = await saveJsonNextToExe(filename, payload);
      setStatus(`Full backup saved: ${savedPath}`);
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
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                <Shield size={14} /> Epic Seven Guild War Tracker
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-50 md:text-3xl">Epic Seven Guild War Scout</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                Scout defenses, calculate speed ranges, and export Discord notes.
              </p>
            </div>

            <div ref={actionsMenuRef} className="relative flex flex-wrap items-start gap-2">
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
                <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-xl">
                  <button onClick={() => { saveEntry(); setActionsOpen(false); }} className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800">
                    <Save className="mr-2 h-4 w-4" /> Save to SQLite
                  </button>

                  <button onClick={() => { updateMasterData(); setActionsOpen(false); }} className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800">
                    <Download className="mr-2 h-4 w-4" /> Update master data
                  </button>

                  <label className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800">
                    <Upload className="mr-2 h-4 w-4" /> Import heroes JSON
                    <input type="file" accept="application/json" onChange={(event) => { importHeroMasterJson(event); setActionsOpen(false); }} className="hidden" />
                  </label>

                  <label className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800">
                    <Upload className="mr-2 h-4 w-4" /> Import artifacts JSON
                    <input type="file" accept="application/json" onChange={(event) => { importArtifactMasterJson(event); setActionsOpen(false); }} className="hidden" />
                  </label>

                  <button onClick={() => { exportCurrentEntry(); setActionsOpen(false); }} className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800">
                    <Download className="mr-2 h-4 w-4" /> Export entry
                  </button>

                  <button onClick={() => { exportAllEntries(); setActionsOpen(false); }} className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800">
                    <FolderArchive className="mr-2 h-4 w-4" /> Export backup
                  </button>

                  <label className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800">
                    <Upload className="mr-2 h-4 w-4" /> Import scout JSON
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

                  <button
                    onClick={() => setSavedEntriesOpen((value) => !value)}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                  >
                    <Search className="mr-2 h-4 w-4" /> Saved entries
                  </button>

                  {savedEntriesOpen && (
                    <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950 p-2">
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search saved opponents..."
                        className="mb-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
                      />

                      <div className="max-h-64 space-y-2 overflow-y-auto">
                        {filteredEntries.length === 0 ? (
                          <p className="rounded-xl bg-slate-900 p-3 text-sm text-slate-500">No saved opponents yet.</p>
                        ) : (
                          filteredEntries.map((item) => (
                            <div
                              key={item.id}
                              className={`rounded-xl border p-3 transition ${
                                selectedId === item.id ? "border-indigo-500 bg-slate-900" : "border-slate-800 bg-slate-900"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  loadEntry(item);
                                  setActionsOpen(false);
                                }}
                                className="w-full text-left"
                              >
                                <p className="font-semibold text-slate-100">{item.opponent}</p>
                                <p className="text-xs text-slate-500">Updated: {new Date(item.updatedAt).toLocaleString()}</p>
                              </button>
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => {
                                    loadEntry(item);
                                    setActionsOpen(false);
                                  }}
                                  className="inline-flex h-8 items-center rounded-xl border border-slate-700 px-2 text-xs text-slate-200"
                                >
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
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users size={18} />
              <h2 className="font-bold text-slate-100">Opponent</h2>
            </div>
            <p className="text-xs text-slate-500">{status}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
            <Field
              label="Current opponent name"
              value={entry.opponent}
              onChange={(value) => setEntry((current) => ({ ...current, opponent: value }))}
              placeholder="e.g. 315 lidi"
            />
            <Field
              label="Note"
              value={entry.note}
              onChange={(value) => setEntry((current) => ({ ...current, note: value }))}
              placeholder="Optional scouting note"
            />
          </div>
        </section>

          <div className="space-y-6">
            <div className={roundGridClass}>
              <RoundPanel
                roundKey="R1"
                heroes={entry.rounds.R1}
                heroMaster={heroes}
                artifactMaster={artifacts}
                roundNote={entry.roundNotes?.R1 ?? ""}
                isOpen={roundOpen.R1}
                onToggle={() => toggleRound("R1")}
                wideHeroLayout={oneRoundOpen && roundOpen.R1}
                onRoundNoteChange={updateRoundNote}
                onHeroChange={updateHero}
              />

              <RoundPanel
                roundKey="R2"
                heroes={entry.rounds.R2}
                heroMaster={heroes}
                artifactMaster={artifacts}
                roundNote={entry.roundNotes?.R2 ?? ""}
                isOpen={roundOpen.R2}
                onToggle={() => toggleRound("R2")}
                wideHeroLayout={oneRoundOpen && roundOpen.R2}
                onRoundNoteChange={updateRoundNote}
                onHeroChange={updateHero}
              />
            </div>

            <CounterSuggestions entry={entry} heroMaster={heroes} />

            <SummaryTable entry={entry} artifactMaster={artifacts} onCopyDiscord={copyDiscord} />
          </div>
      </div>
    </main>
  );
}
