const Database = require("better-sqlite3");

const db = new Database("chatbot.db");

const result = db
  .prepare("DELETE FROM learned WHERE question = ?")
  .run("nearest bank");

console.log(`Deleted ${result.changes} row(s)`);

db.close();