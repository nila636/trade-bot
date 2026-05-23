/* VIP-бот для депозитеров.
 *
 * Сценарий:
 *   1. Юзер кликает invite-ссылку → /start
 *   2. Бот проверяет в broker_claims есть ли deposited_at для этого tg_id
 *      - НЕТ → "сначала сделай депозит, вот ссылка" + кнопка на Pocket Option
 *      - ДА → главное меню с кнопкой "🤖 Получить сигнал"
 *   3. Юзер жмёт сигнал → бот проверяет лимит (5/день)
 *      - Если signals_today < 5 → выдаёт сигнал, увеличивает счётчик
 *      - Если >= 5 → "лимит исчерпан, обновится в 12:00"
 *   4. Daily cron в RESET_HOUR_UTC сбрасывает signals_today для всех.
 *
 * На этапе 1 (текущем): сигнал — заглушка. На этапе 2 подключим Claude API. */

import { Bot, InlineKeyboard } from "grammy";
import pg from "pg";

const BOT_TOKEN        = process.env.BOT_TOKEN;
const ADMIN_IDS        = (process.env.ADMIN_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean).map(Number);
const SIGNALS_PER_DAY  = Number(process.env.SIGNALS_PER_DAY || 5);
const RESET_HOUR_UTC   = Number(process.env.RESET_HOUR_UTC || 9); // 9 UTC = 12:00 MSK
const MAIN_BOT_URL     = process.env.MAIN_BOT_URL     || "https://t.me/tradenewpt_bot";
const POCKET_OPTION_URL = process.env.POCKET_OPTION_URL || "https://pocketoption.com/";

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");

const hasDb = !!process.env.DATABASE_URL;
let pool = null;
if (hasDb) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("railway") ? { rejectUnauthorized: false } : false,
  });
  console.log("✅ VIP: Postgres connected");
} else {
  throw new Error("DATABASE_URL is required for VIP bot (shared with main api)");
}

const bot = new Bot(BOT_TOKEN);
const isAdmin = (id) => ADMIN_IDS.includes(id);

/* ─────────────────────── I18N (минимально для этапа 1) ─────────────────────── */

const T = {
  en: {
    welcome_deposited: "💎 Welcome to the <b>VIP bot</b>!\n\nYou get up to {limit} high-confidence AI signals per day with full analysis.\n\nClick the button below to get a signal. Counter resets daily at {hour}:00 UTC.",
    welcome_no_deposit: "🔒 VIP access requires a Pocket Option deposit.\n\n1. Register on Pocket Option using our partner link\n2. Make a deposit (any amount)\n3. Auto-approval is instant — you'll get a notification\n\n👇 Get started:",
    btn_signal: "🤖 Get VIP signal ({left}/{limit} left)",
    btn_signal_zero: "⏳ Limit reached — reset at {hour}:00 UTC",
    btn_register: "🏦 Register on Pocket Option",
    btn_main_bot: "↩️ Back to main bot",
    signal_header: "🤖 <b>VIP AI SIGNAL</b>",
    signal_placeholder: "<i>AI integration coming in Phase 2 (Claude Sonnet 4.5). For now you see a demo signal so we can test the limit/reset flow.</i>",
    limit_reached: "⏳ You've used all {limit} signals for today.\n\nLimit resets at {hour}:00 UTC.",
    not_a_depositor: "🔒 This feature is for depositors only.",
  },
  ru: {
    welcome_deposited: "💎 Добро пожаловать в <b>VIP-бот</b>!\n\nВы получаете до {limit} высокоуверенных AI-сигналов в день с полным анализом.\n\nЖми кнопку ниже, чтобы получить сигнал. Счётчик обновляется каждый день в {hour}:00 UTC.",
    welcome_no_deposit: "🔒 Доступ к VIP-боту открывается после депозита в Pocket Option.\n\n1. Зарегистрируйся по нашей партнёрской ссылке\n2. Внеси депозит (любая сумма)\n3. Одобрение приходит автоматически — получишь уведомление\n\n👇 Начни:",
    btn_signal: "🤖 Получить VIP-сигнал ({left}/{limit} осталось)",
    btn_signal_zero: "⏳ Лимит исчерпан — обновится в {hour}:00 UTC",
    btn_register: "🏦 Зарегистрироваться в Pocket Option",
    btn_main_bot: "↩️ Вернуться в основной бот",
    signal_header: "🤖 <b>VIP AI СИГНАЛ</b>",
    signal_placeholder: "<i>AI-интеграция появится на этапе 2 (Claude Sonnet 4.5). Сейчас это демо-сигнал — проверяем работу лимита/сброса.</i>",
    limit_reached: "⏳ Ты использовал все {limit} сигналов на сегодня.\n\nЛимит обновится в {hour}:00 UTC.",
    not_a_depositor: "🔒 Эта функция только для депозитеров.",
  },
};

async function getLang(tgId) {
  if (!pool) return "en";
  const r = await pool.query("SELECT lang FROM users WHERE tg_id = $1", [tgId]).catch(() => null);
  const l = r?.rows?.[0]?.lang;
  return (l && T[l]) ? l : (T[l?.slice(0, 2)] ? l.slice(0, 2) : "en");
}

function fmt(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

/* ─────────────────────── ПРОВЕРКА ДОСТУПА ─────────────────────── */

async function isDepositor(tgId) {
  const r = await pool.query(
    `SELECT deposited_at FROM broker_claims WHERE tg_id = $1 AND deposited_at IS NOT NULL`,
    [tgId]
  ).catch(() => null);
  return !!r?.rows?.length;
}

async function getUsage(tgId) {
  // Ленивая инициализация записи + автосброс если прошло > 24h с last_reset
  const r = await pool.query(
    `INSERT INTO vip_usage (tg_id) VALUES ($1)
     ON CONFLICT (tg_id) DO UPDATE SET tg_id = EXCLUDED.tg_id
     RETURNING signals_today, last_reset, total_signals`,
    [tgId]
  );
  return r.rows[0];
}

async function incrementUsage(tgId) {
  await pool.query(
    `UPDATE vip_usage SET signals_today = signals_today + 1, total_signals = total_signals + 1 WHERE tg_id = $1`,
    [tgId]
  );
}

/* ─────────────────────── DAILY RESET CRON ─────────────────────── */

async function dailyReset() {
  const r = await pool.query(
    `UPDATE vip_usage SET signals_today = 0, last_reset = NOW() WHERE signals_today > 0`
  );
  console.log(`✅ Daily reset: ${r.rowCount} users reset to 0`);
  // Уведомление админам
  for (const adminId of ADMIN_IDS) {
    bot.api.sendMessage(adminId, `✅ VIP daily reset: ${r.rowCount} users reset`).catch(() => {});
  }
}

function scheduleDailyReset() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(RESET_HOUR_UTC, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const msUntilNext = next - now;
  console.log(`⏰ Next daily reset in ${Math.round(msUntilNext / 1000 / 60)} min (at ${next.toISOString()})`);
  setTimeout(() => {
    dailyReset().catch(e => console.error("dailyReset error:", e));
    setInterval(() => dailyReset().catch(e => console.error("dailyReset error:", e)), 24 * 3600 * 1000);
  }, msUntilNext);
}

/* ─────────────────────── BOT HANDLERS ─────────────────────── */

async function buildMainMenu(tgId, lang) {
  const usage = await getUsage(tgId);
  const left = Math.max(0, SIGNALS_PER_DAY - usage.signals_today);
  const t = T[lang] || T.en;
  const kb = new InlineKeyboard();
  if (left > 0) {
    kb.text(fmt(t.btn_signal, { left, limit: SIGNALS_PER_DAY }), "signal");
  } else {
    kb.text(fmt(t.btn_signal_zero, { hour: RESET_HOUR_UTC }), "signal_blocked");
  }
  return { kb, left };
}

bot.command("start", async (ctx) => {
  const lang = await getLang(ctx.from.id);
  const t = T[lang] || T.en;

  const depositor = await isDepositor(ctx.from.id);
  if (!depositor) {
    const kb = new InlineKeyboard()
      .url(t.btn_register, `${POCKET_OPTION_URL}&sub_id1=${ctx.from.id}`).row()
      .url(t.btn_main_bot, MAIN_BOT_URL);
    return ctx.reply(t.welcome_no_deposit, { parse_mode: "HTML", reply_markup: kb, disable_web_page_preview: true });
  }

  const { kb } = await buildMainMenu(ctx.from.id, lang);
  await ctx.reply(
    fmt(t.welcome_deposited, { limit: SIGNALS_PER_DAY, hour: RESET_HOUR_UTC }),
    { parse_mode: "HTML", reply_markup: kb }
  );

  // Уведомление админу о новом VIP-юзере
  if (ADMIN_IDS.length) {
    for (const adminId of ADMIN_IDS) {
      bot.api.sendMessage(adminId, `💎 New VIP user: ${ctx.from.first_name || "—"} (id ${ctx.from.id}, @${ctx.from.username || "—"})`).catch(() => {});
    }
  }
});

bot.callbackQuery("signal_blocked", async (ctx) => {
  const lang = await getLang(ctx.from.id);
  const t = T[lang] || T.en;
  await ctx.answerCallbackQuery({
    text: fmt(t.limit_reached, { limit: SIGNALS_PER_DAY, hour: RESET_HOUR_UTC }).replace(/\n+/g, " "),
    show_alert: true,
  });
});

bot.callbackQuery("signal", async (ctx) => {
  const lang = await getLang(ctx.from.id);
  const t = T[lang] || T.en;

  const depositor = await isDepositor(ctx.from.id);
  if (!depositor) {
    return ctx.answerCallbackQuery({ text: t.not_a_depositor, show_alert: true });
  }

  const usage = await getUsage(ctx.from.id);
  if (usage.signals_today >= SIGNALS_PER_DAY) {
    return ctx.answerCallbackQuery({
      text: fmt(t.limit_reached, { limit: SIGNALS_PER_DAY, hour: RESET_HOUR_UTC }),
      show_alert: true,
    });
  }

  await ctx.answerCallbackQuery();

  // ───────── PLACEHOLDER SIGNAL (этап 1) ─────────
  // На этапе 2 заменим на вызов Claude API через /api/vip-signal endpoint.
  const placeholderSignal =
    `${t.signal_header}\n\n` +
    `📊 <b>EUR/USD</b>\n` +
    `🟢 <b>BUY (LONG)</b>\n` +
    `🎯 Confidence: <b>87%</b>\n` +
    `⏱ Expiration: <b>5 min</b>\n\n` +
    `<b>Analysis:</b>\n` +
    `RSI(14) = 32 (oversold), MACD bullish cross on 5m, price touched lower Bollinger band — reversion likely.\n\n` +
    `${t.signal_placeholder}`;

  await incrementUsage(ctx.from.id);
  const { kb } = await buildMainMenu(ctx.from.id, lang);
  await ctx.reply(placeholderSignal, { parse_mode: "HTML", reply_markup: kb });
});

/* ─────────────────────── START ─────────────────────── */

bot.start();
console.log("🚀 VIP bot started");
scheduleDailyReset();
