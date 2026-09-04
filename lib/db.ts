import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "chatbot.db");

export function getDB() {
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT,
      answer TEXT,
      intent TEXT
    );
    CREATE TABLE IF NOT EXISTS learned (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT UNIQUE,
      answer TEXT
    );
    CREATE TABLE IF NOT EXISTS loan_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      interest_rate TEXT,
      max_amount TEXT,
      duration TEXT,
      description TEXT
    );
  `);

  // Add description column if it doesn't exist yet (migration)
  const cols = db.prepare("PRAGMA table_info(loan_types)").all() as { name: string }[];
  if (!cols.find((c) => c.name === "description")) {
    db.exec("ALTER TABLE loan_types ADD COLUMN description TEXT");
  }

  const faqCount = (db.prepare("SELECT COUNT(*) as c FROM faq").get() as { c: number }).c;
  if (faqCount === 0) {
    const insert = db.prepare("INSERT INTO faq (question, answer, intent) VALUES (?, ?, ?)");
    const rows: [string, string, string][] = [
      ["loan", "We offer several loan types. Ask me 'what loan types are available?' to see them all.", "LOAN"],
      ["credit card", "We provide Visa and Mastercard credit cards with various reward programs.", "CARD"],
      ["balance", "Please log in to your account portal to check your current balance.", "BALANCE"],
      ["account", "You can open a savings or current account at any branch or online.", "ACCOUNT"],
      ["transfer", "You can transfer funds via our mobile app, internet banking, or at any branch.", "TRANSFER"],
      ["interest rate", "Our savings account interest rate is 5% per annum.", "INTEREST"],
    ];
    rows.forEach(([q, a, i]) => insert.run(q, a, i));
  }

  const loanCount = (db.prepare("SELECT COUNT(*) as c FROM loan_types").get() as { c: number }).c;
  if (loanCount === 0) {
    const insert = db.prepare(
      "INSERT INTO loan_types (name, interest_rate, max_amount, duration, description) VALUES (?, ?, ?, ?, ?)"
    );
    const loans: [string, string, string, string, string][] = [
      ["Personal Loan",  "12% p.a.", "LKR 2,000,000",  "Up to 5 years",  "For personal expenses & emergencies"],
      ["Home Loan",      "9% p.a.",  "LKR 20,000,000", "Up to 25 years", "For purchasing or constructing property"],
      ["Vehicle Loan",   "11% p.a.", "LKR 5,000,000",  "Up to 7 years",  "For buying cars, bikes or vans"],
      ["Business Loan",  "14% p.a.", "LKR 10,000,000", "Up to 10 years", "For starting or expanding a business"],
      ["Education Loan", "8% p.a.",  "LKR 3,000,000",  "Up to 8 years",  "For local and overseas education"],
    ];
    loans.forEach((l) => insert.run(...l));
  } else {
    // Backfill descriptions if they were seeded before the column existed
    const empty = db.prepare("SELECT COUNT(*) as c FROM loan_types WHERE description IS NULL").get() as { c: number };
    if (empty.c > 0) {
      const descriptions: Record<string, string> = {
        "Personal Loan":  "For personal expenses & emergencies",
        "Home Loan":      "For purchasing or constructing property",
        "Vehicle Loan":   "For buying cars, bikes or vans",
        "Business Loan":  "For starting or expanding a business",
        "Education Loan": "For local and overseas education",
      };
      const upd = db.prepare("UPDATE loan_types SET description = ? WHERE name = ?");
      Object.entries(descriptions).forEach(([name, desc]) => upd.run(desc, name));
    }
  }

  return db;
}

export type LoanType = {
  id: number;
  name: string;
  interest_rate: string;
  max_amount: string;
  duration: string;
  description: string;
};
