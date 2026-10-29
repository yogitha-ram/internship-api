const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbFile = process.env.DB_FILE || path.join(__dirname, "internships.db");
const db = new Database(dbFile);
db.pragma("journal_mode = WAL");

// Create the table from schema.sql
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

// Insert the supplied seed records (existing IDs are kept as they are)
function seed() {
  const { internships } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed.json"), "utf8")
  );
  const insert = db.prepare(
    `INSERT OR IGNORE INTO internships (id, title, domain, mode, location, skills, openings)
     VALUES (@id, @title, @domain, @mode, @location, @skills, @openings)`
  );
  const run = db.transaction((rows) => {
    let added = 0;
    for (const r of rows) {
      added += insert.run({ ...r, skills: JSON.stringify(r.skills) }).changes;
    }
    return added;
  });
  return run(internships);
}

// Seed automatically when the table is empty
const count = db.prepare("SELECT COUNT(*) AS n FROM internships").get().n;
if (count === 0) seed();

module.exports = { db, seed };
