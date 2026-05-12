import React, { useEffect, useMemo, useState } from "react";
import Database from "@tauri-apps/plugin-sql";
import { Plus, Save, Search, Trash2, RotateCcw, Swords, Shield, Users, Database as DatabaseIcon, Download } from "lucide-react";

const DB_URL = "sqlite:e7_gw_tracker.db";

const STAT_FIELDS = ["ATK", "DEF", "HP", "Speed", "EFF", "ER"];

const SET_OPTIONS = [
  "Immunity",
  "Counter",
  "Riposte",
  "Warfare",
  "Pursuit",
  "Protection",
  "Injury",
];

const CLASS_OPTIONS = [
  "Knight",
  "Warrior",
  "Thief",
  "Ranger",
  "Mage",
  "Soul Weaver",
];

function uid() {
  return crypto.randomUUID();
}

function blankHero() {
  return {
    heroId: "",
    name: "",
    class: "Knight",
    stats: { ATK: "", DEF: "", HP: "", Speed: "", EFF: "", ER: "" },
    sets: [],
    artifactId: "",
    speedNote: "",
  };
}

function blankEntry() {
  return {
    id: uid(),
    opponent: "",
    note: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rounds: {
      R1: [blankHero(), blankHero(), blankHero()],
      R2: [blankHero(), blankHero(), blankHero()],
    },
  };
}

async function getDb() {
  return await Database.load(DB_URL);
}

async function initDb() {
  const db = await getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS heroes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      class TEXT NOT NULL,
      element TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      class TEXT NOT NULL
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

  await seedMasterData(db);
  return db;
}

async function seedMasterData(db) {
  const heroes = [
    ["peira", "Peira", "Thief", "Ice"],
    ["luna", "Luna", "Warrior", "Ice"],
    ["yufine", "Yufine", "Warrior", "Earth"],
    ["ilynav", "Ilynav", "Knight", "Fire"],
    ["harunka", "Harunka", "Warrior", "Dark"],
    ["mercedes", "Mercedes", "Mage", "Fire"],
    ["ran", "Ran", "Thief", "Ice"],
    ["conqueror-lilias", "Conqueror Lilias", "Warrior", "Dark"],
    ["angel-of-light-angelica", "Angel of Light Angelica", "Mage", "Light"],
    ["karina", "ae-KARINA", "Knight", "Ice"],
  ];

  const artifacts = [
    ["elbris", "Elbris Ritual Sword", "Knight"],
    ["aurius", "Aurius", "Knight"],
    ["adamant-shield", "Adamant Shield", "Knight"],
    ["noble-oath", "Noble Oath", "Knight"],
    ["holy-sacrifice", "Holy Sacrifice", "Knight"],
    ["uberius-tooth", "Uberius's Tooth", "Warrior"],
    ["sigurd-scythe", "Sigurd Scythe", "Warrior"],
    ["draco-plate", "Draco Plate", "Warrior"],
    ["merciless-glutton", "Merciless Glutton", "Warrior"],
    ["creation-destruction", "Creation & Destruction", "Warrior"],
    ["rhianna-luciella", "Rhianna & Luciella", "Thief"],
    ["alexas-basket", "Alexa's Basket", "Thief"],
    ["moonlight-dreamblade", "Moonlight Dreamblade", "Thief"],
    ["shepherd-hollow", "Shepherd of the Hollow", "Thief"],
    ["dust-devil", "Dust Devil", "Thief"],
    ["guiding-light", "Guiding Light", "Ranger"],
    ["song-of-stars", "Song of Stars", "Ranger"],
    ["bloodstone", "Bloodstone", "Ranger"],
    ["sashe-ithanes", "Sashe Ithanes", "Ranger"],
    ["infinity-basket", "Infinity Basket", "Ranger"],
    ["tagehel", "Tagehel's Ancient Book", "Mage"],
    ["abyssal-crown", "Abyssal Crown", "Mage"],
    ["eticas-scepter", "Etica's Scepter", "Mage"],
    ["iela-violin", "Iela Violin", "Mage"],
    ["necro-undine", "Necro & Undine", "Mage"],
    ["rod-amaryllis", "Rod of Amaryllis", "Soul Weaver"],
    ["celestine", "Celestine", "Soul Weaver"],
    ["waters-origin", "Water's Origin", "Soul Weaver"],
    ["idols-cheer", "Idol's Cheer", "Soul Weaver"],
    ["shimadra-staff", "Shimadra Staff", "Soul Weaver"],
  ];

  for (const hero of heroes) {
    await db.execute("INSERT OR IGNORE INTO heroes (id, name, class, element) VALUES (?, ?, ?, ?)", hero);
  }

  for (const artifact of artifacts) {
    await db.execute("INSERT OR IGNORE INTO artifacts (id, name, class) VALUES (?, ?, ?)", artifact);
  }
}

async function loadMasterData() {
  const db = await getDb();
  const heroes = await db.select("SELECT id, name, class, element FROM heroes ORDER BY name ASC");
  const artifacts = await db.select("SELECT id, name, class FROM artifacts ORDER BY name ASC");
  return { heroes, artifacts };
}

async function loadOpponents() {
  const db = await getDb();
  return await db.select("SELECT id, name AS opponent, note, created_at AS createdAt, updated_at AS updatedAt FROM opponents ORDER BY updated_at DESC");
}

async function loadEntry(opponentId) {
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
    entry.rounds[row.round_key][row.slot_number - 1] = hero;
  }

  return entry;
}

async function saveEntryToDb(entry) {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  const opponent = entry.opponent.trim() || "Unnamed opponent";

  await db.execute(
    `INSERT INTO opponents (id, name, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, note = excluded.note, updated_at = excluded.updated_at`,
    [entry.id, opponent, entry.note ?? "", entry.createdAt, updatedAt]
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

  return { ...entry, opponent, updatedAt };
}

async function deleteEntryFromDb(id) {
  const db = await getDb();
  await db.execute("DELETE FROM scout_entries WHERE opponent_id = ?", [id]);
  await db.execute("DELETE FROM opponents WHERE id = ?", [id]);
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
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function HeroCard({ roundKey, heroIndex, hero, heroes, artifacts, onHeroChange }) {
  const heroOptions = heroes.map((item) => ({ value: item.id, label: `${item.name} · ${item.class}` }));
  const artifactOptions = artifacts
    .filter((artifact) => artifact.class === hero.class)
    .map((artifact) => ({ value: artifact.id, label: artifact.name }));

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
          <h3 className="text-lg font-semibold text-slate-900">{hero.name || "Unnamed Hero"}</h3>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{roundKey}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SelectField label="Hero database" value={hero.heroId} onChange={changeHero} options={heroOptions} placeholder="Select hero..." />
        <Field label="Custom hero name" value={hero.name} onChange={(value) => updateHero({ name: value, heroId: "" })} placeholder="e.g. Peira" />
        <SelectField label="Class" value={hero.class} onChange={changeClass} options={CLASS_OPTIONS} />
        <SelectField label={`Artifact (${hero.class})`} value={hero.artifactId} onChange={(value) => updateHero({ artifactId: value })} options={artifactOptions} placeholder="Select artifact..." />
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
          label="Speed note / future logic"
          value={hero.speedNote}
          onChange={(value) => updateHero({ speedNote: value })}
          placeholder="e.g. opener, slower than Ran, speed contest, unknown"
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-slate-500">Sets</p>
        <div className="flex flex-wrap gap-2">
          {SET_OPTIONS.map((setName) => {
            const active = hero.sets.includes(setName);
            return (
              <button
                key={setName}
                type="button"
                onClick={() => toggleSet(setName)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                }`}
              >
                {setName}
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
          <p className="text-sm text-slate-500">Three heroes with stats, sets, and class-based artifact selection.</p>
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

function SummaryTable({ entry, artifactMaster }) {
  const rows = ["R1", "R2"].flatMap((roundKey) => entry.rounds[roundKey].map((hero, index) => ({ roundKey, index, hero })));
  const artifactName = (artifactId) => artifactMaster.find((artifact) => artifact.id === artifactId)?.name ?? "—";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                <td className="px-4 py-3">{hero.class}</td>
                {STAT_FIELDS.map((stat) => <td key={stat} className="px-4 py-3">{hero.stats[stat] || "—"}</td>)}
                <td className="px-4 py-3">{hero.sets.length ? hero.sets.join(", ") : "—"}</td>
                <td className="px-4 py-3">{artifactName(hero.artifactId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [entry, setEntry] = useState(blankEntry());
  const [savedEntries, setSavedEntries] = useState([]);
  const [heroes, setHeroes] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState("Starting database...");

  async function refreshList() {
    const opponents = await loadOpponents();
    setSavedEntries(opponents);
  }

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        const master = await loadMasterData();
        setHeroes(master.heroes);
        setArtifacts(master.artifacts);
        await refreshList();
        setStatus("SQLite database ready.");
      } catch (error) {
        console.error(error);
        setStatus("Database failed to start. Run inside Tauri, not a normal browser.");
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
        [roundKey]: current.rounds[roundKey].map((hero, index) => (index === heroIndex ? nextHero : hero)),
      },
    }));
  };

  const saveEntry = async () => {
    const saved = await saveEntryToDb(entry);
    setEntry(saved);
    setSelectedId(saved.id);
    await refreshList();
    setStatus(`Saved: ${saved.opponent}`);
  };

  const loadSelectedEntry = async (item) => {
    const loaded = await loadEntry(item.id);
    if (loaded) {
      setEntry(loaded);
      setSelectedId(item.id);
      setStatus(`Loaded: ${loaded.opponent}`);
    }
  };

  const deleteEntry = async (id) => {
    await deleteEntryFromDb(id);
    await refreshList();
    if (selectedId === id) {
      setEntry(blankEntry());
      setSelectedId(null);
    }
    setStatus("Entry deleted.");
  };

  const newEntry = () => {
    setEntry(blankEntry());
    setSelectedId(null);
    setStatus("New opponent created.");
  };

  const exportCurrentJson = () => {
    const data = JSON.stringify(entry, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${entry.opponent || "e7-entry"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Current entry exported as JSON.");
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
                Tauri-ready desktop app with local SQLite storage, two rounds, three heroes per round, class-based artifacts, clickable sets, and scalable master data.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={newEntry} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"><Plus className="mr-2 h-4 w-4" /> New opponent</button>
              <button onClick={exportCurrentJson} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"><Download className="mr-2 h-4 w-4" /> Export entry</button>
              <button onClick={saveEntry} className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"><Save className="mr-2 h-4 w-4" /> Save</button>
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
                Data is stored locally in SQLite. This is ready for packaging as a Windows .exe through Tauri.
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
                      <button type="button" onClick={() => loadSelectedEntry(item)} className="w-full text-left">
                        <p className="font-semibold text-slate-900">{item.opponent}</p>
                        <p className="text-xs text-slate-500">Updated: {new Date(item.updatedAt).toLocaleString()}</p>
                      </button>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => loadSelectedEntry(item)} className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-2 text-xs"><RotateCcw className="mr-1 h-3 w-3" /> Load</button>
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

            <section className="space-y-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Summary</h2>
                <p className="text-sm text-slate-500">Quick overview for checking the whole defense.</p>
              </div>
              <SummaryTable entry={entry} artifactMaster={artifacts} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
