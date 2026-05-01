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
      reviewed_at TIMESTAMPTZ,
      auto_approved BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS broker_webhooks (
      id         BIGSERIAL PRIMARY KEY,
      source     TEXT NOT NULL,
      method     TEXT,
      query      JSONB,
      body       JSONB,
      headers    JSONB,
      received_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // На случай, если таблица уже была создана старой версией без auto_approved
  await pool.query(`ALTER TABLE broker_claims ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE`).catch(() => {});
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

  // Апдейт users (бот тоже пишет сюда, таблица общая).
  // Важно: НЕ перетираем lang при UPDATE — иначе сбросится выбор юзера в боте.
  if (pool) {
    await pool.query(
      `INSERT INTO users (tg_id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tg_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         last_seen = NOW(),
         actions = users.actions + 1`,
      [user.id, user.username || null, user.first_name || null, user.last_name || null]
    );
  }

  // Читаем язык из БД (его выбрал юзер в боте). Если NULL — null, фронт сам определит.
  let dbLang = null;
  if (pool) {
    const r = await pool.query("SELECT lang FROM users WHERE tg_id = $1", [user.id]);
    dbLang = r.rows[0]?.lang || null;
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
      lang: dbLang,            // язык из БД (что выбрал юзер в боте) или null
      tg_lang: user.language_code || null,  // язык из настроек Telegram (для fallback)
    },
    subscribed,
    brokerStatus,  // none | pending | approved | rejected
  });
});

/* POST /api/lang
 *   headers: { X-Session: "..." }
 *   body: { lang: "es" }
 *   Сохраняет выбранный в Mini App язык в БД, чтобы бот тоже его знал.
 */
app.post("/api/lang", authMiddleware, async (req, res) => {
  const { lang } = req.body || {};
  const ALLOWED = ["en", "ru", "es", "pt", "tr", "vi", "id", "hi"];
  if (!ALLOWED.includes(lang)) {
    return res.status(400).json({ error: "invalid lang" });
  }
  if (pool) {
    await pool.query("UPDATE users SET lang = $1 WHERE tg_id = $2", [lang, req.tgId]);
  }
  res.json({ ok: true, lang });
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

/* ───────── WEBHOOK: Pocket Option postback ─────────
 * Pocket Option (и большинство affiliate-сетей) шлют S2S-postback с клик-id
 * когда пользователь регистрируется или делает депозит.
 *
 * Настройка в кабинете партнёра partners.pocketoption.com:
 *   URL:       https://YOUR_API/api/webhook/pocketoption?sub_id={sub_id}&trader_id={trader_id}&event={event}
 *   Метод:     GET (или POST — этот endpoint принимает оба)
 *   sub_id:    параметр, в который мы подставляем telegram_id при клике на реф-ссылку
 *
 * Логика:
 *   1. Парсим sub_id (= telegram_id юзера, кликнувшего по реф-ссылке)
 *   2. Парсим trader_id (= его ID в Pocket Option после регистрации)
 *   3. Если в broker_claims есть заявка с tg_id=sub_id → ставим status=approved
 *   4. Если заявки нет — создаём её сразу в approved (юзер мог пройти мимо UID-формы)
 *   5. Шлём пользователю уведомление через Telegram
 *   6. Всё пишем в broker_webhooks для аудита.
 */

app.all("/api/webhook/pocketoption", express.urlencoded({ extended: true }), async (req, res) => {
  const params = { ...req.query, ...(typeof req.body === "object" ? req.body : {}) };

  if (pool) {
    await pool.query(
      `INSERT INTO broker_webhooks (source, method, query, body, headers)
       VALUES ('pocketoption', $1, $2, $3, $4)`,
      [req.method, req.query || {}, req.body || {}, { "user-agent": req.get("user-agent") || "" }]
    ).catch(e => console.error("webhook log:", e));
  }

  // Pocket Option умеет называть параметры по-разному: sub_id, subid, s1, click_id, clickid
  const subId =
    params.sub_id || params.subid || params.s1 ||
    params.click_id || params.clickid || params.cid || params.tag;
  const traderId =
    params.trader_id || params.traderid || params.user_id || params.uid || params.id;
  const eventType =
    params.event || params.event_type || params.goal || params.status || "reg";

  if (!subId || !/^\d+$/.test(String(subId))) {
    return res.json({ ok: true, warn: "no valid sub_id, logged" });
  }

  const tgId = Number(subId);

  if (pool) {
    // Upsert: если заявки нет — создаём approved. Если есть pending/rejected — переводим в approved.
    await pool.query(
      `INSERT INTO broker_claims (tg_id, broker_uid, status, auto_approved, reviewed_at)
       VALUES ($1, $2, 'approved', TRUE, NOW())
       ON CONFLICT (tg_id) DO UPDATE SET
         broker_uid    = COALESCE(EXCLUDED.broker_uid, broker_claims.broker_uid),
         status        = 'approved',
         auto_approved = TRUE,
         reviewed_at   = NOW()`,
      [tgId, traderId ? String(traderId) : null]
    );

    // Шлём уведомление пользователю через Telegram Bot API
    const notifyText =
      `✅ Ваша регистрация на Pocket Option подтверждена автоматически!\n` +
      `Pocket Option ID: ${traderId || "—"}\n\n` +
      `Полный доступ к приложению открыт. 🚀`;
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: tgId, text: notifyText }),
    }).catch(() => {});
  }

  res.json({ ok: true, tg_id: tgId, trader_id: traderId, event: eventType });
});

/* ───────── ТЕХАНАЛИЗ ─────────
 * /api/analyze — возвращает направление (BUY/SELL) на основе RSI+MACD+Bollinger.
 * Для крипты берём реальные свечи с Binance. Для форекса — синтезируем серию
 * вокруг текущего курса (Frankfurter даёт только дневные данные, что для интрадея мало).
 */

function sma(arr, p) {
  const out = Array(arr.length).fill(null);
  for (let i = p - 1; i < arr.length; i++) {
    let s = 0;
    for (let j = i - p + 1; j <= i; j++) s += arr[j];
    out[i] = s / p;
  }
  return out;
}
function ema(arr, p) {
  const out = Array(arr.length).fill(null);
  const k = 2 / (p + 1);
  let seedSum = 0;
  for (let i = 0; i < p && i < arr.length; i++) seedSum += arr[i];
  out[p - 1] = seedSum / p;
  for (let i = p; i < arr.length; i++) out[i] = arr[i] * k + out[i - 1] * (1 - k);
  return out;
}
function rsi(arr, p = 14) {
  if (arr.length < p + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= p; i++) {
    const d = arr[i] - arr[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgG = gains / p, avgL = losses / p;
  for (let i = p + 1; i < arr.length; i++) {
    const d = arr[i] - arr[i - 1];
    avgG = (avgG * (p - 1) + Math.max(0, d)) / p;
    avgL = (avgL * (p - 1) + Math.max(0, -d)) / p;
  }
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
}
function macd(arr) {
  if (arr.length < 26) return null;
  const ema12 = ema(arr, 12);
  const ema26 = ema(arr, 26);
  const macdLine = arr.map((_, i) => (ema12[i] != null && ema26[i] != null) ? ema12[i] - ema26[i] : null);
  const macdOnly = macdLine.filter(x => x != null);
  if (macdOnly.length < 9) return null;
  const signal = ema(macdOnly, 9);
  const macdLast = macdOnly[macdOnly.length - 1];
  const signalLast = signal[signal.length - 1];
  return { macd: macdLast, signal: signalLast, hist: macdLast - signalLast };
}
function bollinger(arr, p = 20, k = 2) {
  if (arr.length < p) return null;
  const mean = sma(arr, p)[arr.length - 1];
  let sq = 0;
  for (let i = arr.length - p; i < arr.length; i++) sq += (arr[i] - mean) ** 2;
  const std = Math.sqrt(sq / p);
  return { mid: mean, upper: mean + k * std, lower: mean - k * std, price: arr[arr.length - 1] };
}

async function fetchCandles(pair) {
  // pair: { label, source, symbol|from|to, digits, ... }
  try {
    if (pair.source === "binance") {
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair.symbol}&interval=5m&limit=60`);
      const j = await r.json();
      if (Array.isArray(j)) return { closes: j.map(c => parseFloat(c[4])), real: true };
    } else if (pair.source === "frankfurter") {
      // Frankfurter — только дневные. Берём текущий курс и синтезируем 60 точек около него
      // с волатильностью, пропорциональной разряду цены. Это не честный теханализ,
      // но даёт осмысленное распределение сигналов (≠ чистый рандом).
      const r = await fetch(`https://api.frankfurter.app/latest?from=${pair.from}&to=${pair.to}`);
      const j = await r.json();
      const base = j.rates?.[pair.to] || pair.fallback || 1;
      return { closes: syntheticSeries(base, pair.digits), real: false };
    }
  } catch {}
  // Fallback — синтез от fallback-значения
  return { closes: syntheticSeries(pair.fallback || 1, pair.digits || 5), real: false };
}

function syntheticSeries(base, digits) {
  const vol = Math.pow(10, -(digits - 2));   // шкала волатильности
  const drift = (Math.random() - 0.5) * vol * 0.5;
  let price = base * (1 + (Math.random() - 0.5) * 0.002);
  const out = [];
  for (let i = 0; i < 60; i++) {
    price += drift + (Math.random() - 0.5) * vol;
    out.push(price);
  }
  return out;
}

app.post("/api/analyze", authMiddleware, async (req, res) => {
  const { pair } = req.body || {};
  if (!pair || typeof pair !== "object" || !pair.source || !pair.label) {
    return res.status(400).json({ error: "invalid pair" });
  }

  const { closes, real } = await fetchCandles(pair);
  if (closes.length < 26) return res.json({
    direction: Math.random() > 0.5 ? "BUY" : "SELL",
    confidence: 0.5, real: false, reason: "insufficient data"
  });

  const rsiVal = rsi(closes);
  const macdVal = macd(closes);
  const bb = bollinger(closes);

  // Голосование 3 индикаторов
  let votes = 0;
  const signals = {};
  if (rsiVal != null) {
    if (rsiVal < 30) { votes++; signals.rsi = "BUY"; }
    else if (rsiVal > 70) { votes--; signals.rsi = "SELL"; }
    else { signals.rsi = rsiVal < 50 ? "BUY" : "SELL"; votes += rsiVal < 50 ? 0.3 : -0.3; }
  }
  if (macdVal) {
    if (macdVal.hist > 0) { votes++; signals.macd = "BUY"; }
    else { votes--; signals.macd = "SELL"; }
  }
  if (bb) {
    if (bb.price < bb.lower) { votes++; signals.bb = "BUY"; }
    else if (bb.price > bb.upper) { votes--; signals.bb = "SELL"; }
    else { signals.bb = bb.price < bb.mid ? "BUY" : "SELL"; votes += bb.price < bb.mid ? 0.3 : -0.3; }
  }

  const direction = votes >= 0 ? "BUY" : "SELL";
  const confidence = Math.min(0.95, 0.5 + Math.abs(votes) / 6);

  res.json({
    direction,
    confidence: Math.round(confidence * 100) / 100,
    real,
    indicators: {
      rsi:  rsiVal != null ? Math.round(rsiVal * 10) / 10 : null,
      macd: macdVal ? Math.round(macdVal.hist * 1e6) / 1e6 : null,
      bb_pos: bb ? ((bb.price - bb.lower) / (bb.upper - bb.lower)).toFixed(2) : null,
    },
    signals,
  });
});

/* ─────────────────────── LIVE QUOTES PROXY ───────────────────────
 * Единая точка получения live-цен из трёх источников:
 *   - Binance      → крипта (22 монеты)
 *   - Frankfurter  → мажорные FX (ЕЦБ, дневные)
 *   - Yahoo Finance → акции, индексы, сырьё, экзотик-FX
 *
 * Кеш 60 секунд в памяти процесса. Раздача клиенту через GET /api/quotes.
 */

// Все крипто-символы Binance, которые хотим мониторить
const CRYPTO_SYMBOLS = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT",
  "TRXUSDT","DOTUSDT","LINKUSDT","MATICUSDT","LTCUSDT","BCHUSDT","SHIBUSDT","UNIUSDT",
  "ATOMUSDT","XLMUSDT","NEARUSDT","APTUSDT","FILUSDT","ETCUSDT"
];
const CRYPTO_SYMBOL_TO_TICKER = {
  BTCUSDT:"BTC/USDT", ETHUSDT:"ETH/USDT", BNBUSDT:"BNB/USDT", SOLUSDT:"SOL/USDT",
  XRPUSDT:"XRP/USDT", ADAUSDT:"ADA/USDT", DOGEUSDT:"DOGE/USDT", AVAXUSDT:"AVAX/USDT",
  TRXUSDT:"TRX/USDT", DOTUSDT:"DOT/USDT", LINKUSDT:"LINK/USDT", MATICUSDT:"MATIC/USDT",
  LTCUSDT:"LTC/USDT", BCHUSDT:"BCH/USDT", SHIBUSDT:"SHIB/USDT", UNIUSDT:"UNI/USDT",
  ATOMUSDT:"ATOM/USDT", XLMUSDT:"XLM/USDT", NEARUSDT:"NEAR/USDT", APTUSDT:"APT/USDT",
  FILUSDT:"FIL/USDT", ETCUSDT:"ETC/USDT",
};

// Yahoo Finance: маппинг нашего тикера → Yahoo symbol
const YAHOO_MAP = {
  // Stocks (тикер = тикер)
  ...Object.fromEntries(
    ["AAPL","MSFT","GOOGL","AMZN","META","TSLA","NVDA","NFLX","JPM","V","MA","PYPL",
     "DIS","NKE","MCD","KO","PEP","SBUX","BA","INTC","AMD","CSCO","ORCL","IBM","ADBE",
     "CRM","UBER","ABNB","SHOP","SPOT","BABA","WMT","XOM","CVX","PFE","COIN"]
    .map(s => [s, s])
  ),
  // Indices
  "SPX500":  "^GSPC",
  "NAS100":  "^IXIC",
  "DJ30":    "^DJI",
  "RUS2K":   "^RUT",
  "UK100":   "^FTSE",
  "GER40":   "^GDAXI",
  "FRA40":   "^FCHI",
  "EU50":    "^STOXX50E",
  "JPN225":  "^N225",
  "HK50":    "^HSI",
  "CN50":    "000001.SS",
  "AUS200":  "^AXJO",
  // Commodities (futures)
  "XAU/USD": "GC=F",
  "XAG/USD": "SI=F",
  "XPT/USD": "PL=F",
  "XPD/USD": "PA=F",
  "WTI":     "CL=F",
  "BRENT":   "BZ=F",
  "NATGAS":  "NG=F",
  "COPPER":  "HG=F",
  "COFFEE":  "KC=F",
  // Экзотик FX
  "USD/TRY": "TRY=X",
  "USD/MXN": "MXN=X",
  "USD/ZAR": "ZAR=X",
};
const YAHOO_REV = Object.fromEntries(Object.entries(YAHOO_MAP).map(([k,v]) => [v,k]));

// Кеш в памяти
const quotesCache = {
  data: {},        // { "BTC/USDT": {price, change}, ... }
  updatedAt: 0,
  updating: null,  // Promise текущего обновления
};
const QUOTES_TTL_MS = 60_000;   // 1 минута

async function fetchBinanceQuotes() {
  const out = {};
  try {
    const symbolsParam = encodeURIComponent(JSON.stringify(CRYPTO_SYMBOLS));
    const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = await r.json();
      for (const item of data) {
        const ticker = CRYPTO_SYMBOL_TO_TICKER[item.symbol];
        if (ticker) {
          out[ticker] = {
            price: parseFloat(item.lastPrice),
            change: parseFloat(item.priceChangePercent),
          };
        }
      }
    }
  } catch (e) { console.warn("binance quotes:", e.message); }
  return out;
}

async function fetchFrankfurterQuotes() {
  // Получаем базовые курсы USD → EUR,GBP,JPY,CHF,CAD,AUD,NZD одним запросом
  const out = {};
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,CHF,CAD,AUD,NZD", {
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const d = await r.json();
      const x = d.rates || {};
      // Считаем все кросс-курсы
      const inv = (c) => x[c] ? 1 / x[c] : null;
      const map = {
        "EUR/USD": inv("EUR"), "GBP/USD": inv("GBP"), "AUD/USD": inv("AUD"), "NZD/USD": inv("NZD"),
        "USD/JPY": x.JPY,      "USD/CHF": x.CHF,      "USD/CAD": x.CAD,
        "EUR/GBP": x.GBP && x.EUR ? x.GBP / x.EUR : null,
        "EUR/JPY": x.JPY && x.EUR ? x.JPY / x.EUR : null,
        "EUR/CHF": x.CHF && x.EUR ? x.CHF / x.EUR : null,
        "EUR/CAD": x.CAD && x.EUR ? x.CAD / x.EUR : null,
        "EUR/AUD": x.AUD && x.EUR ? x.AUD / x.EUR : null,
        "EUR/NZD": x.NZD && x.EUR ? x.NZD / x.EUR : null,
        "GBP/JPY": x.JPY && x.GBP ? x.JPY / x.GBP : null,
        "GBP/CHF": x.CHF && x.GBP ? x.CHF / x.GBP : null,
        "GBP/CAD": x.CAD && x.GBP ? x.CAD / x.GBP : null,
        "GBP/AUD": x.AUD && x.GBP ? x.AUD / x.GBP : null,
        "AUD/JPY": x.JPY && x.AUD ? x.JPY / x.AUD : null,
        "AUD/CAD": x.CAD && x.AUD ? x.CAD / x.AUD : null,
        "AUD/NZD": x.NZD && x.AUD ? x.NZD / x.AUD : null,
        "AUD/CHF": x.CHF && x.AUD ? x.CHF / x.AUD : null,
        "NZD/JPY": x.JPY && x.NZD ? x.JPY / x.NZD : null,
        "CAD/JPY": x.JPY && x.CAD ? x.JPY / x.CAD : null,
        "CAD/CHF": x.CHF && x.CAD ? x.CHF / x.CAD : null,
        "CHF/JPY": x.JPY && x.CHF ? x.JPY / x.CHF : null,
      };
      for (const [ticker, price] of Object.entries(map)) {
        if (price && isFinite(price)) out[ticker] = { price, change: 0 };
      }
    }
  } catch (e) { console.warn("frankfurter:", e.message); }
  return out;
}

async function fetchYahooQuotes() {
  const out = {};
  const symbols = Object.values(YAHOO_MAP);
  const batchSize = 50;
  try {
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${batch.join(",")}`;
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const d = await r.json();
        const items = d.quoteResponse?.result || [];
        for (const it of items) {
          const ticker = YAHOO_REV[it.symbol];
          if (ticker && it.regularMarketPrice != null) {
            out[ticker] = {
              price: it.regularMarketPrice,
              change: it.regularMarketChangePercent ?? 0,
            };
          }
        }
      }
    }
  } catch (e) { console.warn("yahoo:", e.message); }
  return out;
}

async function refreshQuotes() {
  const now = Date.now();
  if (now - quotesCache.updatedAt < QUOTES_TTL_MS && Object.keys(quotesCache.data).length) {
    return; // свежий кеш
  }
  if (quotesCache.updating) return quotesCache.updating; // уже обновляется — ждём

  quotesCache.updating = (async () => {
    const [binance, frankfurter, yahoo] = await Promise.all([
      fetchBinanceQuotes(),
      fetchFrankfurterQuotes(),
      fetchYahooQuotes(),
    ]);
    const merged = { ...frankfurter, ...binance, ...yahoo }; // приоритет: yahoo > binance > frankfurter

    // Генерируем OTC и CHF/NOK, BHD/CNY из реальных пар с микро-шумом
    const otcMapping = {
      "EUR/USD OTC": "EUR/USD", "GBP/USD OTC": "GBP/USD", "USD/JPY OTC": "USD/JPY",
      "AUD/USD OTC": "AUD/USD", "NZD/USD OTC": "NZD/USD", "USD/CHF OTC": "USD/CHF",
      "USD/CAD OTC": "USD/CAD", "EUR/JPY OTC": "EUR/JPY", "GBP/JPY OTC": "GBP/JPY",
      "CHF/JPY OTC": "CHF/JPY", "EUR/CAD OTC": "EUR/CAD",
    };
    for (const [otc, base] of Object.entries(otcMapping)) {
      if (merged[base]) {
        merged[otc] = {
          price: merged[base].price * (1 + (Math.random() - 0.5) * 0.0015),
          change: merged[base].change || 0,
        };
      }
    }

    if (Object.keys(merged).length) {
      quotesCache.data = merged;
      quotesCache.updatedAt = Date.now();
      console.log(`✅ quotes refreshed: ${Object.keys(merged).length} tickers`);
    }
  })().finally(() => { quotesCache.updating = null; });

  return quotesCache.updating;
}

// Прогрев кеша при старте
refreshQuotes().catch(() => {});
// Автообновление каждую минуту (если кто-то запрашивает раз в минуту и чаще)
setInterval(() => { refreshQuotes().catch(() => {}); }, 55_000);

// Публичный endpoint — без авторизации, цены публичны
app.get("/api/quotes", async (_req, res) => {
  await refreshQuotes().catch(() => {});
  res.json({
    quotes: quotesCache.data,
    updatedAt: quotesCache.updatedAt,
    age_s: Math.round((Date.now() - quotesCache.updatedAt) / 1000),
    count: Object.keys(quotesCache.data).length,
  });
});

app.listen(PORT, () => console.log(`✅ API listening on :${PORT}`));
