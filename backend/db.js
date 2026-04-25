const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// SQLite connection (single DB file for the project)
const dbPath = path.join(__dirname, "..", "database", "fixmate.db");
const db = new sqlite3.Database(dbPath);

// Promise helpers for parameterized queries
const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row || null);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows || []);
    });
  });

const getTableColumns = async (tableName) => {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  return new Set(columns.map((column) => column.name));
};

const ensureColumn = async (tableName, columnName, definitionSql) => {
  const columns = await getTableColumns(tableName);
  if (!columns.has(columnName)) {
    await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
  }
};

const createUsersTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'provider', 'admin')),
      googleId TEXT
    )
  `);

  // Backward compatibility with older schema versions
  await ensureColumn("users", "password", "TEXT");
  await ensureColumn("users", "password_hash", "TEXT");
  await ensureColumn("users", "googleId", "TEXT");
};

const createProvidersTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL UNIQUE,
      serviceTypes TEXT NOT NULL,
      experience INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 0,
      location TEXT NOT NULL,
      phoneNumber TEXT,
      description TEXT,
      profileImage TEXT,
      approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0,1)),
      reviewStatus TEXT NOT NULL DEFAULT 'pending' CHECK (reviewStatus IN ('pending','approved','rejected')),
      FOREIGN KEY (userId) REFERENCES users (id)
    )
  `);

  // Backward compatibility for older schemas
  await ensureColumn("providers", "userId", "INTEGER");
  await ensureColumn("providers", "serviceTypes", "TEXT");
  await ensureColumn("providers", "experience", "INTEGER DEFAULT 0");
  await ensureColumn("providers", "price", "INTEGER DEFAULT 0");
  await ensureColumn("providers", "location", "TEXT");
  await ensureColumn("providers", "phoneNumber", "TEXT");
  await ensureColumn("providers", "description", "TEXT");
  await ensureColumn("providers", "profileImage", "TEXT");
  await ensureColumn("providers", "approved", "INTEGER DEFAULT 0");
  await ensureColumn("providers", "reviewStatus", "TEXT DEFAULT 'pending'");
};

const createBookingsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      providerId INTEGER NOT NULL,
      serviceType TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','completed')),
      user_id INTEGER,
      provider_id INTEGER,
      service_type TEXT,
      booking_date TEXT,
      booking_time TEXT,
      location TEXT,
      full_address TEXT,
      phone_number TEXT,
      problem_description TEXT,
      FOREIGN KEY (userId) REFERENCES users (id),
      FOREIGN KEY (providerId) REFERENCES providers (id)
    )
  `);

  // Backward compatibility for older schemas (snake_case -> camelCase additions)
  await ensureColumn("bookings", "userId", "INTEGER");
  await ensureColumn("bookings", "providerId", "INTEGER");
  await ensureColumn("bookings", "serviceType", "TEXT");
  await ensureColumn("bookings", "date", "TEXT");
  await ensureColumn("bookings", "time", "TEXT");
  await ensureColumn("bookings", "address", "TEXT");
  await ensureColumn("bookings", "status", "TEXT DEFAULT 'pending'");
};

const createPasswordResetsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0,1)),
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  await ensureColumn("password_resets", "used", "INTEGER DEFAULT 0");
};

// Create all required tables and indexes on server startup
const initializeDb = async () => {
  await run("PRAGMA foreign_keys = ON");
  await createUsersTable();
  await createProvidersTable();
  await createBookingsTable();
  await createPasswordResetsTable();

  await run("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
  await run("CREATE INDEX IF NOT EXISTS idx_providers_approved ON providers(approved)");
  await run("CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(providerId)");
  await run("CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(userId)");
  await run("CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)");
};

module.exports = {
  db,
  run,
  get,
  all,
  initializeDb,
};
