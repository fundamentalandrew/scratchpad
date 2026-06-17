const fs = require("fs");
const path = require("path");
const { initialData } = require("./seed-data");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "db.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    writeDb(clone(initialData));
  }
}

function readDb() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(db) {
  const nextDb = {
    ...db,
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(dbPath, `${JSON.stringify(nextDb, null, 2)}\n`);
  return nextDb;
}

function resetDb() {
  return writeDb(clone(initialData));
}

module.exports = {
  dbPath,
  readDb,
  writeDb,
  resetDb
};
