/**
 * TRADE BOT — Telegram Bot
 * ────────────────────────
 * grammY-бот с приветственным сообщением и 5 кнопками:
 *   📘 Инструкция     — показывает инструкцию
 *   ⭐ Отзывы         — ссылка на канал отзывов
 *   💬 Поддержка      — ссылка на саппорт
 *   🌐 Сменить язык   — переключает RU/EN и обновляет сообщение
 *   🚀 Получить сигнал — открывает Mini App (WebApp)
 *
 * Запуск:
 *   1. npm init -y
 *   2. npm install grammy dotenv
 *   3. Создай .env рядом:
 *        BOT_TOKEN=1234:ABC...          (получить у @BotFather)
 *        WEBAPP_URL=https://your.app    (HTTPS обязательно)
 *        SUPPORT_URL=https://t.me/your_support
 *        REVIEWS_URL=https://t.me/your_reviews
 *        WELCOME_IMAGE=https://.../trade_bot_banner.jpg   (опционально)
 *   4. В @BotFather → /mybots → Bot Settings → Menu Button → Configure menu button
 *      и добавь тот же WEBAPP_URL, чтобы кнопка запуска приложения была и в меню.
 *   5. node bot.js
 */

import { Bot, InlineKeyboard, InputFile } from "grammy";
import "dotenv/config";

const BOT_TOKEN     = process.env.BOT_TOKEN;
const WEBAPP_URL    = process.env.WEBAPP_URL    || "https://example.com";
const SUPPORT_URL   = process.env.SUPPORT_URL   || "https://t.me/your_support";
const REVIEWS_URL   = process.env.REVIEWS_URL   || "https://t.me/your_reviews";
const WELCOME_IMAGE = process.env.WELCOME_IMAGE; // null → шлём без картинки

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is not set");

const bot = new Bot(BOT_TOKEN);

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
      "2️⃣ Выбери интересующий актив в разделе *Активы*.\n" +
      "3️⃣ Тапни по активу — алгоритм выдаст направление *ВВЕРХ* или *ШОРТ* с вероятностью.\n" +
      "4️⃣ Используй встроенный *Калькулятор* для контроля риска.\n" +
      "5️⃣ Следи за *Новостями* — важные релизы отмечены красным.\n\n" +
      "⚠️ Торговля сопряжена с риском. Используй только средства, которые можешь позволить себе потерять.",
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
      "3️⃣ Tap the asset — the algorithm returns *UP* or *SHORT* with probability.\n" +
      "4️⃣ Use the built-in *Calculator* for risk control.\n" +
      "5️⃣ Watch *News* — high-impact events are marked red.\n\n" +
      "⚠️ Trading involves risk. Only use funds you can afford to lose.",
    lang_prompt:  "Выберите язык / Choose language:",
    lang_set_ru:  "✅ Язык: Русский",
    lang_set_en:  "✅ Language: English",
  },
};

/* ─── Примитивное in-memory хранилище языка.
 *     В продакшене замени на Postgres / Redis.                */
const userLang = new Map();                     // tgId → "ru" | "en"
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
    .webApp(T.btn_signal, WEBAPP_URL);          //  ← сюда уезжает Mini App
}

function langKeyboard() {
  return new InlineKeyboard()
    .text("🇷🇺 Русский", "setlang_ru")
    .text("🇬🇧 English", "setlang_en").row()
    .text("⬅ Back / Назад", "back_main");
}

function backKeyboard(lang) {
  const T = L[lang];
  return new InlineKeyboard().text("⬅ " + (lang === "ru" ? "Назад" : "Back"), "back_main");
}

/* ─────────────────────── HANDLERS ─────────────────────── */

// /start — приветственное сообщение
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

// 📘 Инструкция
bot.callbackQuery("guide", async (ctx) => {
  const lang = getLang(ctx.from.id);
  await ctx.answerCallbackQuery();
  await ctx.reply(L[lang].guide, {
    parse_mode: "Markdown",
    reply_markup: backKeyboard(lang),
  });
});

// ⭐ Отзывы
bot.callbackQuery("reviews", async (ctx) => {
  await ctx.answerCallbackQuery({ url: REVIEWS_URL }).catch(() => {});
  await ctx.reply(REVIEWS_URL);
});

// 💬 Поддержка
bot.callbackQuery("support", async (ctx) => {
  await ctx.answerCallbackQuery({ url: SUPPORT_URL }).catch(() => {});
  await ctx.reply(SUPPORT_URL);
});

// 🌐 Сменить язык — показать выбор
bot.callbackQuery("language", async (ctx) => {
  const lang = getLang(ctx.from.id);
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: langKeyboard() }).catch(async () => {
    await ctx.reply(L[lang].lang_prompt, { reply_markup: langKeyboard() });
  });
});

// Установка языка
bot.callbackQuery(/^setlang_(ru|en)$/, async (ctx) => {
  const code = ctx.match[1];
  setLang(ctx.from.id, code);
  await ctx.answerCallbackQuery({
    text: code === "ru" ? L.ru.lang_set_ru : L.en.lang_set_en,
  });
  // перерисовываем главное меню на новом языке
  const T = L[code];
  const caption = `${T.title}\n\n${T.welcome}\n\n${T.choose}`;
  try {
    await ctx.editMessageCaption({
      caption, parse_mode: "Markdown",
      reply_markup: mainKeyboard(code),
    });
  } catch {
    await ctx.editMessageText(caption, {
      parse_mode: "Markdown",
      reply_markup: mainKeyboard(code),
    }).catch(async () => {
      await ctx.reply(caption, { parse_mode: "Markdown", reply_markup: mainKeyboard(code) });
    });
  }
});

// ⬅ Назад в главное меню
bot.callbackQuery("back_main", async (ctx) => {
  const lang = getLang(ctx.from.id);
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: mainKeyboard(lang) }).catch(async () => {
    const T = L[lang];
    await ctx.reply(`${T.title}\n\n${T.choose}`, {
      parse_mode: "Markdown",
      reply_markup: mainKeyboard(lang),
    });
  });
});

// Ошибки
bot.catch((err) => console.error("Bot error:", err));

// Запуск
bot.start({
  onStart: (me) => console.log(`✅ @${me.username} is running`),
});
