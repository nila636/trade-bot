/**
 * TRADE BOT — API SERVER
 * ──────────────────────
 * Мини-бэк для Mini App:
 *   POST /api/auth    — проверка initData + подписки на канал, выдача сессии
 *   POST /api/track   — трекинг событий из Mini App (требует сессии)
 *   GET  /api/me      — профиль текущего пользователя
 *   GET  /health      — ping для Railway
 *
 * ENV:
 *   BOT_TOKEN          — тот же что у бота (для проверки HMAC подписи)
 *   CHANNEL_USERNAME   — @traidingpr (без @)
 *   FRONTEND_ORIGIN    — https://tradebot465.netlify.app (для CORS)
 *   DATABASE_URL       — автоматически Railway
 *   SESSION_SECRET     — любая случайная строка (для подписи сессий)
 */

import express from "express";
import cors from "cors";
import crypto from "crypto";
import pg from "pg";
import fetch from "node-fetch";
import "dotenv/config";

const {
  BOT_TOKEN,
  CHANNEL_USERNAME = "traidingpr",
  FRONTEND_ORIGIN,
  DATABASE_URL,
  SESSION_SECRET = "change-me-in-prod",
  PORT = 3000,
} = process.env;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required");
if (!DATABASE_URL) console.warn("⚠ DATABASE_URL not set — running without DB");

/* ───────── DB ───────── */

const pool = DATABASE_URL
  ? new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes("railway") || DATABASE_URL.includes("render")
        ? { rejectUnauthorized: false }
        : false,
    })
  : null;

if (pool) {
  // Таблица users уже создаётся ботом. Добавляем таблицу для событий трекинга
  // и для заявок на регистрацию на бирже.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id         BIGSERIAL PRIMARY KEY,
      tg_id      BIGINT NOT NULL,
      event      TEXT NOT NULL,
      payload    JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_events_tg_id   ON events (tg_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events (created_at DESC);

    CREATE TABLE IF NOT EXISTS broker_claims (
      tg_id       BIGINT PRIMARY KEY,
      broker      TEXT NOT NULL DEFAULT 'pocketoption',
      broker_uid  TEXT,
      status      TEXT NOT NULL DEFAULT 'pending',
      proof_file  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
  `);
  console.log("✅ API: Postgres connected, tables ready");
}

/* ───────── Проверка initData от Telegram ─────────
 * Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Логика: Telegram подписывает поля HMAC'ом от секрета = HMAC("WebAppData", BOT_TOKEN).
 * Любой мутированный запрос — подпись не сойдётся. */

function verifyInitData(initData) {
  if (!initData) return { ok: false, reason: "no initData" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "no hash" };

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret  = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const calcHex = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  if (calcHex !== hash) return { ok: false, reason: "bad signature" };

  // Проверка auth_date — не старше 24 часов
  const authDate = Number(params.get("auth_date") || 0);
  const age = Date.now() / 1000 - authDate;
  if (age > 86400) return { ok: false, reason: "stale auth_date" };

  // Распарсим user
  let user = null;
  try { user = JSON.parse(params.get("user") || "null"); } catch {}
  if (!user?.id) return { ok: false, reason: "no user" };

  return { ok: true, user };
}

/* ───────── Проверка подписки на канал через Bot API ───────── */

async function isSubscribed(tgId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=@${CHANNEL_USERNAME}&user_id=${tgId}`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    if (!j.ok) {
      console.warn("getChatMember failed:", j.description);
      return false;
    }
    const status = j.result?.status;
    // Подписан: creator / administrator / member / restricted(в канале это значит может читать)
    return ["creator", "administrator", "member", "restricted"].includes(status);
  } catch (e) {
    console.error("isSubscribed error:", e);
    return false;
  }
}

/* ───────── Подпись и проверка сессии ─────────
 * Простой HMAC-токен: base64(payload).base64(signature).
 * Содержит tg_id и expiration. Не JWT — чтобы не тащить лишнюю зависимость. */

function signSession(tgId) {
  const payload = JSON.stringify({ tg_id: tgId, exp: Date.now() + 24 * 3600_000 });
  const b64     = Buffer.from(payload).toString("base64url");
  const sig     = crypto.createHmac("sha256", SESSION_SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

function verifySession(token) {
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(b64).digest("base64url");
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function authMiddleware(req, res, next) {
  const token = req.headers["x-session"];
  const session = verifySession(token);
  if (!session) return res.status(401).json({ error: "unauthorized" });
  req.tgId = session.tg_id;
  next();
}

/* ───────── Express ───────── */

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin: FRONTEND_ORIGIN || true,
  credentials: true,
  allowedHeaders: ["Content-Type", "X-Session"],
}));

app.get("/health", (_req, res) => res.json({ ok: true }));

/* POST /api/auth
 *   body: { initData: "query_id=...&user=...&auth_date=...&hash=..." }
 *   → 200: { session, user, subscribed, brokerStatus }
 *   → 401: { error: "bad_init_data" }
 */
app.post("/api/auth", async (req, res) => {
  const { initData } = req.body || {};
  const check = verifyInitData(initData);
  if (!check.ok) return res.status(401).json({ error: "bad_init_data", reason: check.reason });

  const user = check.user;
  const subscribed = await isSubscribed(user.id);

  // Апдейт users (бот тоже пишет сюда, таблица общая)
  if (pool) {
    await pool.query(
      `INSERT INTO users (tg_id, username, first_name, last_name, lang)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tg_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         last_seen = NOW(),
         actions = users.actions + 1`,
      [user.id, user.username || null, user.first_name || null, user.last_name || null,
       user.language_code?.startsWith("en") ? "en" : "ru"]
    );
  }

  // Статус заявки на биржу
  let brokerStatus = "none";
  if (pool) {
    const r = await pool.query("SELECT status FROM broker_claims WHERE tg_id = $1", [user.id]);
    brokerStatus = r.rows[0]?.status || "none";
  }

  const session = signSession(user.id);
  res.json({
    session,
    user: {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      lang: user.language_code?.startsWith("en") ? "en" : "ru",
    },
    subscribed,
    brokerStatus,  // none | pending | approved | rejected
  });
});

/* POST /api/track
 *   headers: { X-Session: "..." }
 *   body: { event: "asset_clicked", payload: { ticker: "EUR/USD" } }
 */
app.post("/api/track", authMiddleware, async (req, res) => {
  const { event, payload = {} } = req.body || {};
  if (!event || typeof event !== "string") return res.status(400).json({ error: "no event" });
  if (event.length > 64) return res.status(400).json({ error: "event too long" });

  if (pool) {
    await pool.query(
      "INSERT INTO events (tg_id, event, payload) VALUES ($1, $2, $3)",
      [req.tgId, event, payload]
    );
  }
  res.json({ ok: true });
});

/* POST /api/broker/claim
 *   body: { broker_uid: "12345678" }
 *   → создаёт заявку на ручное одобрение регистрации на бирже */
app.post("/api/broker/claim", authMiddleware, async (req, res) => {
  const { broker_uid } = req.body || {};
  if (!broker_uid || typeof broker_uid !== "string" || broker_uid.length > 32) {
    return res.status(400).json({ error: "invalid broker_uid" });
  }
  if (!pool) return res.status(503).json({ error: "db unavailable" });

  await pool.query(
    `INSERT INTO broker_claims (tg_id, broker_uid, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (tg_id) DO UPDATE SET
       broker_uid = EXCLUDED.broker_uid,
       status = CASE WHEN broker_claims.status = 'approved' THEN 'approved' ELSE 'pending' END,
       created_at = NOW()`,
    [req.tgId, broker_uid]
  );
  res.json({ ok: true, status: "pending" });
});

/* GET /api/me — текущий профиль */
app.get("/api/me", authMiddleware, async (req, res) => {
  if (!pool) return res.json({ tg_id: req.tgId });
  const [u, c] = await Promise.all([
    pool.query("SELECT tg_id, username, first_name, lang, first_seen, actions FROM users WHERE tg_id = $1", [req.tgId]),
    pool.query("SELECT status, broker_uid FROM broker_claims WHERE tg_id = $1", [req.tgId]),
  ]);
  res.json({
    user: u.rows[0] || null,
    broker: c.rows[0] || { status: "none" },
  });
});

app.listen(PORT, () => console.log(`✅ API listening on :${PORT}`));
