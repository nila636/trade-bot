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
      lang        TEXT,
      first_seen  TIMESTAMPTZ DEFAULT NOW(),
      last_seen   TIMESTAMPTZ DEFAULT NOW(),
      actions     INT DEFAULT 0
    )
  `);
  // Если таблица уже была создана со старым DEFAULT 'ru' — убираем default,
  // чтобы новые юзеры получали NULL (триггерило показ селектора языка).
  await pool.query(`ALTER TABLE users ALTER COLUMN lang DROP DEFAULT`).catch(() => {});
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
  };

  let isNew = false;
  if (hasDb) {
    // Сначала узнаём новый ли это юзер (чтобы уведомить админа)
    const exists = await pool.query("SELECT 1 FROM users WHERE tg_id = $1", [data.tg_id]);
    isNew = exists.rowCount === 0;

    // При INSERT — lang остаётся NULL (юзер выберет язык сам).
    // При UPDATE — lang НЕ обновляем, чтобы сохранить выбор юзера.
    await pool.query(
      `INSERT INTO users (tg_id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tg_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         last_seen = NOW(),
         actions = users.actions + 1`,
      [data.tg_id, data.username, data.first_name, data.last_name]
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
    const tgLang = u.language_code || "—";
    const msg =
      `🆕 *Новый пользователь*\n\n` +
      `${name} (${tag})\n` +
      `🌐 Telegram lang: ${tgLang}\n` +
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

// Список поддерживаемых языков
const LANGS = ["en", "ru", "es", "pt", "tr", "vi", "id", "hi"];
const LANG_LABELS = {
  en: "🇬🇧 English",
  ru: "🇷🇺 Русский",
  es: "🇪🇸 Español",
  pt: "🇵🇹 Português",
  tr: "🇹🇷 Türkçe",
  vi: "🇻🇳 Tiếng Việt",
  id: "🇮🇩 Bahasa Indonesia",
  hi: "🇮🇳 हिन्दी",
};

const L = {
  en: {
    title: "📊 *TRADE BOT*",
    welcome:
      "Welcome to *TRADE BOT* — an AI-powered trading signals platform.\n\n" +
      "📈 *Algorithm accuracy:* up to 87%\n" +
      "⚡ *Real-time signals*\n" +
      "🔒 *Secure access*",
    choose: "Choose an action below:",
    btn_guide:    "📘 Guide",
    btn_reviews:  "⭐ Reviews",
    btn_support:  "💬 Support",
    btn_language: "🌐 Change language",
    btn_signal:   "🚀 Get signal 🚀",
    btn_back:     "⬅ Back",
    pick_lang_first: "🌐 *Please choose your language:*",
    lang_set: "✅ Language set",
    guide:
      "📘 *FULL USER GUIDE*\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*🔓 HOW TO GET ACCESS*\n\n" +
      "*Step 1.* Subscribe to our channel — we post updates and important news there.\n\n" +
      "*Step 2.* Tap the «🚀 Get signal» button.\n\n" +
      "*Step 3.* Register on *Pocket Option* using our partner link inside the app. This is required for free access.\n\n" +
      "*Step 4.* Access will be granted automatically once you register (usually within a minute).\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*📱 APP SECTIONS*\n\n" +
      "📊 *Assets* — 121 instruments with real-time prices.\n\n" +
      "✨ *Analyze market* — AI gives a signal using RSI + MACD + Bollinger Bands.\n\n" +
      "🧮 *Calculator* — estimate profit and risk.\n\n" +
      "📰 *News* — weekly economic events.\n\n" +
      "⭐ *Favorites* — save assets for quick access.\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*💡 HOW TO READ A SIGNAL*\n\n" +
      "• *⬆ UP (BUY)* — price is expected to rise\n" +
      "• *⬇ DOWN (SELL)* — price is expected to fall\n" +
      "• *Probability* — algorithm's confidence\n" +
      "• *Expiration* — check the result after X seconds/minutes\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "⚠️ *Important:* trading involves risk of capital loss. Signals are for informational purposes only.\n\n" +
      "💬 Need help? Use the *Support* button.",
  },
  ru: {
    title: "📊 *TRADE BOT*",
    welcome:
      "Добро пожаловать в *TRADE BOT* — систему торговых сигналов на базе ИИ.\n\n" +
      "📈 *Точность алгоритма:* до 87%\n" +
      "⚡ *Сигналы в режиме реального времени*\n" +
      "🔒 *Защищённый доступ*",
    choose: "Выберите действие ниже:",
    btn_guide:    "📘 Инструкция",
    btn_reviews:  "⭐ Отзывы",
    btn_support:  "💬 Поддержка",
    btn_language: "🌐 Сменить язык",
    btn_signal:   "🚀 Получить сигнал 🚀",
    btn_back:     "⬅ Назад",
    pick_lang_first: "🌐 *Пожалуйста, выберите язык:*",
    lang_set: "✅ Язык установлен",
    guide:
      "📘 *ПОЛНОЕ РУКОВОДСТВО*\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*🔓 КАК ПОЛУЧИТЬ ДОСТУП*\n\n" +
      "*Шаг 1.* Подпишись на наш канал.\n\n" +
      "*Шаг 2.* Нажми «🚀 Получить сигнал».\n\n" +
      "*Шаг 3.* Зарегистрируйся на *Pocket Option* по нашей партнёрской ссылке.\n\n" +
      "*Шаг 4.* Доступ откроется автоматически (в течение минуты).\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*📱 РАЗДЕЛЫ ПРИЛОЖЕНИЯ*\n\n" +
      "📊 *Активы* — 121 инструмент с реальными ценами.\n\n" +
      "✨ *Анализировать рынок* — ИИ даёт сигнал по RSI + MACD + Bollinger.\n\n" +
      "🧮 *Калькулятор* — расчёт прибыли и риска.\n\n" +
      "📰 *Новости* — экономические события недели.\n\n" +
      "⭐ *Избранное* — сохрани активы для быстрого доступа.\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*💡 КАК ЧИТАТЬ СИГНАЛ*\n\n" +
      "• *⬆ ВВЕРХ (BUY)* — рост цены\n" +
      "• *⬇ ВНИЗ (SELL)* — падение цены\n" +
      "• *Вероятность* — уверенность алгоритма\n" +
      "• *Экспирация* — через сколько проверить результат\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "⚠️ *Важно:* торговля сопряжена с риском. Сигналы носят информационный характер.\n\n" +
      "💬 Нужна помощь? Жми *Поддержка*.",
  },
  es: {
    title: "📊 *TRADE BOT*",
    welcome:
      "Bienvenido a *TRADE BOT* — una plataforma de señales de trading con IA.\n\n" +
      "📈 *Precisión del algoritmo:* hasta 87%\n" +
      "⚡ *Señales en tiempo real*\n" +
      "🔒 *Acceso seguro*",
    choose: "Elige una acción a continuación:",
    btn_guide:    "📘 Guía",
    btn_reviews:  "⭐ Reseñas",
    btn_support:  "💬 Soporte",
    btn_language: "🌐 Cambiar idioma",
    btn_signal:   "🚀 Obtener señal 🚀",
    btn_back:     "⬅ Atrás",
    pick_lang_first: "🌐 *Por favor, elige tu idioma:*",
    lang_set: "✅ Idioma establecido",
    guide:
      "📘 *GUÍA COMPLETA*\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*🔓 CÓMO OBTENER ACCESO*\n\n" +
      "*Paso 1.* Suscríbete a nuestro canal.\n\n" +
      "*Paso 2.* Toca «🚀 Obtener señal».\n\n" +
      "*Paso 3.* Regístrate en *Pocket Option* usando nuestro enlace de afiliado.\n\n" +
      "*Paso 4.* El acceso se otorgará automáticamente (en un minuto).\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*📱 SECCIONES DE LA APP*\n\n" +
      "📊 *Activos* — 121 instrumentos con precios en tiempo real.\n\n" +
      "✨ *Analizar mercado* — IA da una señal usando RSI + MACD + Bollinger.\n\n" +
      "🧮 *Calculadora* — estima ganancia y riesgo.\n\n" +
      "📰 *Noticias* — eventos económicos semanales.\n\n" +
      "⭐ *Favoritos* — guarda activos para acceso rápido.\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*💡 CÓMO LEER UNA SEÑAL*\n\n" +
      "• *⬆ ARRIBA (BUY)* — se espera que el precio suba\n" +
      "• *⬇ ABAJO (SELL)* — se espera que el precio baje\n" +
      "• *Probabilidad* — confianza del algoritmo\n" +
      "• *Expiración* — verifica el resultado después\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "⚠️ *Importante:* el trading conlleva riesgo de pérdida. Las señales son informativas.\n\n" +
      "💬 ¿Necesitas ayuda? Usa *Soporte*.",
  },
  pt: {
    title: "📊 *TRADE BOT*",
    welcome:
      "Bem-vindo ao *TRADE BOT* — uma plataforma de sinais de trading com IA.\n\n" +
      "📈 *Precisão do algoritmo:* até 87%\n" +
      "⚡ *Sinais em tempo real*\n" +
      "🔒 *Acesso seguro*",
    choose: "Escolha uma ação abaixo:",
    btn_guide:    "📘 Guia",
    btn_reviews:  "⭐ Avaliações",
    btn_support:  "💬 Suporte",
    btn_language: "🌐 Alterar idioma",
    btn_signal:   "🚀 Receber sinal 🚀",
    btn_back:     "⬅ Voltar",
    pick_lang_first: "🌐 *Por favor, escolha seu idioma:*",
    lang_set: "✅ Idioma definido",
    guide:
      "📘 *GUIA COMPLETO*\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*🔓 COMO OBTER ACESSO*\n\n" +
      "*Passo 1.* Inscreva-se no nosso canal.\n\n" +
      "*Passo 2.* Toque em «🚀 Receber sinal».\n\n" +
      "*Passo 3.* Cadastre-se na *Pocket Option* usando nosso link de afiliado.\n\n" +
      "*Passo 4.* O acesso será concedido automaticamente (em um minuto).\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*📱 SEÇÕES DO APP*\n\n" +
      "📊 *Ativos* — 121 instrumentos com preços em tempo real.\n\n" +
      "✨ *Analisar mercado* — IA dá um sinal usando RSI + MACD + Bollinger.\n\n" +
      "🧮 *Calculadora* — estime lucro e risco.\n\n" +
      "📰 *Notícias* — eventos econômicos semanais.\n\n" +
      "⭐ *Favoritos* — salve ativos para acesso rápido.\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*💡 COMO LER UM SINAL*\n\n" +
      "• *⬆ ALTA (BUY)* — espera-se subida do preço\n" +
      "• *⬇ BAIXA (SELL)* — espera-se queda do preço\n" +
      "• *Probabilidade* — confiança do algoritmo\n" +
      "• *Expiração* — verifique o resultado depois\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "⚠️ *Importante:* trading envolve risco de perda. Os sinais são informativos.\n\n" +
      "💬 Precisa de ajuda? Use *Suporte*.",
  },
  tr: {
    title: "📊 *TRADE BOT*",
    welcome:
      "*TRADE BOT*'a hoş geldiniz — yapay zeka destekli alım satım sinyalleri platformu.\n\n" +
      "📈 *Algoritma doğruluğu:* %87'ye kadar\n" +
      "⚡ *Gerçek zamanlı sinyaller*\n" +
      "🔒 *Güvenli erişim*",
    choose: "Aşağıdan bir işlem seçin:",
    btn_guide:    "📘 Kılavuz",
    btn_reviews:  "⭐ Yorumlar",
    btn_support:  "💬 Destek",
    btn_language: "🌐 Dili değiştir",
    btn_signal:   "🚀 Sinyal al 🚀",
    btn_back:     "⬅ Geri",
    pick_lang_first: "🌐 *Lütfen dilinizi seçin:*",
    lang_set: "✅ Dil ayarlandı",
    guide:
      "📘 *KAPSAMLI KILAVUZ*\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*🔓 ERİŞİM NASIL ALINIR*\n\n" +
      "*Adım 1.* Kanalımıza abone olun.\n\n" +
      "*Adım 2.* «🚀 Sinyal al» düğmesine dokunun.\n\n" +
      "*Adım 3.* Ortak bağlantımızı kullanarak *Pocket Option*'a kaydolun.\n\n" +
      "*Adım 4.* Erişim otomatik olarak verilecek (bir dakika içinde).\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*📱 UYGULAMA BÖLÜMLERİ*\n\n" +
      "📊 *Varlıklar* — gerçek zamanlı fiyatlarla 121 araç.\n\n" +
      "✨ *Piyasayı analiz et* — yapay zeka RSI + MACD + Bollinger ile sinyal verir.\n\n" +
      "🧮 *Hesaplayıcı* — kâr ve riski tahmin et.\n\n" +
      "📰 *Haberler* — haftalık ekonomik olaylar.\n\n" +
      "⭐ *Favoriler* — varlıkları hızlı erişim için kaydet.\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*💡 SİNYAL NASIL OKUNUR*\n\n" +
      "• *⬆ YUKARI (BUY)* — fiyatın yükselmesi bekleniyor\n" +
      "• *⬇ AŞAĞI (SELL)* — fiyatın düşmesi bekleniyor\n" +
      "• *Olasılık* — algoritmanın güveni\n" +
      "• *Vade* — sonucu sonra kontrol et\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "⚠️ *Önemli:* alım satım sermaye kaybı riski içerir. Sinyaller bilgi amaçlıdır.\n\n" +
      "💬 Yardım gerekli mi? *Destek* düğmesini kullan.",
  },
  vi: {
    title: "📊 *TRADE BOT*",
    welcome:
      "Chào mừng đến với *TRADE BOT* — nền tảng tín hiệu giao dịch dùng AI.\n\n" +
      "📈 *Độ chính xác:* lên đến 87%\n" +
      "⚡ *Tín hiệu thời gian thực*\n" +
      "🔒 *Truy cập bảo mật*",
    choose: "Chọn một hành động bên dưới:",
    btn_guide:    "📘 Hướng dẫn",
    btn_reviews:  "⭐ Đánh giá",
    btn_support:  "💬 Hỗ trợ",
    btn_language: "🌐 Đổi ngôn ngữ",
    btn_signal:   "🚀 Nhận tín hiệu 🚀",
    btn_back:     "⬅ Quay lại",
    pick_lang_first: "🌐 *Vui lòng chọn ngôn ngữ:*",
    lang_set: "✅ Đã đặt ngôn ngữ",
    guide:
      "📘 *HƯỚNG DẪN ĐẦY ĐỦ*\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*🔓 CÁCH NHẬN QUYỀN TRUY CẬP*\n\n" +
      "*Bước 1.* Đăng ký kênh của chúng tôi.\n\n" +
      "*Bước 2.* Nhấn nút «🚀 Nhận tín hiệu».\n\n" +
      "*Bước 3.* Đăng ký trên *Pocket Option* bằng liên kết đối tác của chúng tôi.\n\n" +
      "*Bước 4.* Quyền truy cập sẽ được cấp tự động (trong vòng một phút).\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*📱 CÁC PHẦN ỨNG DỤNG*\n\n" +
      "📊 *Tài sản* — 121 công cụ với giá thời gian thực.\n\n" +
      "✨ *Phân tích thị trường* — AI đưa tín hiệu dùng RSI + MACD + Bollinger.\n\n" +
      "🧮 *Máy tính* — ước tính lợi nhuận và rủi ro.\n\n" +
      "📰 *Tin tức* — sự kiện kinh tế hàng tuần.\n\n" +
      "⭐ *Yêu thích* — lưu tài sản để truy cập nhanh.\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*💡 CÁCH ĐỌC TÍN HIỆU*\n\n" +
      "• *⬆ LÊN (BUY)* — giá dự kiến tăng\n" +
      "• *⬇ XUỐNG (SELL)* — giá dự kiến giảm\n" +
      "• *Xác suất* — độ tin cậy của thuật toán\n" +
      "• *Hết hạn* — kiểm tra kết quả sau\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "⚠️ *Quan trọng:* giao dịch có rủi ro mất vốn. Tín hiệu chỉ mang tính tham khảo.\n\n" +
      "💬 Cần giúp? Dùng *Hỗ trợ*.",
  },
  id: {
    title: "📊 *TRADE BOT*",
    welcome:
      "Selamat datang di *TRADE BOT* — platform sinyal trading bertenaga AI.\n\n" +
      "📈 *Akurasi algoritma:* hingga 87%\n" +
      "⚡ *Sinyal real-time*\n" +
      "🔒 *Akses aman*",
    choose: "Pilih tindakan di bawah ini:",
    btn_guide:    "📘 Panduan",
    btn_reviews:  "⭐ Ulasan",
    btn_support:  "💬 Dukungan",
    btn_language: "🌐 Ubah bahasa",
    btn_signal:   "🚀 Dapatkan sinyal 🚀",
    btn_back:     "⬅ Kembali",
    pick_lang_first: "🌐 *Silakan pilih bahasa Anda:*",
    lang_set: "✅ Bahasa disetel",
    guide:
      "📘 *PANDUAN LENGKAP*\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*🔓 CARA MENDAPATKAN AKSES*\n\n" +
      "*Langkah 1.* Berlangganan saluran kami.\n\n" +
      "*Langkah 2.* Ketuk tombol «🚀 Dapatkan sinyal».\n\n" +
      "*Langkah 3.* Daftar di *Pocket Option* menggunakan tautan afiliasi kami.\n\n" +
      "*Langkah 4.* Akses diberikan otomatis (dalam satu menit).\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*📱 BAGIAN APLIKASI*\n\n" +
      "📊 *Aset* — 121 instrumen dengan harga real-time.\n\n" +
      "✨ *Analisis pasar* — AI memberikan sinyal pakai RSI + MACD + Bollinger.\n\n" +
      "🧮 *Kalkulator* — perkirakan untung dan risiko.\n\n" +
      "📰 *Berita* — peristiwa ekonomi mingguan.\n\n" +
      "⭐ *Favorit* — simpan aset untuk akses cepat.\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*💡 CARA MEMBACA SINYAL*\n\n" +
      "• *⬆ NAIK (BUY)* — harga diperkirakan naik\n" +
      "• *⬇ TURUN (SELL)* — harga diperkirakan turun\n" +
      "• *Probabilitas* — keyakinan algoritma\n" +
      "• *Kedaluwarsa* — periksa hasil setelahnya\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "⚠️ *Penting:* trading berisiko kehilangan modal. Sinyal hanya untuk informasi.\n\n" +
      "💬 Butuh bantuan? Gunakan *Dukungan*.",
  },
  hi: {
    title: "📊 *TRADE BOT*",
    welcome:
      "*TRADE BOT* में आपका स्वागत है — एआई-संचालित ट्रेडिंग सिग्नल प्लेटफ़ॉर्म।\n\n" +
      "📈 *एल्गोरिदम सटीकता:* 87% तक\n" +
      "⚡ *रीयल-टाइम सिग्नल*\n" +
      "🔒 *सुरक्षित पहुँच*",
    choose: "नीचे एक क्रिया चुनें:",
    btn_guide:    "📘 गाइड",
    btn_reviews:  "⭐ समीक्षाएँ",
    btn_support:  "💬 सहायता",
    btn_language: "🌐 भाषा बदलें",
    btn_signal:   "🚀 सिग्नल पाएँ 🚀",
    btn_back:     "⬅ वापस",
    pick_lang_first: "🌐 *कृपया अपनी भाषा चुनें:*",
    lang_set: "✅ भाषा सेट",
    guide:
      "📘 *पूर्ण उपयोगकर्ता गाइड*\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*🔓 पहुँच कैसे प्राप्त करें*\n\n" +
      "*चरण 1.* हमारे चैनल को सब्सक्राइब करें।\n\n" +
      "*चरण 2.* «🚀 सिग्नल पाएँ» बटन दबाएँ।\n\n" +
      "*चरण 3.* हमारे साथी लिंक से *Pocket Option* पर रजिस्टर करें।\n\n" +
      "*चरण 4.* पहुँच स्वचालित रूप से दी जाएगी (एक मिनट में)।\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*📱 ऐप अनुभाग*\n\n" +
      "📊 *एसेट्स* — रीयल-टाइम कीमतों के साथ 121 इंस्ट्रुमेंट।\n\n" +
      "✨ *बाज़ार विश्लेषण* — एआई RSI + MACD + Bollinger का उपयोग करके सिग्नल देता है।\n\n" +
      "🧮 *कैलकुलेटर* — लाभ और जोखिम का अनुमान।\n\n" +
      "📰 *समाचार* — साप्ताहिक आर्थिक घटनाएँ।\n\n" +
      "⭐ *पसंदीदा* — त्वरित पहुँच के लिए एसेट्स सहेजें।\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "*💡 सिग्नल कैसे पढ़ें*\n\n" +
      "• *⬆ ऊपर (BUY)* — कीमत बढ़ने की उम्मीद\n" +
      "• *⬇ नीचे (SELL)* — कीमत गिरने की उम्मीद\n" +
      "• *संभावना* — एल्गोरिदम का विश्वास\n" +
      "• *समाप्ति* — बाद में परिणाम देखें\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "⚠️ *महत्वपूर्ण:* ट्रेडिंग में पूँजी हानि का जोखिम है। सिग्नल केवल जानकारी के लिए हैं।\n\n" +
      "💬 मदद चाहिए? *सहायता* का उपयोग करें।",
  },
};

// Кеш язык в памяти (на сессию). При первой загрузке/новом юзере — читаем из БД.
const userLang = new Map();

async function getLang(id) {
  // Сначала из памяти — быстро
  if (userLang.has(id)) return userLang.get(id);
  // Иначе из БД
  if (hasDb) {
    try {
      const r = await pool.query("SELECT lang FROM users WHERE tg_id = $1", [id]);
      const code = r.rows[0]?.lang;
      if (code && LANGS.includes(code)) {
        userLang.set(id, code);
        return code;
      }
    } catch (e) { /* ignore */ }
  }
  // Иначе нет языка — вернём null (вызывающая сторона покажет селектор)
  return null;
}

async function setLang(id, code) {
  if (!LANGS.includes(code)) code = "en";
  userLang.set(id, code);
  if (hasDb) {
    await pool.query("UPDATE users SET lang = $1 WHERE tg_id = $2", [code, id]).catch(() => {});
  }
}

// Безопасная версия — никогда не возвращает null. Для случаев когда язык точно нужен.
async function getLangOrEn(id) {
  const l = await getLang(id);
  return l || "en";
}

/* ─────────────────────── KEYBOARDS ─────────────────────── */

function mainKeyboard(lang) {
  const T = L[lang] || L.en;
  return new InlineKeyboard()
    .text(T.btn_guide,    "guide")
    .text(T.btn_reviews,  "reviews").row()
    .text(T.btn_support,  "support")
    .text(T.btn_language, "language").row()
    .webApp(T.btn_signal, WEBAPP_URL);
}

function langKeyboard() {
  // 8 языков, по 2 в ряду
  const kb = new InlineKeyboard();
  const codes = ["en", "ru", "es", "pt", "tr", "vi", "id", "hi"];
  for (let i = 0; i < codes.length; i += 2) {
    kb.text(LANG_LABELS[codes[i]],     `setlang_${codes[i]}`);
    if (codes[i + 1]) kb.text(LANG_LABELS[codes[i + 1]], `setlang_${codes[i + 1]}`);
    kb.row();
  }
  return kb;
}

function langOnlyKeyboard() {
  // Без кнопки «назад» — для первого запуска (юзер ещё не выбрал язык)
  return langKeyboard();
}

function langWithBackKeyboard() {
  // С кнопкой «назад» — для повторного открытия из меню
  const kb = langKeyboard();
  kb.text("⬅ Back / Назад", "back_main");
  return kb;
}

function backKeyboard(lang) {
  const T = L[lang] || L.en;
  return new InlineKeyboard().text(T.btn_back, "back_main");
}

/* ─────────────────────── MIDDLEWARE: трекинг каждого действия ─────────────────────── */

bot.use(async (ctx, next) => {
  await trackUser(ctx).catch(e => console.error("trackUser:", e));
  return next();
});

/* ─────────────────────── USER HANDLERS ─────────────────────── */

async function showWelcome(ctx, lang) {
  const T = L[lang] || L.en;
  const caption = `${T.title}\n\n${T.welcome}\n\n${T.choose}`;
  const opts = { parse_mode: "Markdown", reply_markup: mainKeyboard(lang) };
  if (WELCOME_IMAGE) {
    await ctx.replyWithPhoto(WELCOME_IMAGE, { caption, ...opts });
  } else {
    await ctx.reply(caption, opts);
  }
}

bot.command("start", async (ctx) => {
  const lang = await getLang(ctx.from.id);
  if (!lang) {
    // Первый запуск — показываем селектор языка БЕЗ кнопки назад
    await ctx.reply(
      "🌐 *Please choose your language / Пожалуйста, выберите язык:*",
      { parse_mode: "Markdown", reply_markup: langOnlyKeyboard() }
    );
    return;
  }
  await showWelcome(ctx, lang);
});

bot.callbackQuery("guide", async (ctx) => {
  const lang = await getLangOrEn(ctx.from.id);
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
  await ctx.answerCallbackQuery();
  // Из меню — с кнопкой назад
  await ctx.editMessageReplyMarkup({ reply_markup: langWithBackKeyboard() }).catch(async () => {
    await ctx.reply(
      "🌐 *Choose your language / Выберите язык:*",
      { parse_mode: "Markdown", reply_markup: langWithBackKeyboard() }
    );
  });
});

bot.callbackQuery(/^setlang_([a-z]{2})$/, async (ctx) => {
  const code = ctx.match[1];
  if (!LANGS.includes(code)) {
    return ctx.answerCallbackQuery({ text: "Unknown language", show_alert: true });
  }
  await setLang(ctx.from.id, code);
  const T = L[code];
  await ctx.answerCallbackQuery({ text: T.lang_set });
  // Показываем приветствие на новом языке
  // Сначала пытаемся обновить caption у текущего сообщения, если не вышло — отправляем новое
  const caption = `${T.title}\n\n${T.welcome}\n\n${T.choose}`;
  try {
    await ctx.editMessageCaption({ caption, parse_mode: "Markdown", reply_markup: mainKeyboard(code) });
  } catch {
    try {
      await ctx.editMessageText(caption, { parse_mode: "Markdown", reply_markup: mainKeyboard(code) });
    } catch {
      await showWelcome(ctx, code);
    }
  }
});

bot.callbackQuery("back_main", async (ctx) => {
  const lang = await getLangOrEn(ctx.from.id);
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
