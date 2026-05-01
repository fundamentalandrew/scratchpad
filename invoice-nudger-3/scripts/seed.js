const { resetDb, dbPath } = require("../src/store");

resetDb();
console.log(`Seeded demo database at ${dbPath}`);
