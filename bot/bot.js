/**
 * TRADE BOT — Telegram Bot
 * ────────────────────────
 * Теперь с трекингом пользователей и админ-панелью.
 *
 * ENV переменные (.env локально / Variables на Railway):
 *   BOT_TOKEN         — токен от @BotFather
 *   WEBAPP_URL        — https://your.netlify.app
 *   SUPPORT_URL       — https://t.me/your_support
 *   REVIEWS_URL       — https://t.me/your_reviews
 *   ADMIN_IDS         — твой Telegram ID (узнать у @userinfobot). Можно несколько через запятую: 12345,67890
 *   DATABASE_URL      — подставится автоматически Railway, если добавишь Postgres сервис
 *
 * Если DATABASE_URL не задан — бот работает "в памяти" (для локальной разработки).
 */

import { Bot, InlineKeyboard } from "grammy";
import "dotenv/config";
import pg from "pg";

const BOT_TOKEN     = process.env.BOT_TOKEN;
const WEBAPP_URL    = process.env.WEBAPP_URL    || "https://example.com";
const SUPPORT_URL   = process.env.SUPPORT_URL   || "https://t.me/your_support";
const REVIEWS_URL   = process.env.REVIEWS_URL   || "https://t.me/your_reviews";
const WELCOME_IMAGE = process.env.WELCOME_IMAGE;
const ADMIN_IDS     = (process.env.ADMIN_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean).map(Number);

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");

const bot = new Bot(BOT_TOKEN);

/* ─────────────────────── DATABASE ───────────────────────
 * Используем Postgres если DATABASE_URL задан, иначе — Map в памяти. */

const hasDb = !!process.env.DATABASE_URL;
let pool = null;

if (hasDb) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("railway") || process.env.DATABASE_URL.includes("render")
      ? { rejectUnauthorized: false }
      : false,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      tg_id       BIGINT PRIMARY KEY,
      username    TEXT,
      first_name  TEXT,
      last_name   TEXT,
      lang        TEXT DEFAULT 'ru',
      first_seen  TIMESTAMPTZ DEFAULT NOW(),
      last_seen   TIMESTAMPTZ DEFAULT NOW(),
      actions     INT DEFAULT 0
    )
  `);
  console.log("✅ Postgres connected, users table ready");
} else {
  console.log("⚠ No DATABASE_URL — running in-memory (данные пропадут при рестарте)");
}

const memUsers = new Map();

async function trackUser(ctx) {
  const u = ctx.from;
  if (!u) return;
  const data = {
    tg_id: u.id,
    username: u.username || null,
    first_name: u.first_name || null,
    last_name: u.last_name || null,
    lang: u.language_code?.startsWith("en") ? "en" : "ru",
  };

  let isNew = false;
  if (hasDb) {
    // Сначала узнаём новый ли это юзер (чтобы уведомить админа)
    const exists = await pool.query("SELECT 1 FROM users WHERE tg_id = $1", [data.tg_id]);
    isNew = exists.rowCount === 0;

    await pool.query(
      `INSERT INTO users (tg_id, username, first_name, last_name, lang)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tg_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         last_seen = NOW(),
         actions = users.actions + 1`,
      [data.tg_id, data.username, data.first_name, data.last_name, data.lang]
    );
  } else {
    isNew = !memUsers.has(data.tg_id);
    const existing = memUsers.get(data.tg_id) || { ...data, first_seen: new Date(), actions: 0 };
    existing.last_seen = new Date();
    existing.actions += 1;
    existing.username = data.username;
    existing.first_name = data.first_name;
    existing.last_name = data.last_name;
    memUsers.set(data.tg_id, existing);
  }

  // Уведомление админам о новом пользователе
  if (isNew && ADMIN_IDS.length) {
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || "—";
    const tag  = data.username ? `@${data.username}` : `id${data.tg_id}`;
    const stats = hasDb ? await getStats() : { total: memUsers.size };
    const msg =
      `🆕 *Новый пользователь*\n\n` +
      `${name} (${tag})\n` +
      `🌐 Язык: ${data.lang}\n` +
      `👥 Всего юзеров: ${stats.total}`;
    for (const adminId of ADMIN_IDS) {
      bot.api.sendMessage(adminId, msg, { parse_mode: "Markdown" }).catch(() => {});
    }
  }
}

async function getStats() {
  if (hasDb) {
    const [totalQ, todayQ, weekQ, activeQ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS n FROM users`),
      pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE first_seen > NOW() - INTERVAL '1 day'`),
      pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE first_seen > NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE last_seen > NOW() - INTERVAL '1 day'`),
    ]);
    return {
      total:  totalQ.rows[0].n,
      today:  todayQ.rows[0].n,
      week:   weekQ.rows[0].n,
      active: activeQ.rows[0].n,
    };
  } else {
    const now = Date.now();
    const day = 86400_000;
    const users = [...memUsers.values()];
    return {
      total:  users.length,
      today:  users.filter(u => now - new Date(u.first_seen).getTime() < day).length,
      week:   users.filter(u => now - new Date(u.first_seen).getTime() < day * 7).length,
      active: users.filter(u => now - new Date(u.last_seen).getTime() < day).length,
    };
  }
}

async function getRecentUsers(limit = 20) {
  if (hasDb) {
    const r = await pool.query(
      `SELECT tg_id, username, first_name, last_name, lang, first_seen, last_seen, actions
       FROM users ORDER BY last_seen DESC LIMIT $1`,
      [limit]
    );
    return r.rows;
  } else {
    return [...memUsers.values()]
      .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))
      .slice(0, limit);
  }
}

async function getAllUsers() {
  if (hasDb) {
    const r = await pool.query(
      `SELECT tg_id, username, first_name, last_name, lang, first_seen, last_seen, actions
       FROM users ORDER BY first_seen ASC`
    );
    return r.rows;
  } else {
    return [...memUsers.values()].sort((a, b) => new Date(a.first_seen) - new Date(b.first_seen));
  }
}

/* ─────────────────────── I18N ─────────────────────── */

const L = {
  ru: {
    title: "📊 *TRADE BOT*",
    welcome:
      "Добро пожаловать в *TRADE BOT* — систему торговых сигналов на базе искусственного интеллекта.\n\n" +
      "📈 *Точность алгоритма:* до 87%\n" +
      "⚡ *Сигналы в режиме реального времени*\n" +
      "🔒 *Защищённый доступ*",
    choose: "Выберите действие ниже:",
    btn_guide:    "📘 Инструкция",
    btn_reviews:  "⭐ Отзывы",
    btn_support:  "💬 Поддержка",
    btn_language: "🌐 Сменить язык",
    btn_signal:   "🚀 Получить сигнал 🚀",
    guide:
      "*📘 Как пользоваться TRADE BOT*\n\n" +
      "1️⃣ Нажми *🚀 Получить сигнал* — откроется приложение.\n" +
      "2️⃣ Выбери актив в разделе *Активы*.\n" +
      "3️⃣ Тапни по активу — алгоритм выдаст направление *ВВЕРХ* или *ШОРТ*.\n" +
      "4️⃣ Используй встроенный *Калькулятор* для контроля риска.\n" +
      "5️⃣ Следи за *Новостями* — важные релизы отмечены красным.\n\n" +
      "⚠️ Торговля сопряжена с риском.",
    lang_prompt:  "Выберите язык / Choose language:",
    lang_set_ru:  "✅ Язык: Русский",
    lang_set_en:  "✅ Language: English",
  },
  en: {
    title: "📊 *TRADE BOT*",
    welcome:
      "Welcome to *TRADE BOT* — an AI-powered trading signals system.\n\n" +
      "📈 *Algorithm accuracy:* up to 87%\n" +
      "⚡ *Real-time signals*\n" +
      "🔒 *Secure access*",
    choose: "Choose an action below:",
    btn_guide:    "📘 Guide",
    btn_reviews:  "⭐ Reviews",
    btn_support:  "💬 Support",
    btn_language: "🌐 Change language",
    btn_signal:   "🚀 Get signal 🚀",
    guide:
      "*📘 How to use TRADE BOT*\n\n" +
      "1️⃣ Tap *🚀 Get signal* — the app opens.\n" +
      "2️⃣ Pick an asset in the *Assets* section.\n" +
      "3️⃣ Tap the asset — you'll get *UP* or *SHORT* direction.\n" +
      "4️⃣ Use the *Calculator* for risk control.\n" +
      "5️⃣ Watch *News* — high-impact events are marked red.\n\n" +
      "⚠️ Trading involves risk.",
    lang_prompt:  "Выберите язык / Choose language:",
    lang_set_ru:  "✅ Язык: Русский",
    lang_set_en:  "✅ Language: English",
  },
};

const userLang = new Map();
const getLang = (id) => userLang.get(id) || "ru";
const setLang = (id, code) => userLang.set(id, code);

/* ─────────────────────── KEYBOARDS ─────────────────────── */

function mainKeyboard(lang) {
  const T = L[lang];
  return new InlineKeyboard()
    .text(T.btn_guide,    "guide")
    .text(T.btn_reviews,  "reviews").row()
    .text(T.btn_support,  "support")
    .text(T.btn_language, "language").row()
    .webApp(T.btn_signal, WEBAPP_URL);
}

function langKeyboard() {
  return new InlineKeyboard()
    .text("🇷🇺 Русский", "setlang_ru")
    .text("🇬🇧 English", "setlang_en").row()
    .text("⬅ Back / Назад", "back_main");
}

function backKeyboard(lang) {
  return new InlineKeyboard().text("⬅ " + (lang === "ru" ? "Назад" : "Back"), "back_main");
}

/* ─────────────────────── MIDDLEWARE: трекинг каждого действия ─────────────────────── */

bot.use(async (ctx, next) => {
  await trackUser(ctx).catch(e => console.error("trackUser:", e));
  return next();
});

/* ─────────────────────── USER HANDLERS ─────────────────────── */

bot.command("start", async (ctx) => {
  const lang = getLang(ctx.from.id);
  const T    = L[lang];
  const caption = `${T.title}\n\n${T.welcome}\n\n${T.choose}`;
  const opts    = { parse_mode: "Markdown", reply_markup: mainKeyboard(lang) };

  if (WELCOME_IMAGE) {
    await ctx.replyWithPhoto(WELCOME_IMAGE, { caption, ...opts });
  } else {
    await ctx.reply(caption, opts);
  }
});

bot.callbackQuery("guide", async (ctx) => {
  const lang = getLang(ctx.from.id);
  await ctx.answerCallbackQuery();
  await ctx.reply(L[lang].guide, { parse_mode: "Markdown", reply_markup: backKeyboard(lang) });
});

bot.callbackQuery("reviews", async (ctx) => {
  await ctx.answerCallbackQuery({ url: REVIEWS_URL }).catch(() => {});
  await ctx.reply(REVIEWS_URL);
});

bot.callbackQuery("support", async (ctx) => {
  await ctx.answerCallbackQuery({ url: SUPPORT_URL }).catch(() => {});
  await ctx.reply(SUPPORT_URL);
});

bot.callbackQuery("language", async (ctx) => {
  const lang = getLang(ctx.from.id);
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: langKeyboard() }).catch(async () => {
    await ctx.reply(L[lang].lang_prompt, { reply_markup: langKeyboard() });
  });
});

bot.callbackQuery(/^setlang_(ru|en)$/, async (ctx) => {
  const code = ctx.match[1];
  setLang(ctx.from.id, code);
  await ctx.answerCallbackQuery({ text: code === "ru" ? L.ru.lang_set_ru : L.en.lang_set_en });
  const T = L[code];
  const caption = `${T.title}\n\n${T.welcome}\n\n${T.choose}`;
  try {
    await ctx.editMessageCaption({ caption, parse_mode: "Markdown", reply_markup: mainKeyboard(code) });
  } catch {
    await ctx.editMessageText(caption, { parse_mode: "Markdown", reply_markup: mainKeyboard(code) }).catch(async () => {
      await ctx.reply(caption, { parse_mode: "Markdown", reply_markup: mainKeyboard(code) });
    });
  }
});

bot.callbackQuery("back_main", async (ctx) => {
  const lang = getLang(ctx.from.id);
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: mainKeyboard(lang) }).catch(async () => {
    const T = L[lang];
    await ctx.reply(`${T.title}\n\n${T.choose}`, { parse_mode: "Markdown", reply_markup: mainKeyboard(lang) });
  });
});

/* ─────────────────────── АДМИН-ПАНЕЛЬ ─────────────────────── */

const isAdmin = (id) => ADMIN_IDS.includes(id);

function fmtDate(d) {
  return new Date(d).toISOString().replace("T", " ").substring(0, 16);
}

function userRow(u, i) {
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
  const tag  = u.username ? `@${u.username}` : `id${u.tg_id}`;
  return `${i + 1}. ${name} (${tag})\n   🌐 ${u.lang} · 🎯 ${u.actions} действ. · ${fmtDate(u.last_seen)}`;
}

function adminKeyboard() {
  return new InlineKeyboard()
    .text("👥 Последние 20", "adm_recent").row()
    .text("📋 Экспорт CSV", "adm_export").row()
    .text("🔄 Обновить", "adm_refresh");
}

async function sendAdminDashboard(ctx, edit = false) {
  const s = await getStats();
  const storage = hasDb ? "🗄 Postgres" : "⚠ In-memory";
  const msg =
    `🛠 *АДМИН-ПАНЕЛЬ*\n\n` +
    `👥 *Всего пользователей:* ${s.total}\n` +
    `🆕 *За сегодня:* ${s.today}\n` +
    `📈 *За 7 дней:* ${s.week}\n` +
    `⚡ *Активных (24ч):* ${s.active}\n\n` +
    `_Хранилище: ${storage}_\n` +
    `_Обновлено: ${fmtDate(new Date())}_`;
  const opts = { parse_mode: "Markdown", reply_markup: adminKeyboard() };
  if (edit) {
    await ctx.editMessageText(msg, opts).catch(() => ctx.reply(msg, opts));
  } else {
    await ctx.reply(msg, opts);
  }
}

bot.command("admin", async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply("⛔ Доступ запрещён.\n\nТвой ID: `" + ctx.from.id + "`", { parse_mode: "Markdown" });
  }
  await sendAdminDashboard(ctx);
});

bot.command("myid", async (ctx) => {
  await ctx.reply(`Твой Telegram ID: \`${ctx.from.id}\``, { parse_mode: "Markdown" });
});

bot.callbackQuery("adm_refresh", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery({ text: "⛔", show_alert: true });
  await sendAdminDashboard(ctx, true);
  await ctx.answerCallbackQuery({ text: "✅ Обновлено" });
});

bot.callbackQuery("adm_recent", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery({ text: "⛔", show_alert: true });
  await ctx.answerCallbackQuery();
  const users = await getRecentUsers(20);
  if (!users.length) return ctx.reply("_Пока никто не заходил_", { parse_mode: "Markdown" });
  const lines = users.map(userRow);
  const chunks = chunkLines(lines, 3500);
  for (let i = 0; i < chunks.length; i++) {
    const header = i === 0 ? "👥 *Последние активные:*\n\n" : "";
    await ctx.reply(header + chunks[i], { parse_mode: "Markdown", disable_web_page_preview: true });
  }
});

bot.callbackQuery("adm_export", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery({ text: "⛔", show_alert: true });
  await ctx.answerCallbackQuery({ text: "Формирую CSV..." });
  const users = await getAllUsers();
  const header = "tg_id,username,first_name,last_name,lang,first_seen,last_seen,actions";
  const rows = users.map(u => [
    u.tg_id,
    csvEscape(u.username),
    csvEscape(u.first_name),
    csvEscape(u.last_name),
    u.lang,
    fmtDate(u.first_seen),
    fmtDate(u.last_seen),
    u.actions,
  ].join(","));
  const csv = [header, ...rows].join("\n");
  const buf = Buffer.from(csv, "utf-8");
  await ctx.replyWithDocument(
    { source: buf, filename: `users_${Date.now()}.csv` },
    { caption: `📋 Экспорт: ${users.length} пользователей` }
  );
});

/* ─────────────────────── ЗАЯВКИ НА БИРЖУ ─────────────────────── */

const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "traidingpr";
const BROKER_REF_URL   = process.env.BROKER_REF_URL   || "https://pocketoption.com/ru/?ref=YOUR_REF_ID";

bot.command("claims", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("⛔ Доступ запрещён.");
  if (!hasDb) return ctx.reply("⚠ БД недоступна, функция не работает в in-memory режиме.");

  const r = await pool.query(
    `SELECT c.tg_id, c.broker_uid, c.created_at, u.username, u.first_name, u.last_name
     FROM broker_claims c LEFT JOIN users u ON u.tg_id = c.tg_id
     WHERE c.status = 'pending'
     ORDER BY c.created_at ASC LIMIT 20`
  );
  if (!r.rowCount) return ctx.reply("_Заявок в ожидании нет_", { parse_mode: "Markdown" });

  for (const row of r.rows) {
    const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "—";
    const tag  = row.username ? `@${row.username}` : `id${row.tg_id}`;
    const text =
      `⏳ *Заявка на доступ*\n\n` +
      `👤 ${name} (${tag})\n` +
      `🏦 Pocket Option UID: \`${row.broker_uid}\`\n` +
      `📅 Подана: ${fmtDate(row.created_at)}`;
    const kb = new InlineKeyboard()
      .text("✅ Одобрить", `claim_ok_${row.tg_id}`)
      .text("❌ Отклонить", `claim_no_${row.tg_id}`);
    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
  }
});

bot.callbackQuery(/^claim_(ok|no)_(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery({ text: "⛔", show_alert: true });
  const [, verdict, tgIdStr] = ctx.match;
  const tgId = Number(tgIdStr);
  const newStatus = verdict === "ok" ? "approved" : "rejected";

  if (hasDb) {
    await pool.query(
      `UPDATE broker_claims SET status = $1, reviewed_at = NOW() WHERE tg_id = $2`,
      [newStatus, tgId]
    );
  }

  // Уведомление пользователю
  const userMsg = newStatus === "approved"
    ? "✅ Ваша регистрация на Pocket Option подтверждена! Полный доступ к приложению открыт."
    : "❌ Ваша заявка отклонена. Убедитесь, что вы зарегистрировались по реферальной ссылке в боте, и подайте заявку заново.";
  await bot.api.sendMessage(tgId, userMsg).catch(() => {});

  await ctx.answerCallbackQuery({
    text: newStatus === "approved" ? "✅ Одобрено" : "❌ Отклонено",
  });
  await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
  await ctx.reply(`Заявка ${tgId} → *${newStatus}*`, { parse_mode: "Markdown" });
});

/* Команда проверки подписки юзера на канал — полезна для дебага */
bot.command("checksub", async (ctx) => {
  try {
    const m = await bot.api.getChatMember(`@${CHANNEL_USERNAME}`, ctx.from.id);
    const subscribed = ["creator", "administrator", "member"].includes(m.status);
    await ctx.reply(
      subscribed
        ? `✅ Вы подписаны на @${CHANNEL_USERNAME} (status: ${m.status})`
        : `❌ Вы не подписаны на @${CHANNEL_USERNAME}\nhttps://t.me/${CHANNEL_USERNAME}`
    );
  } catch (e) {
    await ctx.reply(`⚠ Ошибка проверки: ${e.description || e.message}\n\nУбедитесь, что бот добавлен админом в канал @${CHANNEL_USERNAME}.`);
  }
});

function csvEscape(s) {
  if (s == null) return "";
  const str = String(s);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function chunkLines(lines, maxLen) {
  const out = [];
  let cur = "";
  for (const l of lines) {
    if (cur.length + l.length + 2 > maxLen) { out.push(cur); cur = l; }
    else { cur = cur ? cur + "\n\n" + l : l; }
  }
  if (cur) out.push(cur);
  return out;
}

/* ─────────────────────── РАССЫЛКА ─────────────────────── */

/* Хранилище pending-рассылок: key = broadcastId, value = { text, fromAdminId } */
const pendingBroadcasts = new Map();

bot.command("broadcast", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("⛔ Доступ запрещён.");

  // Текст после команды: /broadcast Привет всем!
  const text = ctx.match?.trim();
  if (!text) {
    return ctx.reply(
      "📢 *Рассылка всем пользователям*\n\n" +
      "Использование:\n`/broadcast ваш текст`\n\n" +
      "Поддерживается Markdown: *жирный*, _курсив_, [ссылка](url), `код`.\n\n" +
      "После команды ты увидишь превью и кнопку подтверждения.",
      { parse_mode: "Markdown" }
    );
  }

  const users = await getAllUsers();
  if (!users.length) return ctx.reply("_Нет пользователей для рассылки_", { parse_mode: "Markdown" });

  // Сохраняем в памяти — ждём подтверждения
  const bid = Date.now().toString(36);
  pendingBroadcasts.set(bid, { text, fromAdminId: ctx.from.id, count: users.length });

  const preview =
    `📢 *Превью рассылки*\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `${text}\n` +
    `━━━━━━━━━━━━━━━━\n\n` +
    `👥 *Получателей:* ${users.length}\n` +
    `⏱ *Примерное время:* ${Math.ceil(users.length * 0.05)} сек\n\n` +
    `Отправить всем пользователям?`;
  const kb = new InlineKeyboard()
    .text("📤 Отправить", `bc_ok_${bid}`)
    .text("❌ Отмена", `bc_no_${bid}`);
  await ctx.reply(preview, { parse_mode: "Markdown", reply_markup: kb });
});

bot.callbackQuery(/^bc_no_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery({ text: "⛔", show_alert: true });
  const bid = ctx.match[1];
  pendingBroadcasts.delete(bid);
  await ctx.answerCallbackQuery({ text: "Отменено" });
  await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
  await ctx.reply("❌ Рассылка отменена.");
});

bot.callbackQuery(/^bc_ok_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery({ text: "⛔", show_alert: true });
  const bid = ctx.match[1];
  const pending = pendingBroadcasts.get(bid);
  if (!pending) return ctx.answerCallbackQuery({ text: "Истекло, /broadcast заново", show_alert: true });
  pendingBroadcasts.delete(bid);

  await ctx.answerCallbackQuery({ text: "Запускаю рассылку..." });
  await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});

  const users = await getAllUsers();
  let sent = 0, failed = 0, blocked = 0;
  const statusMsg = await ctx.reply(`📤 Рассылаю... 0 / ${users.length}`);
  const startedAt = Date.now();

  // Rate limit Telegram: 30 msg/sec для разных чатов. Держим 25 для запаса.
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    try {
      await bot.api.sendMessage(u.tg_id, pending.text, { parse_mode: "Markdown", disable_web_page_preview: false });
      sent++;
    } catch (e) {
      failed++;
      if (e.description?.includes("blocked") || e.description?.includes("deactivated")) blocked++;
    }
    // обновляем статус каждые 10 юзеров
    if ((i + 1) % 10 === 0 || i === users.length - 1) {
      bot.api.editMessageText(
        statusMsg.chat.id, statusMsg.message_id,
        `📤 Рассылаю... ${i + 1} / ${users.length}\n✅ Доставлено: ${sent}\n⚠ Ошибок: ${failed}`
      ).catch(() => {});
    }
    // пауза ~40ms чтобы не упереться в rate limit
    await new Promise(r => setTimeout(r, 40));
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  await ctx.reply(
    `✅ *Рассылка завершена*\n\n` +
    `📨 Отправлено: ${sent}\n` +
    `⚠ Ошибок: ${failed}${blocked ? ` (из них заблокировали бота: ${blocked})` : ""}\n` +
    `⏱ Время: ${elapsed}s`,
    { parse_mode: "Markdown" }
  );
});

/* ─────────────────────── START ─────────────────────── */

bot.catch((err) => console.error("Bot error:", err));

bot.start({
  onStart: (me) => {
    console.log(`✅ @${me.username} is running`);
    if (ADMIN_IDS.length) console.log(`   Admins: ${ADMIN_IDS.join(", ")}`);
    else console.log(`   ⚠ ADMIN_IDS not set — /admin команда недоступна`);
  },
});
