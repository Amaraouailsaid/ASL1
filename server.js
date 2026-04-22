const express  = require("express");
const cors     = require("cors");
const sqlite3  = require("sqlite3").verbose();
const path     = require("path");
const bcrypt   = require("bcryptjs");
const session  = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "database.db");
// Admin password — set ADMIN_PASSWORD env var on Railway. Fallback is obvious but safe since admin page is gated.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "alsl-admin-change-me";

// ─── RATE LIMITER ────────────────────────────────────────────
const rateLimitMap = new Map();
function rateLimit(req, res, next) {
  const ip  = req.ip;
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > 60_000) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > 200) return res.status(429).json({ success: false, error: "Too many requests" });
  next();
}

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(session({
  store: new SQLiteStore({
    db: "sessions.db",
    dir: path.dirname(DB_PATH),
    concurrentDB: true
  }),
  secret: process.env.SESSION_SECRET || "alsl-thesis-2025-change-this-in-prod",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  }
}));

app.use(express.static(path.join(__dirname, "public")));
app.use("/videos", express.static(path.join(__dirname, "videos")));

// ─── INPUT HELPERS ───────────────────────────────────────────
function clean(str) {
  if (typeof str !== "string") return "";
  return str.trim().replace(/[<>"'`;\\]/g, "").slice(0, 500);
}
function cleanLong(str) {
  if (typeof str !== "string") return "";
  // For comments: allow more chars (quotes, punctuation) but still sanitize
  return str.trim().slice(0, 1000);
}
function validEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 120;
}
const ALLOWED_ANSWERS = new Set(["YES", "NO", "ALMOST", "FLAG"]);
const ALLOWED_REASONS = new Set(["wrong_sign", "poor_quality", "other"]);

function requireAuth(req, res, next) {
  if (req.session && req.session.expert) return next();
  return res.status(401).json({ success: false, error: "Not logged in" });
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect("/admin/login");
}

// ─── DATABASE ────────────────────────────────────────────────
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      display_name  TEXT    NOT NULL,
      email         TEXT    DEFAULT '',
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Add email column to existing users table if missing
  db.run(`ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS signs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      concept_en TEXT NOT NULL,
      concept_ar TEXT NOT NULL,
      video      TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      expert       TEXT    NOT NULL,
      sign_id      INTEGER NOT NULL,
      concept      TEXT    NOT NULL,
      answer       TEXT    NOT NULL,
      comment      TEXT    DEFAULT '',
      flag_reasons TEXT    DEFAULT '',
      hamnosys     TEXT    DEFAULT '',
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(expert, sign_id)
    )
  `);
  db.run(`ALTER TABLE evaluations ADD COLUMN flag_reasons TEXT DEFAULT ''`, () => {});
  db.run(`ALTER TABLE evaluations ADD COLUMN hamnosys     TEXT DEFAULT ''`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS queue (
      cs_id      INTEGER PRIMARY KEY,
      french     TEXT    NOT NULL,
      queued_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      downloaded INTEGER  DEFAULT 0
    )
  `);

  console.log("✅ Database ready");
  console.log(`🗄️  DB path: ${DB_PATH}`);
});

// ═══════════════════════════════════════════════════════════════════
//                         AUTH  ROUTES
// ═══════════════════════════════════════════════════════════════════

app.post("/auth/register", rateLimit, (req, res) => {
  const username     = clean(req.body.username || "").toLowerCase();
  const display_name = clean(req.body.display_name || req.body.username || "");
  const email        = clean(req.body.email || "").toLowerCase();
  const password     = typeof req.body.password === "string" ? req.body.password.trim() : "";

  if (!username || username.length < 2)
    return res.status(400).json({ success: false, error: "Username too short" });
  if (!display_name)
    return res.status(400).json({ success: false, error: "Full name is required" });
  if (!email || !validEmail(email))
    return res.status(400).json({ success: false, error: "Invalid email address" });
  if (!password || password.length < 6)
    return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });

  db.get("SELECT id FROM users WHERE username = ?", [username], (err, row) => {
    if (err)  return res.status(500).json({ success: false, error: "Database error" });
    if (row)  return res.status(409).json({ success: false, error: "Username taken" });

    const hash = bcrypt.hashSync(password, 10);
    db.run(
      "INSERT INTO users (username, password_hash, display_name, email) VALUES (?, ?, ?, ?)",
      [username, hash, display_name, email],
      function(err2) {
        if (err2) return res.status(500).json({ success: false, error: "Database error" });
        req.session.expert   = display_name;
        req.session.username = username;
        req.session.user_id  = this.lastID;
        console.log(`✅ New user: ${username} <${email}>`);
        res.json({ success: true, expert: display_name });
      }
    );
  });
});

app.post("/auth/login", rateLimit, (req, res) => {
  const username = clean(req.body.username || "").toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password.trim() : "";

  if (!username || !password)
    return res.status(400).json({ success: false, error: "Missing username or password" });

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err)   return res.status(500).json({ success: false, error: "Database error" });
    if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });
    if (!bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ success: false, error: "Invalid credentials" });

    req.session.expert   = user.display_name;
    req.session.username = user.username;
    req.session.user_id  = user.id;
    console.log(`✅ Login: ${username}`);
    res.json({ success: true, expert: user.display_name });
  });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/auth/me", (req, res) => {
  if (req.session && req.session.expert) {
    return res.json({ success: true, expert: req.session.expert });
  }
  res.json({ success: false });
});

// ═══════════════════════════════════════════════════════════════════
//                          APP  ROUTES
// ═══════════════════════════════════════════════════════════════════

app.get("/signs.json", (req, res) => {
  db.all("SELECT * FROM signs ORDER BY id", [], (err, rows) => {
    if (err || rows.length === 0) {
      return res.sendFile(path.join(__dirname, "public", "signs.json"));
    }
    res.json(rows);
  });
});

app.post("/save", requireAuth, rateLimit, (req, res) => {
  const expert  = req.session.expert;
  const sign_id = parseInt(req.body.sign_id, 10);
  const concept = clean(req.body.concept);
  const answer  = String(req.body.answer || "").toUpperCase();
  const comment = cleanLong(req.body.comment || "");

  if (isNaN(sign_id) || sign_id < 1) return res.status(400).json({ success: false, error: "Invalid: sign_id" });
  if (!ALLOWED_ANSWERS.has(answer))  return res.status(400).json({ success: false, error: "Invalid: answer" });

  const rawReasons = Array.isArray(req.body.flag_reasons) ? req.body.flag_reasons : [];
  const reasons    = rawReasons.filter(r => ALLOWED_REASONS.has(r)).join(",");

  const sql = `
    INSERT INTO evaluations (expert, sign_id, concept, answer, comment, flag_reasons)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(expert, sign_id) DO UPDATE SET
      answer = excluded.answer, comment = excluded.comment,
      flag_reasons = excluded.flag_reasons, created_at = CURRENT_TIMESTAMP
  `;
  db.run(sql, [expert, sign_id, concept, answer, comment, reasons], function(err) {
    if (err) return res.status(500).json({ success: false, error: "Database error" });
    console.log(`✅ ${expert} → Sign ${sign_id} [${answer}]`);
    res.json({ success: true });
  });
});

// Progress now includes comments map
app.get("/progress/:expert", requireAuth, rateLimit, (req, res) => {
  const expert = req.session.expert;
  db.all("SELECT sign_id, answer, comment FROM evaluations WHERE expert = ?", [expert], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: "Database error" });
    res.json({
      success:   true,
      evaluated: rows.map(r => r.sign_id),
      answers:   Object.fromEntries(rows.map(r => [r.sign_id, r.answer])),
      comments:  Object.fromEntries(rows.map(r => [r.sign_id, r.comment || ""]))
    });
  });
});

app.get("/evaluations", requireAuth, rateLimit, (req, res) => {
  const expert = req.session.expert;
  db.all(
    "SELECT * FROM evaluations WHERE expert = ? ORDER BY created_at DESC",
    [expert], (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });
      res.json({ success: true, data: rows });
    }
  );
});

// ─── CSV helper ──────────────────────────────────────────────
function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function rowsToCsv(rows, columns) {
  const header = columns.join(",");
  const lines = rows.map(r => columns.map(c => csvEscape(r[c])).join(","));
  return "\uFEFF" + header + "\n" + lines.join("\n") + "\n";  // BOM for Excel to show Arabic
}

// Per-expert CSV download (user downloads their own work)
app.get("/my-work.csv", requireAuth, (req, res) => {
  const expert = req.session.expert;
  db.all(
    "SELECT * FROM evaluations WHERE expert = ? ORDER BY sign_id",
    [expert],
    (err, rows) => {
      if (err) return res.status(500).send("Database error");
      const csv = rowsToCsv(rows, ["id","expert","sign_id","concept","answer","comment","flag_reasons","hamnosys","created_at"]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="my-work-${expert}.csv"`);
      res.send(csv);
    }
  );
});

// ═══════════════════════════════════════════════════════════════════
//                        ADMIN  ROUTES
// ═══════════════════════════════════════════════════════════════════

// Admin login page (serves a minimal inline HTML form)
app.get("/admin/login", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admin — Login</title>
<style>
body{font-family:system-ui,sans-serif;background:#0b0e17;color:#e6ecff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#141a28;border:1px solid #232b42;border-radius:14px;padding:32px 28px;min-width:320px;box-shadow:0 12px 40px rgba(0,0,0,0.4)}
h1{font-size:1.15rem;margin:0 0 6px;color:#8fa4ff}
p{font-size:.82rem;color:#8a94b0;margin:0 0 18px}
input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a334c;background:#1a2236;color:#e6ecff;font-size:.95rem;box-sizing:border-box;margin-bottom:10px}
button{width:100%;padding:10px;background:#6b83e8;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:.95rem}
button:hover{background:#5a7ce0}
.err{color:#f87171;font-size:.82rem;min-height:18px;margin:-4px 0 8px;text-align:center}
</style></head><body>
<form class="box" method="POST" action="/admin/login">
<h1>🔒 Admin Access</h1>
<p>Enter admin password to view statistics & exports</p>
<input type="password" name="password" placeholder="Admin password" autofocus required>
${req.query.err ? '<div class="err">Wrong password</div>' : ""}
<button type="submit">Enter</button>
</form></body></html>`);
});

app.post("/admin/login", rateLimit, (req, res) => {
  const pw = typeof req.body.password === "string" ? req.body.password : "";
  if (pw === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.redirect("/admin");
  }
  return res.redirect("/admin/login?err=1");
});

app.post("/admin/logout", (req, res) => {
  if (req.session) req.session.admin = false;
  res.redirect("/admin/login");
});

// Admin dashboard (HTML page) — served from /admin/ directory (NOT public/)
// so direct URL /admin.html cannot bypass auth
app.get("/admin", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "admin.html"));
});

// Admin: stats JSON
app.get("/admin/stats.json", requireAdmin, (req, res) => {
  const out = {};
  db.all("SELECT username, display_name, email, created_at FROM users ORDER BY created_at", [], (err, users) => {
    if (err) return res.status(500).json({ error: "DB error" });
    out.users = users || [];
    db.all(
      `SELECT expert, answer, COUNT(*) as n FROM evaluations GROUP BY expert, answer`,
      [], (err2, rows) => {
        if (err2) return res.status(500).json({ error: "DB error" });
        const byExpert = {};
        for (const r of rows) {
          if (!byExpert[r.expert]) byExpert[r.expert] = { YES: 0, NO: 0, ALMOST: 0, FLAG: 0, total: 0 };
          byExpert[r.expert][r.answer] = r.n;
          byExpert[r.expert].total += r.n;
        }
        out.byExpert = byExpert;
        db.get(`SELECT COUNT(*) as total_signs FROM signs`, [], (e3, s) => {
          out.totalSigns = (s && s.total_signs) || 0;
          db.get(`SELECT COUNT(*) as total_evals FROM evaluations`, [], (e4, e) => {
            out.totalEvaluations = (e && e.total_evals) || 0;
            db.all(
              `SELECT expert, sign_id, concept, answer, comment, flag_reasons, created_at
               FROM evaluations ORDER BY created_at DESC LIMIT 100`,
              [], (e5, recent) => {
                out.recent = recent || [];
                res.json(out);
              }
            );
          });
        });
      }
    );
  });
});

// Admin: full export (all evaluations)
app.get("/admin/export-all.csv", requireAdmin, (req, res) => {
  db.all("SELECT * FROM evaluations ORDER BY expert, sign_id", [], (err, rows) => {
    if (err) return res.status(500).send("Database error");
    const csv = rowsToCsv(rows, ["id","expert","sign_id","concept","answer","comment","flag_reasons","hamnosys","created_at"]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="alsl-all-evaluations.csv"`);
    res.send(csv);
  });
});

// Admin: export specific expert
app.get("/admin/export/:expert.csv", requireAdmin, (req, res) => {
  const expert = req.params.expert;
  db.all("SELECT * FROM evaluations WHERE expert = ? ORDER BY sign_id", [expert], (err, rows) => {
    if (err) return res.status(500).send("Database error");
    const csv = rowsToCsv(rows, ["id","expert","sign_id","concept","answer","comment","flag_reasons","hamnosys","created_at"]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="alsl-${expert}.csv"`);
    res.send(csv);
  });
});

// Admin: users CSV
app.get("/admin/users.csv", requireAdmin, (req, res) => {
  db.all("SELECT id, username, display_name, email, created_at FROM users ORDER BY created_at", [], (err, rows) => {
    if (err) return res.status(500).send("Database error");
    const csv = rowsToCsv(rows, ["id","username","display_name","email","created_at"]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="alsl-users.csv"`);
    res.send(csv);
  });
});

// ═══════════════════════════════════════════════════════════════════
//                      EXTENSION ROUTES (legacy)
// ═══════════════════════════════════════════════════════════════════
const extCors = cors({ origin: true, credentials: false });
app.options("/queue",  extCors);
app.options("/queued", extCors);
app.post("/queue", extCors, rateLimit, (req, res) => {
  const cs_id  = parseInt(req.body.cs_id, 10);
  const french = clean(req.body.french || "");
  if (isNaN(cs_id) || cs_id < 1) return res.status(400).json({ success: false, error: "Invalid cs_id" });
  db.run("INSERT OR IGNORE INTO queue (cs_id, french) VALUES (?, ?)", [cs_id, french], function(err) {
    if (err) return res.status(500).json({ success: false, error: "DB error" });
    res.json({ success: true, queued: this.changes > 0 });
  });
});
app.get("/queued", extCors, (req, res) => {
  db.all("SELECT * FROM queue ORDER BY queued_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: "DB error" });
    res.json({ success: true, data: rows });
  });
});

// 404
app.use((req, res) => res.status(404).json({ success: false, error: "Not found" }));

// ─── START ────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server → http://localhost:${PORT}`);
  console.log(`🌍 HOST: ${HOST}`);
  console.log(`🔑 Admin password: ${ADMIN_PASSWORD === "alsl-admin-change-me" ? "(using default, set ADMIN_PASSWORD env var!)" : "(from env)"}`);
  if (process.env.NODE_ENV === "production") {
    console.log("🔒 Running in production mode");
  }
});
