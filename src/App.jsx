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
  Image as ImageIcon,
  FolderArchive,
  Database as DatabaseIcon,
} from "lucide-react";

const DB_URL = "sqlite:e7_gw_tracker.db";

const STAT_FIELDS = ["ATK", "DEF", "HP", "Speed", "EFF", "ER"];

// Put your own images into these folders later:
// public/icons/sets/immunity.png
// public/icons/sets/counter.png
// public/icons/classes/knight.png
// public/icons/classes/warrior.png
// In Tauri/Vite, files inside public/ are reachable as /icons/...
const SET_OPTIONS = [
  { name: "Immunity", image: "/icons/sets/immunity.png", fallback: "🛡️" },
  { name: "Counter", image: "/icons/sets/counter.png", fallback: "↩️" },
  { name: "Riposte", image: "/icons/sets/riposte.png", fallback: "⚔️" },
  { name: "Warfare", image: "/icons/sets/warfare.png", fallback: "🔥" },
  { name: "Pursuit", image: "/icons/sets/pursuit.png", fallback: "🏹" },
  { name: "Protection", image: "/icons/sets/protection.png", fallback: "🛡" },
  { name: "Injury", image: "/icons/sets/injury.png", fallback: "🩸" },
];

const CLASS_OPTIONS = [
  { name: "Knight", image: "/icons/classes/knight.png", fallback: "🛡️" },
  { name: "Warrior", image: "/icons/classes/warrior.png", fallback: "🪓" },
  { name: "Thief", image: "/icons/classes/thief.png", fallback: "🗡️" },
  { name: "Ranger", image: "/icons/classes/ranger.png", fallback: "🏹" },
  { name: "Mage", image: "/icons/classes/mage.png", fallback: "🔮" },
  { name: "Soul Weaver", image: "/icons/classes/soul-weaver.png", fallback: "✨" },
];

const HERO_MASTER_DATA = [
  { id: "peira", name: "Peira", class: "Thief", element: "Ice" },
  { id: "luna", name: "Luna", class: "Warrior", element: "Ice" },
  { id: "yufine", name: "Yufine", class: "Warrior", element: "Earth" },
  { id: "ilynav", name: "Ilynav", class: "Knight", element: "Fire" },
  { id: "harunka", name: "Harunka", class: "Warrior", element: "Dark" },
  { id: "mercedes", name: "Mercedes", class: "Mage", element: "Fire" },
  { id: "ran", name: "Ran", class: "Thief", element: "Ice" },
  { id: "conqueror-lilias", name: "Conqueror Lilias", class: "Warrior", element: "Dark" },
  { id: "angel-of-light-angelica", name: "Angel of Light Angelica", class: "Mage", element: "Light" },
  { id: "karina", name: "ae-KARINA", class: "Knight", element: "Ice" },
];

const ARTIFACT_MASTER_DATA = [
  { id: "elbris", name: "Elbris Ritual Sword", class: "Knight" },
  { id: "aurius", name: "Aurius", class: "Knight" },
  { id: "adamant-shield", name: "Adamant Shield", class: "Knight" },
  { id: "noble-oath", name: "Noble Oath", class: "Knight" },
  { id: "holy-sacrifice", name: "Holy Sacrifice", class: "Knight" },
  { id: "uberius-tooth", name: "Uberius's Tooth", class: "Warrior" },
  { id: "sigurd-scythe", name: "Sigurd Scythe", class: "Warrior" },
  { id: "draco-plate", name: "Draco Plate", class: "Warrior" },
  { id: "merciless-glutton", name: "Merciless Glutton", class: "Warrior" },
  { id: "creation-destruction", name: "Creation & Destruction", class: "Warrior" },
  { id: "rhianna-luciella", name: "Rhianna & Luciella", class: "Thief" },
  { id: "alexas-basket", name: "Alexa's Basket", class: "Thief" },
  { id: "moonlight-dreamblade", name: "Moonlight Dreamblade", class: "Thief" },
  { id: "shepherd-hollow", name: "Shepherd of the Hollow", class: "Thief" },
  { id: "dust-devil", name: "Dust Devil", class: "Thief" },
  { id: "guiding-light", name: "Guiding Light", class: "Ranger" },
  { id: "song-of-stars", name: "Song of Stars", class: "Ranger" },
  { id: "bloodstone", name: "Bloodstone", class: "Ranger" },
  { id: "sashe-ithanes", name: "Sashe Ithanes", class: "Ranger" },
  { id: "infinity-basket", name: "Infinity Basket", class: "Ranger" },
  { id: "tagehel", name: "Tagehel's Ancient Book", class: "Mage" },
  { id: "abyssal-crown", name: "Abyssal Crown", class: "Mage" },
  { id: "eticas-scepter", name: "Etica's Scepter", class: "Mage" },
  { id: "iela-violin", name: "Iela Violin", class: "Mage" },
  { id: "necro-undine", name: "Necro & Undine", class: "Mage" },
  { id: "rod-amaryllis", name: "Rod of Amaryllis", class: "Soul Weaver" },
  { id: "celestine", name: "Celestine", class: "Soul Weaver" },
  { id: "waters-origin", name: "Water's Origin", class: "Soul Weaver" },
  { id: "idols-cheer", name: "Idol's Cheer", class: "Soul Weaver" },
  { id: "shimadra-staff", name: "Shimadra Staff", class: "Soul Weaver" },
];

function uid() {
  return crypto.randomUUID();
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
  return Object.values(raw || {}).map((hero) => ({
    id: hero._id || slugify(hero.name),
    name: hero.name,
    class: mapFribbelsRole(hero.role) || "Knight",
    element: mapFribbelsElement(hero.attribute),
    rarity: hero.rarity ?? null,
    icon: hero.assets?.icon ?? "",
    thumbnail: hero.assets?.thumbnail ?? "",
  })).filter((hero) => hero.id && hero.name);
}

function normalizeFribbelsArtifacts(raw) {
  return Object.values(raw || {}).map((artifact) => ({
    id: artifact.code || slugify(artifact.name),
    name: artifact.name,
    class: mapFribbelsRole(artifact.role),
    rarity: artifact.rarity ?? null,
    code: artifact.code ?? "",
    attack: artifact.stats?.attack ?? null,
    health: artifact.stats?.health ?? null,
    defense: artifact.stats?.defense ?? null,
  })).filter((artifact) => artifact.id && artifact.name);
}

function slugify(value) {
  return String(value || "unnamed")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "unnamed";
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
    speedNote: "",
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

async function ensureColumn(db, tableName, columnName, columnType) {
  try {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
  } catch {
    // Column already exists. SQLite has no simple ADD COLUMN IF NOT EXISTS.
  }
}

async function importBundledMasterData(db) {
  try {
    const heroResponse = await fetch("./data/herodata.json")
    if (heroResponse.ok) {
      const rawHeroes = await heroResponse.json();
      await upsertHeroes(db, normalizeFribbelsHeroes(rawHeroes));
    }
  } catch (error) {
    console.warn("Bundled hero data not found or invalid.", error);
  }

  try {
    const artifactResponse = await fetch("./data/artifactdata.json")
    if (artifactResponse.ok) {
      const rawArtifacts = await artifactResponse.json();
      await upsertArtifacts(db, normalizeFribbelsArtifacts(rawArtifacts));
    }
  } catch (error) {
    console.warn("Bundled artifact data not found or invalid.", error);
  }
}

async function upsertHeroes(db, heroes) {
  for (const hero of heroes) {
    await db.execute(
      `INSERT INTO heroes (id, name, class, element, rarity, icon, thumbnail)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
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
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
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
  await upsertHeroes(db, HERO_MASTER_DATA.map((hero) => ({ ...hero, rarity: null, icon: "", thumbnail: "" })));
  await upsertArtifacts(db, ARTIFACT_MASTER_DATA.map((artifact) => ({ ...artifact, rarity: null, code: artifact.id, attack: null, health: null, defense: null })));

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

  const rows = await db.select(
    "SELECT * FROM scout_entries WHERE opponent_id = ? ORDER BY round_key ASC, slot_number ASC",
    [opponentId]
  );

  const entry = {
    ...opponents[0],
    rounds: { R1: [blankHero(), blankHero(), blankHero()], R2: [blankHero(), blankHero(), blankHero()] },
  };

  for (const row of rows) {
    const hero = {
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
      speedNote: row.speed_note ?? "",
      artifactId: row.artifact_id ?? "",
      sets: JSON.parse(row.sets_json || "[]"),
    };

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
      const hero = entry.rounds[roundKey][i];

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
          hero.speedNote,
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
    `ATK ${hero.stats.ATK || "?"} | DEF ${hero.stats.DEF || "?"} | HP ${hero.stats.HP || "?"} | SPD ${hero.stats.Speed || "?"} | EFF ${hero.stats.EFF || "?"} | ER ${hero.stats.ER || "?"}`;

  const lines = [];
  lines.push(`**${entry.opponent || "Unnamed opponent"}**`);
  if (entry.note) lines.push(`_${entry.note}_`);
  lines.push("");

  for (const roundKey of ["R1", "R2"]) {
    lines.push(`__${roundKey === "R1" ? "Round 1" : "Round 2"}__`);
    entry.rounds[roundKey].forEach((hero, index) => {
      const sets = hero.sets.length ? hero.sets.join(", ") : "?";
      lines.push(
        `${index + 1}. **${hero.name || "?"}** (${hero.class})\n` +
          `   ${statLine(hero)}\n` +
          `   Sets: ${sets}\n` +
          `   Artifact: ${artifactName(hero.artifactId)}${hero.speedNote ? `\n   Speed note: ${hero.speedNote}` : ""}`
      );
    });
    lines.push("");
  }

  return lines.join("\n").trim();
}

function Field({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
        <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
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
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        />
      </label>

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No results</div>
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
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
              >
                <span>{option.label}</span>
                {option.meta && <span className="text-xs text-slate-400">{option.meta}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function HeroCard({ roundKey, heroIndex, hero, heroes, artifacts, onHeroChange }) {
  const heroOptions = heroes.map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.class}${item.rarity ? ` · ${item.rarity}★` : ""}`,
    meta: item.element || "",
    searchText: `${item.name} ${item.class} ${item.element || ""}`.toLowerCase(),
  }));

  const artifactOptions = artifacts
    .filter((artifact) => !artifact.class || artifact.class === hero.class)
    .map((artifact) => ({
      value: artifact.id,
      label: `${artifact.name}${artifact.rarity ? ` · ${artifact.rarity}★` : ""}`,
      meta: artifact.class || "Universal",
      searchText: `${artifact.name} ${artifact.class || "Universal"} ${artifact.rarity || ""}`.toLowerCase(),
    }));

  const classOptions = CLASS_OPTIONS.map((item) => ({ value: item.name, label: item.name }));
  const classMeta = getClassMeta(hero.class);

  const updateHero = (patch) => onHeroChange(roundKey, heroIndex, { ...hero, ...patch });

  const updateStat = (stat, value) => {
    updateHero({ stats: { ...hero.stats, [stat]: value } });
  };

  const toggleSet = (setName) => {
    const hasSet = hero.sets.includes(setName);
    updateHero({ sets: hasSet ? hero.sets.filter((item) => item !== setName) : [...hero.sets, setName] });
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hero {heroIndex + 1}</p>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <AppIcon meta={classMeta} />
            <span>{hero.name || "Unnamed Hero"}</span>
          </h3>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{roundKey}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SearchableSelect label="Hero database" value={hero.heroId} onChange={changeHero} options={heroOptions} placeholder="Search hero..." />
        <Field label="Custom hero name" value={hero.name} onChange={(value) => updateHero({ name: value, heroId: "" })} placeholder="e.g. Peira" />
        <SelectField label="Class" value={hero.class} onChange={changeClass} options={classOptions} />
        <SearchableSelect label={`Artifact (${hero.class})`} value={hero.artifactId} onChange={(value) => updateHero({ artifactId: value })} options={artifactOptions} placeholder="Search artifact..." />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {STAT_FIELDS.map((stat) => (
          <Field
            key={stat}
            label={stat}
            value={hero.stats[stat]}
            onChange={(value) => updateStat(stat, value)}
            placeholder={stat === "Speed" ? "e.g. 285+" : "Value"}
          />
        ))}
      </div>

      <div className="mt-3">
        <Field
          label="Additional Notes"
          value={hero.speedNote}
          onChange={(value) => updateHero({ speedNote: value })}
          placeholder="e.g. opener, slower than Ran, speed contest, unknown, artifact proc"
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-slate-500">Sets</p>
        <div className="flex flex-wrap gap-2">
          {SET_OPTIONS.map((setOption) => {
            const active = hero.sets.includes(setOption.name);
            return (
              <button
                key={setOption.name}
                type="button"
                onClick={() => toggleSet(setOption.name)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
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
        <div className="rounded-2xl bg-slate-900 p-2 text-white">
          <Swords size={18} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Round {roundKey === "R1" ? "1" : "2"}</h2>
          <p className="text-sm text-slate-500">Three heroes with stats, custom set icons, and class-based artifact selection.</p>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-3">
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
  const rows = ["R1", "R2"].flatMap((roundKey) => entry.rounds[roundKey].map((hero, index) => ({ roundKey, index, hero })));
  const artifactName = (artifactId) => artifactMaster.find((artifact) => artifact.id === artifactId)?.name ?? "—";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="font-bold text-slate-900">Summary</h2>
          <p className="text-sm text-slate-500">Copy the full defense as Discord-ready text.</p>
        </div>
        <button onClick={onCopyDiscord} className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800">
          <Copy className="mr-2 h-4 w-4" /> Copy for Discord
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ roundKey, index, hero }) => (
              <tr key={`${roundKey}-summary-${index}`} className="text-slate-700">
                <td className="px-4 py-3 font-semibold text-slate-900">{roundKey}</td>
                <td className="px-4 py-3">{hero.name || "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2"><AppIcon meta={getClassMeta(hero.class)} size={18} />{hero.class}</span>
                </td>
                {STAT_FIELDS.map((stat) => <td key={stat} className="px-4 py-3">{hero.stats[stat] || "—"}</td>)}
                <td className="px-4 py-3">
                  {hero.sets.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {hero.sets.map((setName) => (
                        <span key={setName} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs">
                          <AppIcon meta={getSetMeta(setName)} size={22} />{setName}
                        </span>
                      ))}
                    </div>
                  ) : "—"}
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

  async function refreshList() {
    const opponents = await loadOpponents();
    setSavedEntries(opponents);
  }

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        const master = await loadMasterData();
        setHeroes(master.heroes.length ? master.heroes : HERO_MASTER_DATA);
        setArtifacts(master.artifacts.length ? master.artifacts : ARTIFACT_MASTER_DATA);
        await refreshList();
        setStatus(`SQLite database ready. Loaded ${master.heroes.length} heroes and ${master.artifacts.length} artifacts.`);
        if (master.heroes.length <= HERO_MASTER_DATA.length || master.artifacts.length <= ARTIFACT_MASTER_DATA.length) {
          setStatus(
            `SQLite database ready, but bundled data was not imported. Check that public/data/herodata.json and public/data/artifactdata.json exist. Current: ${master.heroes.length} heroes, ${master.artifacts.length} artifacts.`
          );
        }
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
        [roundKey]: current.rounds[roundKey].map((hero, index) => index === heroIndex ? nextHero : hero),
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
      setStatus("Save failed. SQLite is not available.");
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
      setStatus("Load failed.");
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
      setStatus("Delete failed.");
    }
  };

  const exportCurrentEntry = () => {
    const safeName = slugify(entry.opponent || "unnamed-opponent");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `e7-scouts__opponents__${safeName}__${date}-${safeName}.json`;
    downloadTextFile(filename, JSON.stringify(entry, null, 2));
    setStatus("Current entry exported as JSON. Filename mirrors the planned folder structure.");
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
        version: 4,
        exportedAt: new Date().toISOString(),
        plannedFolderStructure: "e7-scouts/opponents/<opponent>/<date>-<opponent>.json",
        savedEntries: fullEntries,
      };

      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(`e7-scouts__backups__backup-${date}.json`, JSON.stringify(payload, null, 2));
      setStatus("Full SQLite backup exported as JSON.");
    } catch (error) {
      console.error(error);
      setStatus("Backup export failed.");
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
      setStatus("Import failed. Please select a valid exported JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  const copyDiscord = async () => {
    await navigator.clipboard.writeText(buildDiscordSummary(entry, artifacts));
    setStatus("Discord summary copied to clipboard.");
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                <Shield size={16} /> Epic Seven Guild War Tracker
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Defense Scout Interface</h1>
              <p className="mt-3 max-w-2xl text-slate-500">
                SQLite desktop version with custom image icons, better save/load flow, JSON import/export, and Discord copy output.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={newEntry} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"><Plus className="mr-2 h-4 w-4" /> New opponent</button>
              <button onClick={saveEntry} className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"><Save className="mr-2 h-4 w-4" /> Save to SQLite</button>
              <button onClick={exportCurrentEntry} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"><Download className="mr-2 h-4 w-4" /> Export entry</button>
              <button onClick={exportAllEntries} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"><FolderArchive className="mr-2 h-4 w-4" /> Export backup</button>
              <label className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50">
                <Upload className="mr-2 h-4 w-4" /> Import JSON
                <input type="file" accept="application/json" onChange={importJson} className="hidden" />
              </label>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Users size={18} /><h2 className="font-bold">Opponent</h2></div>
              <Field label="Current opponent name" value={entry.opponent} onChange={(value) => setEntry((current) => ({ ...current, opponent: value }))} placeholder="e.g. 315 lidi" />
              <div className="mt-3">
                <Field label="Note" value={entry.note} onChange={(value) => setEntry((current) => ({ ...current, note: value }))} placeholder="Optional scouting note" />
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2"><DatabaseIcon size={17} /><h2 className="font-bold">SQLite database</h2></div>
              <p className="mb-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                Opponents are stored in local SQLite. JSON export/import is used for backups and sharing.
              </p>
              <p className="text-xs font-medium text-slate-600">{status}</p>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2"><Search size={17} /><h2 className="font-bold">Saved entries</h2></div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />

              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {filteredEntries.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No saved opponents yet.</p>
                ) : (
                  filteredEntries.map((item) => (
                    <div key={item.id} className={`rounded-2xl border p-3 transition ${selectedId === item.id ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}>
                      <button type="button" onClick={() => loadEntry(item)} className="w-full text-left">
                        <p className="font-semibold text-slate-900">{item.opponent}</p>
                        <p className="text-xs text-slate-500">Updated: {new Date(item.updatedAt).toLocaleString()}</p>
                      </button>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => loadEntry(item)} className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-2 text-xs"><RotateCcw className="mr-1 h-3 w-3" /> Load</button>
                        <button onClick={() => deleteEntry(item.id)} className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-2 text-xs text-red-600"><Trash2 className="mr-1 h-3 w-3" /> Delete</button>
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
