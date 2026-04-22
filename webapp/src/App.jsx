import React, { useState, useMemo, useEffect, useRef, createContext, useContext } from "react";
import {
  Search, Star, ChevronDown, Coins, Bitcoin, BarChart3, Fuel, LineChart, Heart,
  GraduationCap, BookOpen, Calculator as CalcIcon, Newspaper, Activity,
  Zap, Play, ChevronRight, Gauge, X, Sparkles, Check, SatelliteDish, RotateCcw, ArrowLeft
} from "lucide-react";

/* ────────────────────────── I18N ────────────────────────── */

const STR = {
  ru: {
    brand_top: "TRADE",
    brand_bottom: "BOT",
    status: "СТАНДАРТ",
    search: "Поиск актива...",
    lang_title: "Язык интерфейса",
    lang_ru: "Русский",
    lang_en: "English",

    blocks: {
      assets: { title: "АКТИВЫ",      sub: "112 инструментов" },
      edu:    { title: "ОБУЧЕНИЕ",    sub: "5 модулей + книги" },
      calc:   { title: "КАЛЬКУЛЯТОР", sub: "Мартингейл + риск" },
      news:   { title: "НОВОСТИ",     sub: "Календарь · 14 событий сегодня" },
      ind:    { title: "ИНДИКАТОРЫ",  sub: "6 классических" },
    },
    assets_count_suffix: "активов",
    cats: {
      fiat: "Валюты", otc: "Валюты OTC", crypto: "Криптовалюты",
      stocks: "Акции", comm: "Сырьевые товары", idx: "Индексы", fav: "Избранное",
    },
    cat_short: {
      fiat: "💵 Валюты", otc: "💵 OTC", crypto: "₿ Крипта",
      stocks: "📊 Акции", comm: "🛢 Сырьё", idx: "📈 Индексы", fav: "⭐ Избранное",
    },

    edu_tabs: { basics: "Основа трейдинга", books: "Книги" },
    edu: [
      {
        title: "Что такое трейдинг",
        desc: "Базовые концепции, как работает рынок и кто на нём зарабатывает.",
        body: `Трейдинг — это деятельность, при которой участник рынка покупает и продаёт финансовые активы (валюты, акции, криптовалюты, сырьё, индексы), зарабатывая на изменении их цены. В отличие от инвестиций, где капитал размещается на годы, трейдер держит позицию от нескольких секунд до нескольких недель и зарабатывает именно на колебаниях котировок.

Рынок работает по простому принципу спроса и предложения. Когда покупателей больше — цена растёт, когда продавцов больше — падает. Задача трейдера — предугадать направление движения и вовремя открыть позицию: «в лонг» при ожидании роста и «в шорт» при ожидании падения.

Основные виды трейдинга различаются по времени удержания позиции. Скальпинг — десятки сделок в день по несколько секунд каждая. Интрадей — сделки в рамках одного дня. Свинг-трейдинг — позиции на 2–7 дней. Позиционный трейдинг ближе к инвестициям и длится неделями и месяцами.

Работа трейдера строится на трёх опорах: анализе рынка, управлении риском и психологической дисциплине. Без любого из трёх результат будет случайным, даже если временами прибыльным.

Для старта потребуется брокерский счёт у регулируемой компании, капитал, который не жалко потерять (начинать лучше с демо-счёта), торговая платформа и, главное, торговая стратегия — свод правил, по которым принимаются решения. Стратегия снимает с трейдера эмоции: он не думает «купить или продать?», он выполняет правила.

Важно понимать: большинство новичков теряют деньги в первые месяцы не из-за сложного рынка, а из-за отсутствия плана. Поэтому первый этап — не погоня за прибылью, а обучение и практика на демо-счёте. Профессиональный трейдер отличается от любителя не количеством сделок, а дисциплиной, системным подходом и готовностью принимать убыточные сделки как часть процесса.

Трейдинг — это не способ быстро разбогатеть. Это профессия, требующая нескольких лет обучения и тысяч часов практики.`
      },
      {
        title: "Риск-менеджмент",
        desc: "Правила контроля потерь — главное, что отличает трейдера от игрока.",
        body: `Риск-менеджмент — главное, что отличает трейдера от игрока в казино. Статистика безжалостна: 70–80% начинающих трейдеров теряют депозит в первый год, и почти всегда причина одна — отсутствие контроля над риском.

Базовое правило — «правило 1–2%». На одной сделке трейдер не должен рисковать больше чем 1–2% от размера депозита. При депозите 1000 долларов максимальный убыток по сделке — 10–20 долларов. Это означает: даже 10 подряд неудачных сделок не сольют счёт, а лишь уменьшат его на 10–20%. Восстановиться после такой просадки реально, после потери 50% — почти невозможно: чтобы вернуться на исходный уровень, нужно сделать +100%.

Второй инструмент — стоп-лосс. Это заранее установленная цена, при достижении которой позиция автоматически закрывается с убытком. Без стоп-лосса одна неудачная сделка может уничтожить счёт. Ставить стоп нужно до открытия позиции, а не «когда увижу, что пошло не туда». В последнем случае включаются эмоции: надежда, что цена вернётся, удержание убыточной позиции «ещё немного» — и вот уже минус 30% вместо запланированных 1%.

Третье — соотношение риск/прибыль. Правильная сделка — та, где потенциальная прибыль минимум в 2 раза больше возможного убытка. Соотношение 1:3 ещё лучше. При соотношении 1:2 достаточно угадывать направление в 40% случаев, чтобы оставаться в плюсе. Без контроля этого соотношения даже 70% побед не спасут: один большой убыток перечеркнёт несколько прибыльных сделок.

Четвёртое — ограничение дневных потерь. Если за день трейдер потерял, например, 4% депозита — он закрывает терминал до следующего дня. Это защищает от главного врага — тильта, состояния, когда после нескольких убытков трейдер начинает отыгрываться, увеличивая объёмы и теряя контроль.

Самое важное: риск-менеджмент работает только при строгом соблюдении. Правила, от которых можно отступать «в особых случаях», не работают никогда.`
      },
      {
        title: "Базовые основы анализа",
        desc: "Теханализ: уровни, тренды, объёмы, поддержка и сопротивление.",
        body: `Анализ рынка делится на два больших направления: фундаментальный и технический. Фундаментальный изучает новости, экономические показатели, отчёты компаний — всё, что влияет на «справедливую» стоимость актива. Технический анализ игнорирует причины движения и изучает только график цены, исходя из принципа «рынок учитывает всё».

Основа технического анализа — тренд. Рынок двигается в трёх направлениях: вверх (восходящий тренд), вниз (нисходящий) и в сторону (боковик, или флэт). Восходящий тренд — это последовательность всё более высоких максимумов и более высоких минимумов. Нисходящий — наоборот. Пока структура сохраняется, тренд действует. Первое правило трейдера: торгуй в направлении тренда, а не против него.

Второй ключевой инструмент — уровни поддержки и сопротивления. Поддержка — это цена, от которой актив неоднократно отскакивал вверх; сопротивление — уровень, от которого откатывался вниз. Эти уровни образуются потому, что большое количество участников рынка видит их и принимает решения именно там. Пробой уровня часто сигнализирует о смене тенденции: пробитое сопротивление обычно становится новой поддержкой.

Объём — третья важная составляющая. Это количество контрактов или лотов, которые перешли из рук в руки за период. Движение цены с высоким объёмом надёжнее: оно подтверждено реальным интересом участников. Движение без объёма — подозрительно, часто это ложный импульс.

Четвёртое понятие — таймфреймы. График можно смотреть на минутном, часовом, дневном, недельном интервале. Правило: направление торговли определяется на старшем таймфрейме, точка входа — на младшем. Сначала смотришь дневной график, чтобы понять общий тренд, потом на часовом ищешь момент для входа.

К инструментам добавляются индикаторы — математические формулы, применяемые к цене и объёму: скользящие средние, RSI, MACD, стохастик. Они не предсказывают будущее, а помогают видеть то, что уже заложено в цене, но визуально неочевидно. Нельзя вешать на график 10 индикаторов — они начнут противоречить друг другу. Достаточно 2–3, выбранных по назначению.

Технический анализ — не магия. Это структурированное чтение поведения толпы.`
      },
      {
        title: "Паттерны",
        desc: "Свечные формации: поглощение, пин-бар, три вороны и др.",
        body: `Паттерн — это повторяющаяся фигура на графике, которая с определённой вероятностью предсказывает дальнейшее движение цены. Паттерны работают потому, что человеческая психология на рынке повторяется: страх, жадность и надежда формируют одни и те же реакции у тысяч участников.

Паттерны делятся на две большие группы: свечные (на одной-двух-трёх свечах) и графические (формируются десятками свечей).

Свечные паттерны разворота. «Молот» — длинная нижняя тень и маленькое тело на минимуме нисходящего тренда — сигнал разворота вверх. «Падающая звезда» — зеркальная фигура на вершине восходящего тренда, сигнал к развороту вниз. «Поглощение» — большая свеча полностью накрывает телом предыдущую противоположного цвета: сильный сигнал смены направления. «Доджи» — свеча, у которой цены открытия и закрытия почти совпадают: сигнализирует о нерешительности рынка.

Свечные паттерны продолжения. «Три метода» (вверх или вниз): одна сильная свеча, затем три-четыре маленьких против тренда, затем снова сильная в направлении тренда. Тренд продолжается.

Графические паттерны разворота. «Голова и плечи» — три вершины, где средняя выше двух крайних. Классический сигнал окончания восходящего тренда. «Двойная вершина» — два последовательных максимума на одинаковом уровне, рынок не смог пробить выше. «Двойное дно» — зеркальный паттерн на минимуме, сигнал к развороту вверх.

Графические паттерны продолжения. «Флаг» — небольшой противотрендовый канал после резкого импульса; после прорыва тренд продолжается. «Треугольник» (симметричный, восходящий, нисходящий) — сужающийся диапазон цены; пробой даёт направление дальнейшего движения. «Клин» — похож на треугольник, но обе границы направлены в одну сторону.

Главное правило работы с паттернами: ни один из них не даёт 100% результата. Вероятность отработки колеблется в диапазоне 55–70%. Поэтому паттерн должен использоваться не сам по себе, а вместе с подтверждающими факторами: объёмом, уровнями поддержки/сопротивления, индикаторами, общим трендом на старшем таймфрейме.

Распознавать паттерны нужно тренированным глазом — первые сотни графиков будут видеться размытыми, это нормально.`
      },
      {
        title: "Психология трейдинга",
        desc: "12 модулей: от страха потерь до дисциплины профессионала.",
        body: `Технический анализ можно выучить за несколько месяцев. Психология трейдинга осваивается годами — и именно она отличает прибыльного трейдера от убыточного. Двое трейдеров с одной и той же стратегией получают разные результаты из-за разного психологического состояния.

Три главные эмоции управляют рынком: страх, жадность и надежда. Страх заставляет закрывать прибыльную позицию слишком рано («вдруг развернётся») и бояться открывать сделки после серии убытков. Жадность — двигать стоп-лосс дальше, когда рынок идёт против, и держать позицию после достижения цели, надеясь на большее. Надежда — самый опасный спутник: она удерживает в убыточной позиции, когда все сигналы говорят закрыть её.

Типичная ошибка новичка — отыгрываться после убытка. После двух-трёх потерь включается азарт: трейдер увеличивает объём, начинает игнорировать собственные правила, входит без сигнала. Это состояние называется тильт. В тильте сливаются депозиты. Единственное лекарство — встать из-за монитора и вернуться только на следующий день.

Второй враг — FOMO, страх упустить возможность. Актив резко вырос на 10% — новичок входит на максимуме, в момент, когда крупные игроки уже фиксируют прибыль. Через час позиция в минусе, начинается паника. Правило: если ты не попал во вход в начале движения — пропусти его, следующий всегда будет.

Третье — переторговка. Убеждение, что чем больше сделок, тем больше прибыли, ложно. На спокойном рынке лучшая стратегия — не торговать. Профессионал спокойно пропускает дни и недели, когда нет сетапа по его системе. Любитель ищет сделки постоянно, потому что ему скучно.

Инструменты борьбы с психологией — торговый журнал и чек-лист. Журнал фиксирует каждую сделку с обоснованием входа и эмоциями на момент решения. Через месяц анализ журнала покажет ваши слабые места. Чек-лист перед каждой сделкой заставляет проверять условия стратегии и не даёт войти «по интуиции».

И правило, которое нужно выучить первым: рынок не обязан возвращать ваши деньги. Убыточная сделка — норма, а не трагедия.`
      },
    ],
    books: [
      { title: "Воспоминания биржевого спекулянта",   author: "Эдвин Лефевр" },
      { title: "Технический анализ финансовых рынков", author: "Джон Мэрфи" },
      { title: "Трейдинг в зоне",                      author: "Марк Дуглас" },
      { title: "Японские свечи",                       author: "Стив Нисон" },
    ],

    news_cols: { time: "Время", prio: "Важ.", left: "Осталось", event: "Событие" },
    news_time_fmt: (h, m) => `${h}ч. ${m}м.`,

    calc: {
      deposit: "Депозит ($)", first_pct: "Первая сделка (%)", coef: "Коэффициент",
      steps: "Перекрытий", payout: "Выплата (%)",
      first_bet: "Первая ставка", total_risk: "Общий риск", risk_pct: "% от депо",
      col_step: "Шаг", col_bet: "Ставка", col_profit: "Прибыль",
      sim_title: "СИМУЛЯЦИЯ · 100 СДЕЛОК", winrate: "Винрейт (%)", run: "ЗАПУСТИТЬ",
      balance: "Баланс", wins: "Побед", blowups: "Слитых", recommendation: "РЕКОМЕНДАЦИЯ",
      rec_bad: (wr, n, safe, newSteps) =>
        `При винрейте ${wr}% твоя схема слила депозит ${n} раз(а). Снизь первую ставку до ≈${safe}% или уменьши перекрытия до ${newSteps}.`,
      rec_ok: (safe, dd) =>
        `Сетка выжила. Рекомендуемая безопасная первая ставка: ≈${safe}% от депозита. Макс. просадка: ${dd}%.`,
    },

    indicators: [
      { svgKey: "bollinger",  name: "Bollinger Bands", sub: "Линии Боллинджера", body: "Три линии вокруг средней — SMA±2σ. Сужение = волатильность падает, расширение = тренд начинается. Касание верхней в нисходящем канале — потенциальный вход в шорт." },
      { svgKey: "macd",       name: "MACD",            sub: "Moving Average Convergence Divergence", body: "Разница между быстрой и медленной EMA. Пересечение сигнальной линии снизу вверх = бычий сигнал, сверху вниз = медвежий. Дивергенция с ценой — ранний разворот." },
      { svgKey: "stochastic", name: "Stochastic",      sub: "Осциллятор Стохастика", body: "Два значения (%K и %D) в диапазоне 0–100. Выше 80 — перекупленность, ниже 20 — перепроданность. Работает лучше во флэте." },
      { svgKey: "adx",        name: "ADX",             sub: "Average Directional Index", body: "Сила тренда без учёта направления. ADX > 25 — тренд есть, < 20 — флэт. Используется вместе с +DI/−DI для направления." },
      { svgKey: "fractals",   name: "Fractals",        sub: "Фракталы Билла Вильямса",   body: "Пять свечей: центральная — локальный максимум/минимум. Используются для установки стопов и поиска точек входа в направлении тренда." },
      { svgKey: "rsi",        name: "RSI",             sub: "Relative Strength Index",   body: "Осциллятор 0–100. Выше 70 — перекупленность, ниже 30 — перепроданность. Дивергенция с ценой — сильный сигнал разворота." },
    ],

    analyze_market: "АНАЛИЗИРОВАТЬ РЫНОК",
    analyze_loading: "ЗАГРУЗКА АЛГОРИТМА...",
    scanning: "СКАНИРУЕМ РЫНОК...",
    analyzing_signal: "АНАЛИЗИРУЕМ СИГНАЛ...",
    analyzing_volatility: "АНАЛИЗ ТЕКУЩЕЙ ВОЛАТИЛЬНОСТИ...",
    finalizing: "ФИНАЛИЗАЦИЯ ПРОГНОЗА...",
    buy: "ПОКУПКА",
    sell: "ПРОДАЖА",
    market: "Рынок",
    time_label: "Время",
    valid_until: "Действителен до",
    retry: "Повторить",
    back: "Назад",
    tag_signal_ai: "СИГНАЛ ИИ",
    tag_signal: "СИГНАЛ",
    tag_edu: "ОБУЧЕНИЕ",
    tag_ind: "ИНДИКАТОР",
    tag_asset_analysis: "АНАЛИЗ АКТИВА",

    dir_up: "ВВЕРХ", dir_down: "ШОРТ",
    probability: "Вероятность", expiration: "Экспирация",
    entry: "Вход", target: "Цель",
    accept_signal: "ПРИНЯТЬ СИГНАЛ",
    processing: "Обработка данных ИИ-алгоритмом...",
    step_volatility: "› проверка волатильности",
    step_rsi: "› расчёт RSI + MACD",
    step_patterns: "› паттерны свечей",
    demo_note: "⚠ Демо-сигнал. В проде — результат ML-модели на исторических данных актива.",
    demo_note_market: "⚠ Демо-сигнал. В проде — результат ML-модели/API.",

    gate_loading: "Проверяем доступ...",
    gate_channel_title: "Подпишитесь на канал",
    gate_channel_desc: "Чтобы получить доступ к сигналам, подпишитесь на наш канал с аналитикой и анонсами.",
    gate_channel_btn: "📣 Открыть канал",
    gate_check_btn: "Я подписался, проверить",
    gate_broker_title: "Регистрация на Pocket Option",
    gate_broker_desc: "Для доступа к полному функционалу зарегистрируйтесь на Pocket Option по нашей ссылке и укажите ваш ID аккаунта ниже.",
    gate_broker_step1: "1. Зарегистрироваться на бирже",
    gate_broker_step2: "2. Найти свой UID в профиле",
    gate_broker_step3: "3. Ввести UID ниже",
    gate_broker_btn_register: "🏦 Открыть Pocket Option",
    gate_broker_uid_placeholder: "Ваш UID (цифры)",
    gate_broker_uid_hint: "UID обычно 6–8 цифр, можно найти в профиле Pocket Option",
    gate_broker_uid_hint_err: "UID должен содержать 4–15 цифр",
    gate_broker_submit: "Отправить заявку",
    gate_broker_submit_err: "Ошибка отправки. Проверьте подключение и попробуйте снова.",
    gate_broker_pending_title: "Заявка на рассмотрении",
    gate_broker_pending_desc: "Ваш UID отправлен на проверку. Обычно это занимает до 24 часов. Мы пришлём уведомление в Telegram.",
    gate_broker_rejected: "Заявка отклонена. Убедитесь, что вы зарегистрировались по нашей ссылке, и попробуйте снова.",
    gate_error: "Ошибка доступа",
    gate_retry: "Попробовать снова",
  },

  en: {
    brand_top: "TRADE",
    brand_bottom: "BOT",
    status: "STANDARD",
    search: "Search asset...",
    lang_title: "Interface language",
    lang_ru: "Русский",
    lang_en: "English",

    blocks: {
      assets: { title: "ASSETS",     sub: "112 instruments" },
      edu:    { title: "EDUCATION",  sub: "5 modules + books" },
      calc:   { title: "CALCULATOR", sub: "Martingale + risk" },
      news:   { title: "NEWS",       sub: "Calendar · 14 events today" },
      ind:    { title: "INDICATORS", sub: "6 classics" },
    },
    assets_count_suffix: "assets",
    cats: {
      fiat: "Currencies", otc: "OTC Currencies", crypto: "Crypto",
      stocks: "Stocks", comm: "Commodities", idx: "Indices", fav: "Favorites",
    },
    cat_short: {
      fiat: "💵 FX", otc: "💵 OTC", crypto: "₿ Crypto",
      stocks: "📊 Stocks", comm: "🛢 Commod.", idx: "📈 Indices", fav: "⭐ Favorites",
    },

    edu_tabs: { basics: "Trading Basics", books: "Books" },
    edu: [
      {
        title: "What is trading",
        desc: "Core concepts — how markets work and who actually profits.",
        body: `Trading is the activity of buying and selling financial assets (currencies, stocks, crypto, commodities, indices) to profit from price movement. Unlike investing, where capital sits for years, a trader holds positions from seconds to weeks and earns specifically from price fluctuations.

Markets work on a simple principle of supply and demand. When buyers outnumber sellers, price rises; when sellers dominate, it falls. The trader's job is to predict direction and time the entry: long when expecting a rise, short when expecting a fall.

Trading styles differ by holding time. Scalping — dozens of trades per day, each lasting seconds. Intraday — trades within one session. Swing trading — positions held 2–7 days. Position trading — closer to investing, weeks to months.

A trader's work rests on three pillars: market analysis, risk management, and psychological discipline. Missing any one of them turns results into chance, even if profitable for a while.

To start you'll need a brokerage account with a regulated firm, capital you can afford to lose (start on demo), a trading platform, and most importantly — a trading strategy: a set of rules that remove emotion from decisions. With a strategy you no longer ask "buy or sell?" — you execute rules.

Understand this: most beginners lose in the first months not because markets are complex, but because they have no plan. The first stage isn't chasing profit — it's learning and practice. A professional differs from an amateur not by trade count or position size, but by discipline, systematic approach, and acceptance that losing trades are part of the process.

Trading is not a get-rich-quick scheme. It is a profession requiring years of study and thousands of hours of practice.`
      },
      {
        title: "Risk management",
        desc: "Loss-control rules — the line between a trader and a gambler.",
        body: `Risk management is what separates a trader from a gambler. The statistics are brutal: 70–80% of beginners lose their deposit in the first year, and almost always the reason is the same — no risk control.

The base rule is the "1–2% rule". No single trade should risk more than 1–2% of the deposit. On a $1,000 account the max loss per trade is $10–20. Even 10 losing trades in a row won't blow the account — they'll reduce it by 10–20%. Recovering from such a drawdown is realistic; recovering from a 50% loss is almost impossible — you need +100% just to return to breakeven.

The second tool is the stop-loss. A pre-set price at which the position automatically closes. Without it, a single bad trade can destroy your account. Place the stop BEFORE entering the position, not "when I see it's going the wrong way." Otherwise emotion takes over: hope that price will return, holding "just a bit longer" — and suddenly you're down 30% instead of the planned 1%.

Third — risk/reward ratio. A proper trade is one where potential profit is at least twice the possible loss. 1:3 is even better. With a 1:2 ratio you only need to be right 40% of the time to stay profitable. Without controlling this ratio, even a 70% win rate won't save you — one big loss wipes out several winners.

Fourth — daily loss limits. If you've lost 4% of your deposit in a day, close the terminal until tomorrow. This protects from tilt — the state where after a few losses you try to "win it back", increase size, and lose control.

Most important: risk management only works when followed strictly. Rules you can break "in special cases" never work.`
      },
      {
        title: "Basics of analysis",
        desc: "Technical analysis: levels, trends, volumes, support & resistance.",
        body: `Market analysis splits into two schools: fundamental and technical. Fundamental studies news, economic data, and company reports — everything affecting an asset's "fair" value. Technical analysis ignores causes and studies only the price chart, operating on the principle "the market prices in everything".

The core of technical analysis is the trend. Markets move in three directions: up (uptrend), down (downtrend), and sideways (flat / ranging). An uptrend is a sequence of higher highs and higher lows. A downtrend — the opposite. While the structure holds, the trend is in effect. The first rule: trade with the trend, not against it.

The second key tool is support and resistance. Support is a price where the asset has repeatedly bounced up; resistance — a level where it has turned down. These form because many market participants see them and decide at exactly those points. A break often signals a trend change: broken resistance usually becomes new support.

Volume is the third component. It's the number of contracts traded in a period. Moves on high volume are more reliable — backed by real participant interest. Moves on low volume are suspicious, often a false impulse.

Fourth — timeframes. Charts come in minute, hourly, daily, weekly intervals. The rule: determine direction on the higher timeframe, find entries on the lower one. First check the daily to understand the trend, then zoom to the hourly for entry timing.

Indicators are added on top — mathematical formulas applied to price and volume: moving averages, RSI, MACD, stochastic. They don't predict the future; they help see what's already in price but visually unclear. Don't stack 10 indicators — they'll contradict each other. 2–3, chosen by purpose, are enough.

Technical analysis isn't magic. It's structured reading of crowd behavior.`
      },
      {
        title: "Patterns",
        desc: "Candlestick formations: engulfing, pin-bar, three crows and more.",
        body: `A pattern is a recurring figure on the chart that, with some probability, predicts future price movement. Patterns work because market psychology repeats: fear, greed, and hope produce the same reactions from thousands of participants.

Patterns split into two groups: candlestick (on 1–3 candles) and chart patterns (formed by dozens of candles).

Reversal candlestick patterns. The "Hammer" — long lower wick and small body at the bottom of a downtrend — signals a reversal up. The "Shooting Star" — the mirror shape at the top of an uptrend, signals reversal down. "Engulfing" — a big candle fully covering the previous one of opposite color: a strong reversal signal. "Doji" — a candle where open and close nearly match: signals market indecision.

Continuation candlestick patterns. "Three Methods" (up or down): one strong candle, then three or four small counter-trend candles, then another strong one with the trend. The trend continues.

Reversal chart patterns. "Head and Shoulders" — three tops where the middle is higher than the two sides. A classic end-of-uptrend signal. "Double Top" — two sequential highs at the same level; the market failed to break higher. "Double Bottom" — the mirror pattern at the bottom, signals reversal up.

Continuation chart patterns. "Flag" — a small counter-trend channel after a sharp impulse; after the breakout the trend continues. "Triangle" (symmetric, ascending, descending) — a contracting price range; the breakout gives direction. "Wedge" — similar to a triangle, but both boundaries lean the same way.

The main rule: no pattern is 100%. Win rates sit in the 55–70% range. A pattern must be used with confirming factors — volume, support/resistance levels, indicators, the higher-timeframe trend.

Pattern recognition requires a trained eye. The first hundred charts will look blurry — that's normal.`
      },
      {
        title: "Trading psychology",
        desc: "12 modules — from fear of loss to professional discipline.",
        body: `Technical analysis can be learned in a few months. Trading psychology takes years — and it's what separates profitable traders from losing ones. Two traders with the same strategy get different results because of different psychological states.

Three emotions drive markets: fear, greed, hope. Fear closes winning positions too early ("what if it reverses?") and blocks entries after a losing streak. Greed moves the stop further when price goes against you and holds positions past the target, hoping for more. Hope is the most dangerous — it keeps you in a losing position when every signal says to close.

A classic beginner mistake is trying to "win it back" after a loss. After two or three losses, gambling instinct kicks in: size up, ignore your own rules, enter without a signal. This state is called tilt. Tilt drains accounts. The only cure is to step away from the screen until tomorrow.

The second enemy is FOMO — fear of missing out. The asset jumps 10% — a beginner buys at the top, exactly when big players are taking profit. An hour later the position is red, panic sets in. Rule: if you missed the start of a move, skip it — another one will come.

Third — overtrading. The belief that more trades means more profit is false. On a quiet market the best strategy is not trading. Professionals calmly skip days and weeks without a setup. Amateurs search for trades constantly because they're bored.

Tools against psychology — a trading journal and a checklist. The journal records every trade with entry logic and emotional state. After a month it shows your weak spots. The checklist before every trade forces you to verify strategy conditions and prevents "gut" entries.

The rule to learn first: the market owes you nothing. A losing trade is normal, not a tragedy.`
      },
    ],
    books: [
      { title: "Reminiscences of a Stock Operator",      author: "Edwin Lefèvre" },
      { title: "Technical Analysis of Financial Markets", author: "John Murphy" },
      { title: "Trading in the Zone",                    author: "Mark Douglas" },
      { title: "Japanese Candlestick Charting",          author: "Steve Nison" },
    ],

    news_cols: { time: "Time", prio: "Imp.", left: "Left", event: "Event" },
    news_time_fmt: (h, m) => `${h}h ${m}m`,

    calc: {
      deposit: "Deposit ($)", first_pct: "First trade (%)", coef: "Coefficient",
      steps: "Overlaps", payout: "Payout (%)",
      first_bet: "First bet", total_risk: "Total risk", risk_pct: "% of deposit",
      col_step: "Step", col_bet: "Bet", col_profit: "Profit",
      sim_title: "SIMULATION · 100 TRADES", winrate: "Winrate (%)", run: "RUN",
      balance: "Balance", wins: "Wins", blowups: "Blowups", recommendation: "RECOMMENDATION",
      rec_bad: (wr, n, safe, newSteps) =>
        `At ${wr}% winrate your setup blew the deposit ${n} time(s). Lower the first bet to ≈${safe}% or reduce overlaps to ${newSteps}.`,
      rec_ok: (safe, dd) =>
        `The grid survived. Recommended safe first bet: ≈${safe}% of deposit. Max drawdown: ${dd}%.`,
    },

    indicators: [
      { svgKey: "bollinger",  name: "Bollinger Bands", sub: "Volatility envelope", body: "Three lines around the mean — SMA±2σ. Narrowing = volatility dropping, expansion = trend starting. A touch of the upper band in a downtrend is a potential short entry." },
      { svgKey: "macd",       name: "MACD",            sub: "Moving Average Convergence Divergence", body: "Difference between fast and slow EMA. Crossing the signal line upward = bullish, downward = bearish. Divergence with price is an early reversal cue." },
      { svgKey: "stochastic", name: "Stochastic",      sub: "Stochastic Oscillator", body: "Two values (%K and %D) in the 0–100 range. Above 80 = overbought, below 20 = oversold. Works best in ranging markets." },
      { svgKey: "adx",        name: "ADX",             sub: "Average Directional Index", body: "Trend strength regardless of direction. ADX > 25 means a trend is present, < 20 means flat. Pair with +DI/−DI for direction." },
      { svgKey: "fractals",   name: "Fractals",        sub: "Bill Williams' Fractals",   body: "Five candles with the middle one being a local high/low. Used to place stops and find entries in the direction of the trend." },
      { svgKey: "rsi",        name: "RSI",             sub: "Relative Strength Index",   body: "0–100 oscillator. Above 70 = overbought, below 30 = oversold. Divergence with price is a strong reversal signal." },
    ],

    analyze_market: "ANALYZE MARKET",
    analyze_loading: "RUNNING ALGORITHM...",
    scanning: "SCANNING MARKET...",
    analyzing_signal: "ANALYZING SIGNAL...",
    analyzing_volatility: "ANALYZING CURRENT VOLATILITY...",
    finalizing: "FINALIZING FORECAST...",
    buy: "BUY",
    sell: "SELL",
    market: "Market",
    time_label: "Time",
    valid_until: "Valid until",
    retry: "Retry",
    back: "Back",
    tag_signal_ai: "AI SIGNAL",
    tag_signal: "SIGNAL",
    tag_edu: "EDUCATION",
    tag_ind: "INDICATOR",
    tag_asset_analysis: "ASSET ANALYSIS",

    dir_up: "UP", dir_down: "SHORT",
    probability: "Probability", expiration: "Expiration",
    entry: "Entry", target: "Target",
    accept_signal: "ACCEPT SIGNAL",
    processing: "AI algorithm processing data...",
    step_volatility: "› checking volatility",
    step_rsi: "› computing RSI + MACD",
    step_patterns: "› candlestick patterns",
    demo_note: "⚠ Demo signal. In production this is the output of an ML model on historical asset data.",
    demo_note_market: "⚠ Demo signal. In production this is the output of an ML model/API.",

    gate_loading: "Checking access...",
    gate_channel_title: "Subscribe to the channel",
    gate_channel_desc: "To get access to signals, please subscribe to our analytics channel.",
    gate_channel_btn: "📣 Open channel",
    gate_check_btn: "I subscribed, check",
    gate_broker_title: "Register on Pocket Option",
    gate_broker_desc: "For full access, please register on Pocket Option via our referral link and enter your account ID below.",
    gate_broker_step1: "1. Register on the broker",
    gate_broker_step2: "2. Find your UID in profile",
    gate_broker_step3: "3. Enter UID below",
    gate_broker_btn_register: "🏦 Open Pocket Option",
    gate_broker_uid_placeholder: "Your UID (numbers)",
    gate_broker_uid_hint: "UID is usually 6–8 digits, you'll find it in your Pocket Option profile",
    gate_broker_uid_hint_err: "UID must be 4–15 digits",
    gate_broker_submit: "Submit claim",
    gate_broker_submit_err: "Submit failed. Check your connection and try again.",
    gate_broker_pending_title: "Claim under review",
    gate_broker_pending_desc: "Your UID has been submitted. Approval usually takes up to 24 hours. You'll receive a Telegram notification.",
    gate_broker_rejected: "Claim rejected. Make sure you registered via our link and try again.",
    gate_error: "Access error",
    gate_retry: "Retry",
  },
};

const LangCtx = createContext({ lang: "ru", t: STR.ru, setLang: () => {} });
const useT = () => useContext(LangCtx);

/* ────────────────────────── CONFIG ────────────────────────── */

const CHANNEL_URL = "https://t.me/traidingpr";
const BROKER_URL  = "https://u3.shortink.io/register?utm_campaign=844412&utm_source=affiliate&utm_medium=sr&a=PUzmkw57PSkH73&al=1755360&ac=bottg&cid=952923&code=50START";
const API_URL_HARDCODED = "https://api-production-6682.up.railway.app";

/* ────────────────────────── DATA ────────────────────────── */

const TICKER_ITEMS = [
  { s: "D OTC",       p: "0.96724",  y: "92%" },
  { s: "BHD/CNY OTC", p: "18.43788", y: "92%" },
  { s: "EUR/USD",     p: "1.08412",  y: "87%" },
  { s: "BTC/USDT",    p: "68240.12", y: "89%" },
  { s: "XAU/USD",     p: "2651.40",  y: "91%" },
  { s: "USD/JPY",     p: "151.22",   y: "85%" },
];

const CAT_META = [
  { key: "fiat",   Icon: Coins     },
  { key: "otc",    Icon: Coins     },
  { key: "crypto", Icon: Bitcoin   },
  { key: "stocks", Icon: BarChart3 },
  { key: "comm",   Icon: Fuel      },
  { key: "idx",    Icon: LineChart },
  { key: "fav",    Icon: Heart     },
];

const FLAG = (code) => `https://flagcdn.com/w80/${code}.png`;

const ASSETS_BY_CAT = {
  fiat: [
    { ticker: "EUR/USD", catKey: "fiat", yield: 78, price: 1.08412, change: 0.12,  flagUrls: [FLAG("eu"), FLAG("us")], digits: 5 },
    { ticker: "GBP/USD", catKey: "fiat", yield: 75, price: 1.27150, change: 0.08,  flagUrls: [FLAG("gb"), FLAG("us")], digits: 5 },
    { ticker: "USD/JPY", catKey: "fiat", yield: 77, price: 151.220, change: -0.15, flagUrls: [FLAG("us"), FLAG("jp")], digits: 3 },
    { ticker: "USD/CHF", catKey: "fiat", yield: 69, price: 0.88921, change: 0.05,  flagUrls: [FLAG("us"), FLAG("ch")], digits: 5 },
    { ticker: "USD/CAD", catKey: "fiat", yield: 72, price: 1.38420, change: -0.18, flagUrls: [FLAG("us"), FLAG("ca")], digits: 5 },
    { ticker: "AUD/USD", catKey: "fiat", yield: 74, price: 0.65127, change: -0.11, flagUrls: [FLAG("au"), FLAG("us")], digits: 5 },
    { ticker: "NZD/USD", catKey: "fiat", yield: 73, price: 0.59130, change: 0.22,  flagUrls: [FLAG("nz"), FLAG("us")], digits: 5 },
    { ticker: "EUR/GBP", catKey: "fiat", yield: 71, price: 0.85280, change: -0.04, flagUrls: [FLAG("eu"), FLAG("gb")], digits: 5 },
    { ticker: "EUR/JPY", catKey: "fiat", yield: 76, price: 163.850, change: -0.03, flagUrls: [FLAG("eu"), FLAG("jp")], digits: 3 },
    { ticker: "EUR/CHF", catKey: "fiat", yield: 70, price: 0.96400, change: 0.07,  flagUrls: [FLAG("eu"), FLAG("ch")], digits: 5 },
    { ticker: "EUR/CAD", catKey: "fiat", yield: 73, price: 1.60815, change: 0.10,  flagUrls: [FLAG("eu"), FLAG("ca")], digits: 5 },
    { ticker: "EUR/AUD", catKey: "fiat", yield: 72, price: 1.66420, change: 0.23,  flagUrls: [FLAG("eu"), FLAG("au")], digits: 5 },
    { ticker: "EUR/NZD", catKey: "fiat", yield: 70, price: 1.83410, change: -0.10, flagUrls: [FLAG("eu"), FLAG("nz")], digits: 5 },
    { ticker: "GBP/JPY", catKey: "fiat", yield: 71, price: 198.430, change: -0.24, flagUrls: [FLAG("gb"), FLAG("jp")], digits: 3 },
    { ticker: "GBP/CHF", catKey: "fiat", yield: 69, price: 1.13080, change: 0.13,  flagUrls: [FLAG("gb"), FLAG("ch")], digits: 5 },
    { ticker: "GBP/CAD", catKey: "fiat", yield: 70, price: 1.76020, change: -0.08, flagUrls: [FLAG("gb"), FLAG("ca")], digits: 5 },
    { ticker: "GBP/AUD", catKey: "fiat", yield: 70, price: 1.95210, change: 0.19,  flagUrls: [FLAG("gb"), FLAG("au")], digits: 5 },
    { ticker: "AUD/JPY", catKey: "fiat", yield: 74, price: 98.480,  change: -0.26, flagUrls: [FLAG("au"), FLAG("jp")], digits: 3 },
    { ticker: "AUD/CAD", catKey: "fiat", yield: 71, price: 0.90120, change: -0.05, flagUrls: [FLAG("au"), FLAG("ca")], digits: 5 },
    { ticker: "AUD/NZD", catKey: "fiat", yield: 69, price: 1.10130, change: -0.30, flagUrls: [FLAG("au"), FLAG("nz")], digits: 5 },
    { ticker: "AUD/CHF", catKey: "fiat", yield: 68, price: 0.57910, change: -0.06, flagUrls: [FLAG("au"), FLAG("ch")], digits: 5 },
    { ticker: "NZD/JPY", catKey: "fiat", yield: 73, price: 89.410,  change: 0.15,  flagUrls: [FLAG("nz"), FLAG("jp")], digits: 3 },
    { ticker: "CAD/JPY", catKey: "fiat", yield: 72, price: 109.250, change: 0.04,  flagUrls: [FLAG("ca"), FLAG("jp")], digits: 3 },
    { ticker: "CAD/CHF", catKey: "fiat", yield: 68, price: 0.64250, change: 0.11,  flagUrls: [FLAG("ca"), FLAG("ch")], digits: 5 },
    { ticker: "CHF/JPY", catKey: "fiat", yield: 74, price: 170.080, change: -0.20, flagUrls: [FLAG("ch"), FLAG("jp")], digits: 3 },
    { ticker: "USD/TRY", catKey: "fiat", yield: 83, price: 34.210,  change: 0.35,  flagUrls: [FLAG("us"), FLAG("tr")], digits: 3 },
    { ticker: "USD/MXN", catKey: "fiat", yield: 79, price: 20.150,  change: 0.08,  flagUrls: [FLAG("us"), FLAG("mx")], digits: 3 },
    { ticker: "USD/ZAR", catKey: "fiat", yield: 81, price: 18.420,  change: -0.12, flagUrls: [FLAG("us"), FLAG("za")], digits: 3 },
  ],
  otc: [
    { ticker: "EUR/USD OTC",  catKey: "otc", yield: 92, price: 1.08412, change: 0.14,  flagUrls: [FLAG("eu"), FLAG("us")], digits: 5 },
    { ticker: "GBP/USD OTC",  catKey: "otc", yield: 90, price: 1.27150, change: 0.10,  flagUrls: [FLAG("gb"), FLAG("us")], digits: 5 },
    { ticker: "USD/JPY OTC",  catKey: "otc", yield: 91, price: 151.220, change: -0.12, flagUrls: [FLAG("us"), FLAG("jp")], digits: 3 },
    { ticker: "AUD/USD OTC",  catKey: "otc", yield: 89, price: 0.65127, change: -0.08, flagUrls: [FLAG("au"), FLAG("us")], digits: 5 },
    { ticker: "NZD/USD OTC",  catKey: "otc", yield: 92, price: 0.59130, change: 0.25,  flagUrls: [FLAG("nz"), FLAG("us")], digits: 5 },
    { ticker: "USD/CHF OTC",  catKey: "otc", yield: 88, price: 0.88921, change: 0.06,  flagUrls: [FLAG("us"), FLAG("ch")], digits: 5 },
    { ticker: "USD/CAD OTC",  catKey: "otc", yield: 89, price: 1.38420, change: -0.16, flagUrls: [FLAG("us"), FLAG("ca")], digits: 5 },
    { ticker: "EUR/JPY OTC",  catKey: "otc", yield: 88, price: 163.850, change: -0.04, flagUrls: [FLAG("eu"), FLAG("jp")], digits: 3 },
    { ticker: "GBP/JPY OTC",  catKey: "otc", yield: 90, price: 198.430, change: -0.22, flagUrls: [FLAG("gb"), FLAG("jp")], digits: 3 },
    { ticker: "CHF/JPY OTC",  catKey: "otc", yield: 87, price: 170.080, change: -0.18, flagUrls: [FLAG("ch"), FLAG("jp")], digits: 3 },
    { ticker: "EUR/CAD OTC",  catKey: "otc", yield: 88, price: 1.50120, change: 0.12,  flagUrls: [FLAG("eu"), FLAG("ca")], digits: 5 },
    { ticker: "CHF/NOK OTC",  catKey: "otc", yield: 90, price: 12.150,  change: 0.18,  flagUrls: [FLAG("ch"), FLAG("no")], digits: 3 },
    { ticker: "BHD/CNY OTC",  catKey: "otc", yield: 92, price: 18.4378, change: 0.31,  flagUrls: [FLAG("bh"), FLAG("cn")], digits: 4 },
    { ticker: "USD/ARS OTC",  catKey: "otc", yield: 88, price: 998.120, change: 0.42,  flagUrls: [FLAG("us"), FLAG("ar")], digits: 3 },
  ],
  crypto: [
    { ticker: "BTC/USDT",  catKey: "crypto", yield: 89, price: 68240.12, change: 1.24, flags: ["🟠","🟢"], binanceSymbol: "BTCUSDT",  digits: 2, iconUrl: "https://assets.coincap.io/assets/icons/btc@2x.png" },
    { ticker: "ETH/USDT",  catKey: "crypto", yield: 86, price: 3421.55,  change: 0.67, flags: ["🔷","🟢"], binanceSymbol: "ETHUSDT",  digits: 2, iconUrl: "https://assets.coincap.io/assets/icons/eth@2x.png" },
    { ticker: "BNB/USDT",  catKey: "crypto", yield: 84, price: 595.10,   change: 0.42, flags: ["🟡","🟢"], binanceSymbol: "BNBUSDT",  digits: 2, iconUrl: "https://assets.coincap.io/assets/icons/bnb@2x.png" },
    { ticker: "SOL/USDT",  catKey: "crypto", yield: 84, price: 178.22,   change: -1.14,flags: ["🟣","🟢"], binanceSymbol: "SOLUSDT",  digits: 2, iconUrl: "https://assets.coincap.io/assets/icons/sol@2x.png" },
    { ticker: "XRP/USDT",  catKey: "crypto", yield: 82, price: 0.62,     change: 1.90, flags: ["🔵","🟢"], binanceSymbol: "XRPUSDT",  digits: 4, iconUrl: "https://assets.coincap.io/assets/icons/xrp@2x.png" },
    { ticker: "ADA/USDT",  catKey: "crypto", yield: 80, price: 0.42,     change: 0.31, flags: ["🔵","🟢"], binanceSymbol: "ADAUSDT",  digits: 4, iconUrl: "https://assets.coincap.io/assets/icons/ada@2x.png" },
    { ticker: "DOGE/USDT", catKey: "crypto", yield: 81, price: 0.185,    change: 2.50, flags: ["🐕","🟢"], binanceSymbol: "DOGEUSDT", digits: 5, iconUrl: "https://assets.coincap.io/assets/icons/doge@2x.png" },
    { ticker: "AVAX/USDT", catKey: "crypto", yield: 79, price: 34.20,    change: -0.50,flags: ["🔺","🟢"], binanceSymbol: "AVAXUSDT", digits: 2, iconUrl: "https://assets.coincap.io/assets/icons/avax@2x.png" },
    { ticker: "TRX/USDT",  catKey: "crypto", yield: 78, price: 0.162,    change: 0.80, flags: ["🔴","🟢"], binanceSymbol: "TRXUSDT",  digits: 5, iconUrl: "https://assets.coincap.io/assets/icons/trx@2x.png" },
    { ticker: "DOT/USDT",  catKey: "crypto", yield: 77, price: 7.42,     change: -0.30,flags: ["⚪","🟢"], binanceSymbol: "DOTUSDT",  digits: 3, iconUrl: "https://assets.coincap.io/assets/icons/dot@2x.png" },
    { ticker: "LINK/USDT", catKey: "crypto", yield: 80, price: 13.55,    change: 1.10, flags: ["🔗","🟢"], binanceSymbol: "LINKUSDT", digits: 3, iconUrl: "https://assets.coincap.io/assets/icons/link@2x.png" },
    { ticker: "MATIC/USDT",catKey: "crypto", yield: 78, price: 0.54,     change: 0.60, flags: ["🟣","🟢"], binanceSymbol: "MATICUSDT",digits: 4, iconUrl: "https://assets.coincap.io/assets/icons/matic@2x.png" },
    { ticker: "LTC/USDT",  catKey: "crypto", yield: 76, price: 72.15,    change: 0.25, flags: ["🔘","🟢"], binanceSymbol: "LTCUSDT",  digits: 2, iconUrl: "https://assets.coincap.io/assets/icons/ltc@2x.png" },
    { ticker: "BCH/USDT",  catKey: "crypto", yield: 75, price: 345.20,   change: -0.70,flags: ["🟢","🟢"], binanceSymbol: "BCHUSDT",  digits: 2, iconUrl: "https://assets.coincap.io/assets/icons/bch@2x.png" },
    { ticker: "SHIB/USDT", catKey: "crypto", yield: 77, price: 0.000018, change: 1.80, flags: ["🐕","🟢"], binanceSymbol: "SHIBUSDT", digits: 8, iconUrl: "https://assets.coincap.io/assets/icons/shib@2x.png" },
    { ticker: "UNI/USDT",  catKey: "crypto", yield: 76, price: 8.20,     change: 0.45, flags: ["🦄","🟢"], binanceSymbol: "UNIUSDT",  digits: 3, iconUrl: "https://assets.coincap.io/assets/icons/uni@2x.png" },
    { ticker: "ATOM/USDT", catKey: "crypto", yield: 75, price: 4.62,     change: -0.15,flags: ["⚛","🟢"],  binanceSymbol: "ATOMUSDT", digits: 3, iconUrl: "https://assets.coincap.io/assets/icons/atom@2x.png" },
    { ticker: "XLM/USDT",  catKey: "crypto", yield: 74, price: 0.098,    change: 0.22, flags: ["🚀","🟢"], binanceSymbol: "XLMUSDT",  digits: 5, iconUrl: "https://assets.coincap.io/assets/icons/xlm@2x.png" },
    { ticker: "NEAR/USDT", catKey: "crypto", yield: 76, price: 5.12,     change: 0.85, flags: ["🔵","🟢"], binanceSymbol: "NEARUSDT", digits: 3, iconUrl: "https://assets.coincap.io/assets/icons/near@2x.png" },
    { ticker: "APT/USDT",  catKey: "crypto", yield: 75, price: 8.90,     change: 1.40, flags: ["🔴","🟢"], binanceSymbol: "APTUSDT",  digits: 3, iconUrl: "https://assets.coincap.io/assets/icons/apt@2x.png" },
    { ticker: "FIL/USDT",  catKey: "crypto", yield: 73, price: 4.12,     change: -0.25,flags: ["🗂","🟢"],  binanceSymbol: "FILUSDT",  digits: 3, iconUrl: "https://assets.coincap.io/assets/icons/fil@2x.png" },
    { ticker: "ETC/USDT",  catKey: "crypto", yield: 72, price: 22.40,    change: 0.05, flags: ["🟢","🟢"], binanceSymbol: "ETCUSDT",  digits: 2, iconUrl: "https://assets.coincap.io/assets/icons/etc@2x.png" },
  ],
  stocks: [
    { ticker: "AAPL",  catKey: "stocks", yield: 76, price: 229.14,  change: 0.44,  flags: ["🍎"], iconUrl: "https://financialmodelingprep.com/image-stock/AAPL.png",  brandColor: "#1f1f1f", digits: 2 },
    { ticker: "MSFT",  catKey: "stocks", yield: 78, price: 415.75,  change: 0.82,  flags: ["🪟"], iconUrl: "https://financialmodelingprep.com/image-stock/MSFT.png",  brandColor: "#0078d4", digits: 2 },
    { ticker: "GOOGL", catKey: "stocks", yield: 77, price: 174.20,  change: 0.55,  flags: ["🔍"], iconUrl: "https://financialmodelingprep.com/image-stock/GOOGL.png", brandColor: "#4285f4", digits: 2 },
    { ticker: "AMZN",  catKey: "stocks", yield: 79, price: 195.44,  change: -0.30, flags: ["📦"], iconUrl: "https://financialmodelingprep.com/image-stock/AMZN.png",  brandColor: "#ff9900", digits: 2 },
    { ticker: "META",  catKey: "stocks", yield: 78, price: 572.18,  change: 1.12,  flags: ["👥"], iconUrl: "https://financialmodelingprep.com/image-stock/META.png",  brandColor: "#1877f2", digits: 2 },
    { ticker: "TSLA",  catKey: "stocks", yield: 72, price: 251.80,  change: -0.87, flags: ["🚗"], iconUrl: "https://financialmodelingprep.com/image-stock/TSLA.png",  brandColor: "#cc0000", digits: 2 },
    { ticker: "NVDA",  catKey: "stocks", yield: 81, price: 141.22,  change: 2.10,  flags: ["🖥️"], iconUrl: "https://financialmodelingprep.com/image-stock/NVDA.png",  brandColor: "#76b900", digits: 2 },
    { ticker: "NFLX",  catKey: "stocks", yield: 74, price: 732.50,  change: 0.98,  flags: ["🎬"], iconUrl: "https://financialmodelingprep.com/image-stock/NFLX.png",  brandColor: "#e50914", digits: 2 },
    { ticker: "JPM",   catKey: "stocks", yield: 70, price: 223.85,  change: 0.18,  flags: ["🏦"], iconUrl: "https://financialmodelingprep.com/image-stock/JPM.png",   brandColor: "#003594", digits: 2 },
    { ticker: "V",     catKey: "stocks", yield: 72, price: 292.10,  change: 0.25,  flags: ["💳"], iconUrl: "https://financialmodelingprep.com/image-stock/V.png",     brandColor: "#1a1f71", digits: 2 },
    { ticker: "MA",    catKey: "stocks", yield: 71, price: 508.45,  change: 0.32,  flags: ["💳"], iconUrl: "https://financialmodelingprep.com/image-stock/MA.png",    brandColor: "#eb001b", digits: 2 },
    { ticker: "PYPL",  catKey: "stocks", yield: 73, price: 79.20,   change: -0.42, flags: ["💸"], iconUrl: "https://financialmodelingprep.com/image-stock/PYPL.png",  brandColor: "#003087", digits: 2 },
    { ticker: "DIS",   catKey: "stocks", yield: 69, price: 97.15,   change: 0.12,  flags: ["🎡"], iconUrl: "https://financialmodelingprep.com/image-stock/DIS.png",   brandColor: "#013087", digits: 2 },
    { ticker: "NKE",   catKey: "stocks", yield: 70, price: 78.45,   change: -0.55, flags: ["👟"], iconUrl: "https://financialmodelingprep.com/image-stock/NKE.png",   brandColor: "#111111", digits: 2 },
    { ticker: "MCD",   catKey: "stocks", yield: 68, price: 294.80,  change: 0.22,  flags: ["🍔"], iconUrl: "https://financialmodelingprep.com/image-stock/MCD.png",   brandColor: "#ffc72c", digits: 2 },
    { ticker: "KO",    catKey: "stocks", yield: 66, price: 65.42,   change: 0.08,  flags: ["🥤"], iconUrl: "https://financialmodelingprep.com/image-stock/KO.png",    brandColor: "#f40009", digits: 2 },
    { ticker: "PEP",   catKey: "stocks", yield: 66, price: 158.90,  change: 0.04,  flags: ["🥤"], iconUrl: "https://financialmodelingprep.com/image-stock/PEP.png",   brandColor: "#004b93", digits: 2 },
    { ticker: "SBUX",  catKey: "stocks", yield: 69, price: 96.15,   change: -0.22, flags: ["☕"], iconUrl: "https://financialmodelingprep.com/image-stock/SBUX.png",  brandColor: "#006241", digits: 2 },
    { ticker: "BA",    catKey: "stocks", yield: 67, price: 154.20,  change: -1.15, flags: ["✈️"], iconUrl: "https://financialmodelingprep.com/image-stock/BA.png",    brandColor: "#0039a6", digits: 2 },
    { ticker: "INTC",  catKey: "stocks", yield: 68, price: 23.80,   change: -0.65, flags: ["🖥️"], iconUrl: "https://financialmodelingprep.com/image-stock/INTC.png",  brandColor: "#0071c5", digits: 2 },
    { ticker: "AMD",   catKey: "stocks", yield: 75, price: 158.40,  change: 1.45,  flags: ["🖥️"], iconUrl: "https://financialmodelingprep.com/image-stock/AMD.png",   brandColor: "#000000", digits: 2 },
    { ticker: "CSCO",  catKey: "stocks", yield: 67, price: 58.20,   change: 0.12,  flags: ["🌐"], iconUrl: "https://financialmodelingprep.com/image-stock/CSCO.png",  brandColor: "#1ba0d7", digits: 2 },
    { ticker: "ORCL",  catKey: "stocks", yield: 71, price: 180.15,  change: 0.38,  flags: ["🗄️"], iconUrl: "https://financialmodelingprep.com/image-stock/ORCL.png",  brandColor: "#c74634", digits: 2 },
    { ticker: "IBM",   catKey: "stocks", yield: 68, price: 215.70,  change: -0.18, flags: ["💼"], iconUrl: "https://financialmodelingprep.com/image-stock/IBM.png",   brandColor: "#054ada", digits: 2 },
    { ticker: "ADBE",  catKey: "stocks", yield: 73, price: 485.20,  change: 0.55,  flags: ["🎨"], iconUrl: "https://financialmodelingprep.com/image-stock/ADBE.png",  brandColor: "#ff0000", digits: 2 },
    { ticker: "CRM",   catKey: "stocks", yield: 72, price: 328.45,  change: 0.28,  flags: ["☁️"], iconUrl: "https://financialmodelingprep.com/image-stock/CRM.png",   brandColor: "#00a1e0", digits: 2 },
    { ticker: "UBER",  catKey: "stocks", yield: 74, price: 72.50,   change: 0.95,  flags: ["🚕"], iconUrl: "https://financialmodelingprep.com/image-stock/UBER.png",  brandColor: "#000000", digits: 2 },
    { ticker: "ABNB",  catKey: "stocks", yield: 73, price: 135.80,  change: -0.45, flags: ["🏠"], iconUrl: "https://financialmodelingprep.com/image-stock/ABNB.png",  brandColor: "#ff5a5f", digits: 2 },
    { ticker: "SHOP",  catKey: "stocks", yield: 75, price: 109.20,  change: 1.20,  flags: ["🛒"], iconUrl: "https://financialmodelingprep.com/image-stock/SHOP.png",  brandColor: "#7ab55c", digits: 2 },
    { ticker: "SPOT",  catKey: "stocks", yield: 73, price: 384.60,  change: 0.68,  flags: ["🎵"], iconUrl: "https://financialmodelingprep.com/image-stock/SPOT.png",  brandColor: "#1db954", digits: 2 },
    { ticker: "BABA",  catKey: "stocks", yield: 74, price: 95.40,   change: 1.55,  flags: ["🛍️"], iconUrl: "https://financialmodelingprep.com/image-stock/BABA.png",  brandColor: "#ff6a00", digits: 2 },
    { ticker: "WMT",   catKey: "stocks", yield: 66, price: 82.15,   change: 0.08,  flags: ["🛒"], iconUrl: "https://financialmodelingprep.com/image-stock/WMT.png",   brandColor: "#0071dc", digits: 2 },
    { ticker: "XOM",   catKey: "stocks", yield: 68, price: 117.50,  change: -0.32, flags: ["⛽"], iconUrl: "https://financialmodelingprep.com/image-stock/XOM.png",   brandColor: "#e32e2e", digits: 2 },
    { ticker: "CVX",   catKey: "stocks", yield: 68, price: 159.80,  change: -0.22, flags: ["⛽"], iconUrl: "https://financialmodelingprep.com/image-stock/CVX.png",   brandColor: "#005db9", digits: 2 },
    { ticker: "PFE",   catKey: "stocks", yield: 69, price: 28.45,   change: 0.18,  flags: ["💊"], iconUrl: "https://financialmodelingprep.com/image-stock/PFE.png",   brandColor: "#0075be", digits: 2 },
    { ticker: "COIN",  catKey: "stocks", yield: 77, price: 245.30,  change: 2.10,  flags: ["🪙"], iconUrl: "https://financialmodelingprep.com/image-stock/COIN.png",  brandColor: "#0052ff", digits: 2 },
  ],
  comm: [
    { ticker: "XAU/USD",  catKey: "comm", yield: 91, price: 2651.40, change: 0.55, flags: ["🥇"], customIcon: "gold",     digits: 2 },
    { ticker: "XAG/USD",  catKey: "comm", yield: 83, price: 31.28,   change: 0.12, flags: ["🥈"], customIcon: "silver",   digits: 3 },
    { ticker: "XPT/USD",  catKey: "comm", yield: 80, price: 945.20,  change: -0.30,flags: ["💎"], customIcon: "platinum", digits: 2 },
    { ticker: "XPD/USD",  catKey: "comm", yield: 78, price: 1022.50, change: 0.45, flags: ["💠"], customIcon: "palladium",digits: 2 },
    { ticker: "WTI",      catKey: "comm", yield: 77, price: 70.41,   change: -0.91,flags: ["🛢"], customIcon: "oil",      digits: 2 },
    { ticker: "BRENT",    catKey: "comm", yield: 76, price: 74.85,   change: -0.75,flags: ["🛢"], customIcon: "oil",      digits: 2 },
    { ticker: "NATGAS",   catKey: "comm", yield: 74, price: 2.85,    change: 1.20, flags: ["🔥"], customIcon: "gas",      digits: 3 },
    { ticker: "COPPER",   catKey: "comm", yield: 72, price: 4.12,    change: 0.35, flags: ["🟤"], customIcon: "copper",   digits: 3 },
    { ticker: "COFFEE",   catKey: "comm", yield: 71, price: 2.34,    change: 0.80, flags: ["☕"], customIcon: "coffee",   digits: 2 },
  ],
  idx: [
    { ticker: "SPX500", catKey: "idx", yield: 80, price: 5810.22,  change: 0.33,  flags: ["🇺🇸"], iconUrl: FLAG("us"), digits: 2 },
    { ticker: "NAS100", catKey: "idx", yield: 82, price: 20412.50, change: 0.48,  flags: ["🇺🇸"], iconUrl: FLAG("us"), digits: 2 },
    { ticker: "DJ30",   catKey: "idx", yield: 79, price: 43125.80, change: 0.22,  flags: ["🇺🇸"], iconUrl: FLAG("us"), digits: 2 },
    { ticker: "RUS2K",  catKey: "idx", yield: 77, price: 2342.15,  change: -0.18, flags: ["🇺🇸"], iconUrl: FLAG("us"), digits: 2 },
    { ticker: "UK100",  catKey: "idx", yield: 78, price: 8287.40,  change: 0.15,  flags: ["🇬🇧"], iconUrl: FLAG("gb"), digits: 2 },
    { ticker: "GER40",  catKey: "idx", yield: 79, price: 19284.60, change: 0.28,  flags: ["🇩🇪"], iconUrl: FLAG("de"), digits: 2 },
    { ticker: "FRA40",  catKey: "idx", yield: 77, price: 7442.80,  change: -0.08, flags: ["🇫🇷"], iconUrl: FLAG("fr"), digits: 2 },
    { ticker: "EU50",   catKey: "idx", yield: 78, price: 4835.20,  change: 0.12,  flags: ["🇪🇺"], iconUrl: FLAG("eu"), digits: 2 },
    { ticker: "JPN225", catKey: "idx", yield: 81, price: 38912.50, change: -0.42, flags: ["🇯🇵"], iconUrl: FLAG("jp"), digits: 2 },
    { ticker: "HK50",   catKey: "idx", yield: 80, price: 20415.80, change: 0.85,  flags: ["🇭🇰"], iconUrl: FLAG("hk"), digits: 2 },
    { ticker: "CN50",   catKey: "idx", yield: 80, price: 13240.60, change: 1.10,  flags: ["🇨🇳"], iconUrl: FLAG("cn"), digits: 2 },
    { ticker: "AUS200", catKey: "idx", yield: 76, price: 8240.50,  change: 0.18,  flags: ["🇦🇺"], iconUrl: FLAG("au"), digits: 2 },
  ],
  fav: [
    { ticker: "EUR/USD",  catKey: "fiat",   yield: 78, price: 1.08412,  change: 0.12, flagUrls: [FLAG("eu"), FLAG("us")], digits: 5 },
    { ticker: "BTC/USDT", catKey: "crypto", yield: 89, price: 68240.12, change: 1.24, flags: ["🟠","🟢"], binanceSymbol: "BTCUSDT", digits: 2, iconUrl: "https://assets.coincap.io/assets/icons/btc@2x.png" },
    { ticker: "XAU/USD",  catKey: "comm",   yield: 91, price: 2651.40,  change: 0.55, flags: ["🥇"], customIcon: "gold", digits: 2 },
  ],
};

/* ─── Пары для сканера «Анализировать рынок» ───
 * source: "frankfurter" (бесплатный форекс API, без ключа, CORS открыт)
 *         "binance"     (крипта, публичный ticker, CORS открыт)
 * fallback — значение, если fetch упадёт (офлайн / rate limit).             */
const SCAN_PAIRS = [
  { label: "EUR/USD",     flags: ["🇪🇺","🇺🇸"], source: "frankfurter", from: "EUR", to: "USD", digits: 5, payout: 87, fallback: 1.0841 },
  { label: "GBP/USD",     flags: ["🇬🇧","🇺🇸"], source: "frankfurter", from: "GBP", to: "USD", digits: 5, payout: 82, fallback: 1.2715 },
  { label: "AUD/USD",     flags: ["🇦🇺","🇺🇸"], source: "frankfurter", from: "AUD", to: "USD", digits: 5, payout: 78, fallback: 0.6512 },
  { label: "NZD/USD",     flags: ["🇳🇿","🇺🇸"], source: "frankfurter", from: "NZD", to: "USD", digits: 5, payout: 80, fallback: 0.5913 },
  { label: "USD/JPY",     flags: ["🇺🇸","🇯🇵"], source: "frankfurter", from: "USD", to: "JPY", digits: 3, payout: 85, fallback: 151.22 },
  { label: "USD/CAD",     flags: ["🇺🇸","🇨🇦"], source: "frankfurter", from: "USD", to: "CAD", digits: 5, payout: 81, fallback: 1.3842 },
  { label: "USD/CHF",     flags: ["🇺🇸","🇨🇭"], source: "frankfurter", from: "USD", to: "CHF", digits: 5, payout: 79, fallback: 0.8892 },
  { label: "EUR/GBP",     flags: ["🇪🇺","🇬🇧"], source: "frankfurter", from: "EUR", to: "GBP", digits: 5, payout: 76, fallback: 0.8528 },
  { label: "EUR/JPY",     flags: ["🇪🇺","🇯🇵"], source: "frankfurter", from: "EUR", to: "JPY", digits: 3, payout: 83, fallback: 163.85 },
  // OTC пары — синтетика: берём реальный курс базовой пары и добавляем микро-шум
  { label: "NZD/USD OTC", flags: ["🇳🇿","🇺🇸"], source: "frankfurter", from: "NZD", to: "USD", otc: true, digits: 5, payout: 92, fallback: 0.5914 },
  { label: "CHF/NOK OTC", flags: ["🇨🇭","🇳🇴"], source: "frankfurter", from: "CHF", to: "NOK", otc: true, digits: 5, payout: 90, fallback: 12.15 },
  { label: "EUR/CAD OTC", flags: ["🇪🇺","🇨🇦"], source: "frankfurter", from: "EUR", to: "CAD", otc: true, digits: 5, payout: 88, fallback: 1.5012 },
  { label: "AUD/JPY OTC", flags: ["🇦🇺","🇯🇵"], source: "frankfurter", from: "AUD", to: "JPY", otc: true, digits: 3, payout: 89, fallback: 98.48 },
  // Крипта
  { label: "BTC/USDT",    flags: ["🟠","🟢"],    source: "binance", symbol: "BTCUSDT", digits: 2, payout: 86, fallback: 68240 },
  { label: "ETH/USDT",    flags: ["🔷","🟢"],    source: "binance", symbol: "ETHUSDT", digits: 2, payout: 84, fallback: 3420 },
  { label: "SOL/USDT",    flags: ["🟣","🟢"],    source: "binance", symbol: "SOLUSDT", digits: 2, payout: 82, fallback: 178.2 },
];

async function fetchPrice(pair) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    let url;
    if (pair.source === "frankfurter") {
      url = `https://api.frankfurter.app/latest?from=${pair.from}&to=${pair.to}`;
    } else if (pair.source === "binance") {
      url = `https://api.binance.com/api/v3/ticker/price?symbol=${pair.symbol}`;
    }
    const r = await fetch(url, { signal: controller.signal });
    const j = await r.json();
    let p;
    if (pair.source === "frankfurter") p = j.rates?.[pair.to];
    else if (pair.source === "binance") p = parseFloat(j.price);
    if (!p || Number.isNaN(p)) throw new Error("no data");
    if (pair.otc) p = p * (1 + (Math.random() - 0.5) * 0.003);
    return p;
  } catch {
    return pair.fallback * (1 + (Math.random() - 0.5) * 0.002);
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const NEWS = [
  { time: "01:00", prio: "high", leftH: 0,  leftM: 42, flag: "🇬🇧", title: "CPI y/y" },
  { time: "02:30", prio: "mid",  leftH: 2,  leftM: 12, flag: "🇦🇺", title: "Employment Change" },
  { time: "03:00", prio: "low",  leftH: 2,  leftM: 45, flag: "🇨🇳", title: "Manufacturing PMI" },
  { time: "08:00", prio: "high", leftH: 7,  leftM: 42, flag: "🇩🇪", title: "GDP Flash q/q" },
  { time: "09:30", prio: "mid",  leftH: 9,  leftM: 12, flag: "🇬🇧", title: "Retail Sales m/m" },
  { time: "10:00", prio: "mid",  leftH: 9,  leftM: 42, flag: "🇪🇺", title: "Core CPI Flash y/y" },
  { time: "12:45", prio: "high", leftH: 12, leftM: 27, flag: "🇪🇺", title: "ECB Rate Decision" },
  { time: "13:30", prio: "high", leftH: 13, leftM: 12, flag: "🇺🇸", title: "Non-Farm Payrolls" },
  { time: "13:30", prio: "high", leftH: 13, leftM: 12, flag: "🇺🇸", title: "Unemployment Rate" },
  { time: "14:30", prio: "high", leftH: 14, leftM: 12, flag: "🇺🇸", title: "Core PCE m/m" },
  { time: "15:00", prio: "mid",  leftH: 14, leftM: 42, flag: "🇺🇸", title: "ISM Services PMI" },
  { time: "15:45", prio: "low",  leftH: 15, leftM: 27, flag: "🇨🇦", title: "BOC Gov Speaks" },
  { time: "19:00", prio: "high", leftH: 18, leftM: 42, flag: "🇺🇸", title: "FOMC Rate Decision" },
  { time: "21:00", prio: "mid",  leftH: 20, leftM: 42, flag: "🇯🇵", title: "BOJ Minutes" },
];

/* ────────────────────────── HELPERS ────────────────────────── */

const fmt = (n, d = 2) => Number(n).toFixed(d);
const fmtMoney = n => `$${fmt(n, 2)}`;

/* ────────────────────────── MAIN APP ────────────────────────── */

export default function TradeAppBot() {
  const [lang, setLang] = useState("ru");
  const t = STR[lang];

  const [openBlock, setOpenBlock] = useState("assets");
  const [openCat, setOpenCat] = useState("fiat");
  const [favs, setFavs] = useState(new Set(["EUR/USD", "BTC/USDT", "XAU/USD"]));
  const [modal, setModal] = useState(null);
  const [scan, setScan] = useState(null);
  const [displayPrice, setDisplayPrice] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState("");
  const [eduTab, setEduTab] = useState("basics");
  const [assetSignal, setAssetSignal] = useState(null);
  const [langOpen, setLangOpen] = useState(false);
  const scanRunId = useRef(0);

  // ─── API client ───
  const API_URL = API_URL_HARDCODED;
  const [authState, setAuthState] = useState({
    loading: true,
    session: null,
    subscribed: false,
    brokerStatus: "none", // none | pending | approved | rejected
    error: null,
  });

  // ─── Telegram Web App SDK init + auth ───
  useEffect(() => {
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
    if (!tg) {
      // dev-режим в обычном браузере — пропускаем гейт
      setAuthState({ loading: false, session: null, subscribed: true, brokerStatus: "approved", error: null });
      return;
    }
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.("#070708");
      tg.setBackgroundColor?.("#070708");
      tg.disableVerticalSwipes?.();
      const tgLang = tg.initDataUnsafe?.user?.language_code;
      if (tgLang === "ru" || tgLang === "en") setLang(tgLang);
    } catch (e) { console.warn("TG init:", e); }

    if (!API_URL) {
      setAuthState({ loading: false, session: null, subscribed: true, brokerStatus: "approved", error: null });
      return;
    }

    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        });
        if (!r.ok) throw new Error((await r.json()).error || "auth failed");
        const d = await r.json();
        setAuthState({ loading: false, session: d.session, subscribed: d.subscribed, brokerStatus: d.brokerStatus, error: null });
      } catch (e) {
        setAuthState({ loading: false, session: null, subscribed: false, brokerStatus: "none", error: e.message });
      }
    })();
  }, []);

  // ─── Трекинг событий ───
  const track = async (event, payload = {}) => {
    if (!API_URL || !authState.session) return;
    fetch(`${API_URL}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session": authState.session },
      body: JSON.stringify({ event, payload }),
    }).catch(() => {});
  };

  // Трекаем открытие приложения
  useEffect(() => {
    if (authState.session) track("app_opened");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.session]);

  // ─── LIVE цены ───
  // Все 121 котировка прилетают одним запросом с нашего API (кешируется на бэке 60 сек).
  // Источники на бэке: Binance (крипта) + Frankfurter (основной FX) + Yahoo Finance
  // (акции, индексы, сырьё, экзотик-FX). OTC синтезируется из реальных пар.
  const [livePrices, setLivePrices] = useState({});

  useEffect(() => {
    let alive = true;

    async function updatePrices() {
      if (!API_URL) return;
      try {
        const r = await fetch(`${API_URL}/api/quotes`);
        if (r.ok) {
          const d = await r.json();
          if (alive && d.quotes) {
            setLivePrices(d.quotes);
          }
        }
      } catch (e) { /* игнорируем — покажутся статичные цены */ }
    }

    updatePrices();
    const id = setInterval(updatePrices, 30_000); // раз в 30 секунд
    return () => { alive = false; clearInterval(id); };
  }, [API_URL]);

  // Возвращает актуальный ассет с подставленной live-ценой (если есть)
  const withLivePrice = (asset) => {
    const live = livePrices[asset.ticker];
    if (!live) return asset;
    return { ...asset, price: live.price, change: live.change };
  };

  const toggleFav = tk => {
    setFavs(prev => {
      const n = new Set(prev);
      n.has(tk) ? n.delete(tk) : n.add(tk);
      return n;
    });
  };

  const runAnalysis = async () => {
    track("market_analysis_started");
    const runId = ++scanRunId.current;
    const ok = () => runId === scanRunId.current;

    // 1) Выбираем случайную пару
    const pair = SCAN_PAIRS[Math.floor(Math.random() * SCAN_PAIRS.length)];
    const expirationMin = [1, 2, 3, 5][Math.floor(Math.random() * 4)];

    // Стадия «Сканируем» — пара ещё не показана
    setDisplayPrice(null);
    setScan({ stage: "scanning", pair: null, expiration: null });
    await sleep(1400);
    if (!ok()) return;

    // 2) Появилась пара — подгружаем реальную цену
    setScan(s => ({ ...s, pair }));
    const price = await fetchPrice(pair);
    if (!ok()) return;
    setDisplayPrice(price);
    setScan(s => ({ ...s, basePrice: price }));
    await sleep(1500);
    if (!ok()) return;

    // 3) Анализируем сигнал — появляется плашка с экспирацией
    setScan(s => ({ ...s, stage: "analyzing", expiration: `${expirationMin}M` }));
    await sleep(1700);
    if (!ok()) return;

    // 4) Анализ волатильности — два пересекающихся круга
    setScan(s => ({ ...s, stage: "volatility" }));
    await sleep(1500);
    if (!ok()) return;

    // 5) Финализация прогноза — круги становятся золотыми
    setScan(s => ({ ...s, stage: "finalizing" }));
    await sleep(1200);
    if (!ok()) return;

    // 6) Результат — пробуем получить честный сигнал с бэка (RSI/MACD/Bollinger)
    let direction = Math.random() > 0.5 ? "BUY" : "SELL";
    let confidence = 0.5;
    let isReal = false;
    try {
      if (API_URL && authState.session) {
        const r = await fetch(`${API_URL}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session": authState.session },
          body: JSON.stringify({ pair }),
        });
        if (r.ok) {
          const d = await r.json();
          if (d.direction) {
            direction = d.direction;
            confidence = d.confidence ?? 0.5;
            isReal = !!d.real;
          }
        }
      }
    } catch (e) { /* fallback на рандом */ }
    const startMs = Date.now();
    const validUntil = startMs + expirationMin * 60 * 1000;
    setScan(s => ({ ...s, stage: "result", direction, confidence, isReal, startMs, validUntil }));
  };

  // Мерцание последнего разряда цены — пока идёт анализ (до стадии result)
  useEffect(() => {
    if (!scan || !scan.basePrice || scan.stage === "result") return;
    const step = Math.pow(10, -(scan.pair.digits - 1)) * 0.8; // амплитуда шума
    const id = setInterval(() => {
      setDisplayPrice(scan.basePrice + (Math.random() - 0.5) * step);
    }, 250);
    return () => clearInterval(id);
  }, [scan?.basePrice, scan?.stage, scan?.pair?.digits]);

  // Тикающий таймер обратного отсчёта на стадии result
  useEffect(() => {
    if (scan?.stage !== "result") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [scan?.stage]);

  const closeScan = () => {
    scanRunId.current++;      // инвалидируем текущий запуск
    setScan(null);
    setDisplayPrice(null);
  };

  // ─── Проверка доступа к контенту ───
  const recheckAuth = async () => {
    const tg = window.Telegram?.WebApp;
    if (!tg || !API_URL) return;
    setAuthState(s => ({ ...s, loading: true }));
    try {
      const r = await fetch(`${API_URL}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "auth failed");
      const d = await r.json();
      setAuthState({ loading: false, session: d.session, subscribed: d.subscribed, brokerStatus: d.brokerStatus, error: null });
    } catch (e) {
      setAuthState({ loading: false, session: null, subscribed: false, brokerStatus: "none", error: e.message });
    }
  };

  const submitBrokerClaim = async (uid) => {
    if (!API_URL || !authState.session) return false;
    try {
      const r = await fetch(`${API_URL}/api/broker/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session": authState.session },
        body: JSON.stringify({ broker_uid: uid }),
      });
      if (!r.ok) return false;
      setAuthState(s => ({ ...s, brokerStatus: "pending" }));
      return true;
    } catch { return false; }
  };

  // Какой гейт показать (если какой-то)
  const gateMode =
    authState.loading                                     ? "loading" :
    authState.error                                       ? "error"   :
    !authState.subscribed                                 ? "channel" :
    authState.brokerStatus === "pending"                  ? "broker_pending" :
    authState.brokerStatus === "none" || authState.brokerStatus === "rejected" ? "broker" :
    null;

  const analyzeAsset = (asset) => {
    track("asset_clicked", { ticker: asset.ticker, catKey: asset.catKey });
    setAssetSignal({ asset, loading: true, result: null });
    setTimeout(() => {
      const isUp = Math.random() > 0.5;
      const price = typeof asset.price === "number" ? asset.price : 1;
      const digits = asset.digits ?? (price < 0.001 ? 8 : price < 1 ? 5 : price < 100 ? 3 : 2);
      const delta = 0.001 + Math.random() * 0.003;
      const target = isUp ? price * (1 + delta) : price * (1 - delta);
      setAssetSignal({
        asset,
        loading: false,
        result: {
          isUp,
          prob: 78 + Math.floor(Math.random() * 17),
          time: `${1 + Math.floor(Math.random() * 5)}M`,
          entry: price.toFixed(digits),
          target: target.toFixed(digits),
        },
      });
    }, 1600);
  };

  return (
    <LangCtx.Provider value={{ lang, t, setLang }}>
      <div
        className="min-h-screen text-neutral-100 pb-36 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(1200px 600px at 10% -10%, #1a1408 0%, transparent 55%)," +
            "radial-gradient(900px 500px at 110% 10%, #0b1614 0%, transparent 50%)," +
            "#070708",
          fontFamily: "'Manrope', ui-sans-serif, system-ui",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
          .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
          .glass { backdrop-filter: blur(14px) saturate(140%); background: rgba(20,20,22,0.62); border: 1px solid rgba(255,255,255,0.06); }
          .gold-grad { background: linear-gradient(180deg,#f9d55b 0%, #e9b308 55%, #a8780a 100%); }
          .gold-text { background: linear-gradient(180deg,#fde68a,#d4a017); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .noise::before {
            content:""; position:absolute; inset:0; pointer-events:none; opacity:.035; z-index:0;
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          }
          @keyframes tickerScroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
          .ticker-track { animation: tickerScroll 38s linear infinite; }
          @keyframes spinGlow { to { transform: rotate(360deg) } }
          .spin-glow { animation: spinGlow 1.1s linear infinite; }
          @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
          .slide-up { animation: slideUp .35s ease-out both; }
          @keyframes fadeIn { from{opacity:0} to{opacity:1} }
          .fade-in { animation: fadeIn .18s ease-out both; }
          .hairline { box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(0,0,0,0.6); }

          /* ---- CRYPTO BACKGROUND ---- */
          .bg-layer { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }

          /* perspective grid */
          @keyframes gridDrift { from { transform: translateY(0) } to { transform: translateY(40px) } }
          .bg-grid {
            position: absolute; inset: -40px -40px -40px -40px;
            background-image:
              linear-gradient(rgba(234,179,8,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(234,179,8,0.06) 1px, transparent 1px);
            background-size: 40px 40px;
            mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 75%);
            -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 75%);
            animation: gridDrift 12s linear infinite;
          }

          /* floating crypto glyphs */
          @keyframes floatA {
            0%,100% { transform: translate(0,0) rotate(-3deg); opacity: .05 }
            50%     { transform: translate(20px,-30px) rotate(3deg); opacity: .12 }
          }
          @keyframes floatB {
            0%,100% { transform: translate(0,0) rotate(2deg); opacity: .07 }
            50%     { transform: translate(-25px,20px) rotate(-4deg); opacity: .14 }
          }
          @keyframes floatC {
            0%,100% { transform: translate(0,0) rotate(-5deg); opacity: .06 }
            50%     { transform: translate(15px,25px) rotate(2deg); opacity: .11 }
          }
          .glyph {
            position: absolute;
            font-weight: 900;
            color: #f9d55b;
            text-shadow: 0 0 40px rgba(234,179,8,0.6);
            user-select: none;
            will-change: transform, opacity;
          }

          /* scrolling candlesticks on the far back */
          @keyframes candleScroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
          .bg-candles {
            position: absolute; bottom: 0; left: 0; width: 200%; height: 40%;
            display: flex; align-items: flex-end; gap: 4px;
            opacity: 0.09;
            animation: candleScroll 60s linear infinite;
            mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, transparent 100%);
            -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, transparent 100%);
          }
          .candle { width: 6px; border-radius: 1px; }
          .candle.up   { background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.5); }
          .candle.down { background: #f43f5e; box-shadow: 0 0 8px rgba(244,63,94,0.5); }

          /* rising particles */
          @keyframes riseParticle {
            0%   { transform: translateY(110vh) scale(0.6); opacity: 0 }
            10%  { opacity: 0.8 }
            90%  { opacity: 0.8 }
            100% { transform: translateY(-10vh) scale(1.1); opacity: 0 }
          }
          .particle {
            position: absolute;
            width: 3px; height: 3px;
            border-radius: 50%;
            background: #fde68a;
            box-shadow: 0 0 8px #eab308, 0 0 16px rgba(234,179,8,0.4);
            will-change: transform, opacity;
          }

          /* glowing orbs */
          @keyframes orbPulse {
            0%,100% { transform: scale(1); opacity: 0.25 }
            50%     { transform: scale(1.15); opacity: 0.4 }
          }
          .orb {
            position: absolute; border-radius: 50%;
            filter: blur(60px);
            will-change: transform, opacity;
          }
        `}</style>

        {/* ---- ANIMATED CRYPTO BACKGROUND ---- */}
        <div className="bg-layer">
          {/* ambient orbs */}
          <div className="orb" style={{ width: 360, height: 360, top: "-80px",  left: "-80px",   background: "radial-gradient(circle, #eab308 0%, transparent 70%)", animation: "orbPulse 9s ease-in-out infinite" }} />
          <div className="orb" style={{ width: 320, height: 320, top: "40%",    right: "-100px", background: "radial-gradient(circle, #10b981 0%, transparent 70%)", animation: "orbPulse 11s ease-in-out infinite 2s" }} />
          <div className="orb" style={{ width: 280, height: 280, bottom: "-60px", left: "30%",   background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", animation: "orbPulse 13s ease-in-out infinite 4s" }} />

          {/* perspective grid */}
          <div className="bg-grid" />

          {/* candlestick far-background */}
          <div className="bg-candles">
            {Array.from({ length: 80 }).map((_, i) => {
              const up = Math.random() > 0.45;
              const h = 20 + Math.random() * 140;
              return <span key={i} className={`candle ${up ? "up" : "down"}`} style={{ height: h }} />;
            })}
          </div>

          {/* floating crypto glyphs */}
          <span className="glyph" style={{ top: "8%",  left: "6%",  fontSize: 120, animation: "floatA 14s ease-in-out infinite" }}>₿</span>
          <span className="glyph" style={{ top: "18%", right: "8%", fontSize: 90,  animation: "floatB 17s ease-in-out infinite 1s" }}>Ξ</span>
          <span className="glyph" style={{ top: "42%", left: "10%", fontSize: 70,  animation: "floatC 15s ease-in-out infinite 3s" }}>◎</span>
          <span className="glyph" style={{ top: "55%", right: "5%", fontSize: 100, animation: "floatA 18s ease-in-out infinite 2s" }}>⟠</span>
          <span className="glyph" style={{ top: "72%", left: "8%",  fontSize: 80,  animation: "floatB 16s ease-in-out infinite 4s" }}>Ð</span>
          <span className="glyph" style={{ top: "30%", left: "45%", fontSize: 60,  animation: "floatC 19s ease-in-out infinite 1.5s" }}>Ł</span>
          <span className="glyph" style={{ top: "85%", right: "20%",fontSize: 70,  animation: "floatA 15s ease-in-out infinite 5s" }}>₮</span>
          <span className="glyph" style={{ top: "62%", left: "55%", fontSize: 50,  animation: "floatB 20s ease-in-out infinite 3s" }}>◆</span>

          {/* rising particles */}
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              className="particle"
              style={{
                left: `${(i * 4.7) % 100}%`,
                animation: `riseParticle ${12 + (i % 7) * 2}s linear infinite`,
                animationDelay: `${(i * 0.8) % 14}s`,
              }}
            />
          ))}
        </div>


        {/* HEADER */}
        <header className="relative z-30 px-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center gold-grad shadow-[0_0_30px_rgba(234,179,8,0.35)]">
              <Zap size={20} className="text-black" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <div className="text-[10px] tracking-[0.28em] text-neutral-500 font-semibold">{t.brand_top}</div>
              <div className="text-[15px] font-extrabold tracking-wide gold-text">{t.brand_bottom}</div>
            </div>
            <div className="flex items-center gap-2 relative">
              <span className="text-[10px] px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold tracking-widest">
                {t.status}
              </span>
              <button
                onClick={() => setLangOpen(v => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:border-yellow-500/30 transition"
              >
                <span className="text-base leading-none">{lang === "ru" ? "🇷🇺" : "🇬🇧"}</span>
                <span className="text-[10px] font-bold text-neutral-300 uppercase">{lang}</span>
                <ChevronDown size={10} className={`text-neutral-500 transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>

              {langOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setLangOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 z-40 w-52 rounded-xl glass p-2 fade-in shadow-2xl">
                    <div className="px-2 py-1 text-[9px] tracking-[0.25em] text-neutral-500 font-bold uppercase">
                      {t.lang_title}
                    </div>
                    {[
                      { code: "ru", flag: "🇷🇺", name: t.lang_ru },
                      { code: "en", flag: "🇬🇧", name: t.lang_en },
                    ].map(o => (
                      <button
                        key={o.code}
                        onClick={() => { setLang(o.code); setLangOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                          lang === o.code ? "bg-yellow-500/15 text-yellow-400" : "hover:bg-white/5 text-neutral-200"
                        }`}
                      >
                        <span className="text-xl leading-none">{o.flag}</span>
                        <span className="text-sm font-semibold flex-1">{o.name}</span>
                        {lang === o.code && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.search}
              className="w-full bg-neutral-900/70 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-yellow-500/40"
            />
          </div>
        </header>

        {/* TICKER */}
        <div className="relative z-10 mt-3 overflow-hidden border-y border-white/5 bg-black/40">
          <div className="flex ticker-track whitespace-nowrap py-2">
            {(() => {
              // Динамический тикер: берём live-цены если есть, иначе fallback
              const tickerPairs = [
                { s: "BTC/USDT", fallback: "68240.12", y: "89%", digits: 2 },
                { s: "ETH/USDT", fallback: "3421.55",  y: "86%", digits: 2 },
                { s: "SOL/USDT", fallback: "178.22",   y: "84%", digits: 2 },
                { s: "EUR/USD",  fallback: "1.08412",  y: "87%", digits: 5 },
                { s: "GBP/JPY",  fallback: "198.430",  y: "71%", digits: 3 },
                { s: "USD/JPY",  fallback: "151.22",   y: "85%", digits: 3 },
                { s: "XAU/USD",  fallback: "2651.40",  y: "91%", digits: 2 },
              ];
              const items = tickerPairs.map(tp => ({
                s: tp.s,
                p: livePrices[tp.s]?.price ? livePrices[tp.s].price.toFixed(tp.digits) : tp.fallback,
                y: tp.y,
              }));
              return [...items, ...items].map((it, i) => (
                <div key={i} className="flex items-center gap-2 px-5 shrink-0">
                  <span className="text-[11px] text-neutral-400 font-semibold tracking-wider">{it.s}</span>
                  <span className="text-[11px] mono text-neutral-200">{it.p}</span>
                  <span className="text-[11px] font-bold text-yellow-400">{it.y}</span>
                  <span className="w-1 h-1 rounded-full bg-neutral-700" />
                </div>
              ));
            })()}
          </div>
        </div>

        {gateMode ? (
          <AccessGate
            mode={gateMode}
            t={t}
            error={authState.error}
            tgId={typeof window !== "undefined" ? (window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null) : null}
            onRecheck={recheckAuth}
            onClaim={submitBrokerClaim}
          />
        ) : null}

        {/* ACCORDIONS */}
        {!gateMode && <main className="relative z-10 px-4 mt-5 space-y-3">
          <AccordionBlock
            icon={<BarChart3 size={18} />} title={t.blocks.assets.title}
            count={`${Object.values(ASSETS_BY_CAT).filter(l => l !== ASSETS_BY_CAT.fav).reduce((s,l)=>s+l.length,0)} ${t.assets_count_suffix}`} open={openBlock === "assets"}
            onToggle={() => setOpenBlock(openBlock === "assets" ? null : "assets")}
          >
            <div className="space-y-2 mt-3">
              {CAT_META.map(c => {
                const isOpen = openCat === c.key;
                const list = ASSETS_BY_CAT[c.key] || [];
                return (
                  <div key={c.key} className="rounded-xl bg-neutral-900/60 border border-white/5">
                    <button
                      onClick={() => setOpenCat(isOpen ? null : c.key)}
                      className="w-full flex items-center justify-between px-3 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/15 flex items-center justify-center text-yellow-400">
                          <c.Icon size={15} />
                        </div>
                        <div>
                          <div className="text-sm font-bold">{t.cats[c.key]}</div>
                          <div className="text-[10px] text-neutral-500">{list.length} {t.assets_count_suffix}</div>
                        </div>
                      </div>
                      <ChevronDown size={16} className={`text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-2 pb-2 space-y-1 slide-up">
                        {list
                          .filter(a => !search || a.ticker.toLowerCase().includes(search.toLowerCase()))
                          .map(a => {
                            const asset = withLivePrice(a);
                            return (
                              <AssetRow
                                key={a.ticker + c.key}
                                asset={asset}
                                fav={favs.has(a.ticker)}
                                onFav={() => toggleFav(a.ticker)}
                                onClick={() => analyzeAsset(asset)}
                              />
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </AccordionBlock>

          <AccordionBlock
            icon={<GraduationCap size={18} />} title={t.blocks.edu.title}
            count={t.blocks.edu.sub} open={openBlock === "edu"}
            onToggle={() => setOpenBlock(openBlock === "edu" ? null : "edu")}
          >
            <div className="mt-3">
              <div className="flex gap-2 p-1 rounded-xl bg-black/40 border border-white/5">
                {[
                  { k: "basics", l: t.edu_tabs.basics },
                  { k: "books",  l: t.edu_tabs.books },
                ].map(tab => (
                  <button
                    key={tab.k}
                    onClick={() => setEduTab(tab.k)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                      eduTab === tab.k ? "bg-yellow-500 text-black" : "text-neutral-400"
                    }`}
                  >{tab.l}</button>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                {eduTab === "basics" && t.edu.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setModal({ type: "edu", payload: m })}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-900/60 border border-white/5 hover:border-yellow-500/20 text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-700/10 flex items-center justify-center">
                      <BookOpen size={16} className="text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{m.title}</div>
                      <div className="text-[11px] text-neutral-500 truncate">{m.desc}</div>
                    </div>
                    <ChevronRight size={16} className="text-neutral-600" />
                  </button>
                ))}
                {eduTab === "books" && t.books.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/60 border border-white/5">
                    <div className="w-9 h-12 rounded bg-gradient-to-b from-yellow-600 to-amber-900 flex items-center justify-center">
                      <BookOpen size={14} className="text-black/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{b.title}</div>
                      <div className="text-[11px] text-neutral-500">{b.author}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AccordionBlock>

          <AccordionBlock
            icon={<CalcIcon size={18} />} title={t.blocks.calc.title}
            count={t.blocks.calc.sub} open={openBlock === "calc"}
            onToggle={() => setOpenBlock(openBlock === "calc" ? null : "calc")}
          >
            <CalculatorBlock />
          </AccordionBlock>

          <AccordionBlock
            icon={<Newspaper size={18} />} title={t.blocks.news.title}
            count={t.blocks.news.sub} open={openBlock === "news"}
            onToggle={() => setOpenBlock(openBlock === "news" ? null : "news")}
          >
            <div className="mt-3 rounded-xl overflow-hidden border border-white/5">
              <div className="grid grid-cols-[52px_40px_72px_1fr] text-[10px] uppercase tracking-widest text-neutral-500 px-3 py-2 bg-black/50">
                <div>{t.news_cols.time}</div>
                <div>{t.news_cols.prio}</div>
                <div>{t.news_cols.left}</div>
                <div>{t.news_cols.event}</div>
              </div>
              {NEWS.map((n, i) => (
                <div key={i} className="grid grid-cols-[52px_40px_72px_1fr] items-center px-3 py-3 border-t border-white/5 bg-neutral-900/40">
                  <div className="mono text-xs text-neutral-200">{n.time}</div>
                  <PrioDots level={n.prio} />
                  <div className="text-[11px] text-neutral-400 mono">{t.news_time_fmt(n.leftH, n.leftM)}</div>
                  <div className="text-sm flex items-center gap-2">
                    <span>{n.flag}</span>
                    <span className="font-semibold">{n.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </AccordionBlock>

          <AccordionBlock
            icon={<Activity size={18} />} title={t.blocks.ind.title}
            count={t.blocks.ind.sub} open={openBlock === "ind"}
            onToggle={() => setOpenBlock(openBlock === "ind" ? null : "ind")}
          >
            <div className="mt-3 grid grid-cols-2 gap-2">
              {t.indicators.map((ind, i) => (
                <button
                  key={i}
                  onClick={() => setModal({ type: "indicator", payload: ind })}
                  className="text-left p-3 rounded-xl bg-neutral-900/60 border border-white/5 hover:border-yellow-500/30"
                >
                  <div className="w-8 h-8 mb-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Gauge size={14} className="text-yellow-400" />
                  </div>
                  <div className="text-sm font-bold leading-tight">{ind.name}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{ind.sub}</div>
                </button>
              ))}
            </div>
          </AccordionBlock>
        </main>}

        {/* STICKY ANALYZE BUTTON */}
        {!gateMode && <div className="fixed bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-black via-black/90 to-transparent pt-8">
          <button
            onClick={runAnalysis}
            disabled={!!scan && scan.stage !== "result"}
            className="w-full gold-grad text-black font-extrabold py-4 rounded-2xl tracking-wider text-sm shadow-[0_10px_40px_-10px_rgba(234,179,8,0.7)] active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {scan && scan.stage !== "result"
              ? <><span className="w-4 h-4 rounded-full border-2 border-black border-r-transparent spin-glow" />{t.analyze_loading}</>
              : <><Sparkles size={16} />{t.analyze_market}</>}
          </button>
        </div>}

        {/* MARKET SCAN MODAL — многоэтапная анимация */}
        {scan && (() => {
          const stageLabel =
            scan.stage === "scanning"   ? t.scanning :
            scan.stage === "analyzing"  ? t.analyzing_signal :
            scan.stage === "volatility" ? t.analyzing_volatility :
            scan.stage === "finalizing" ? t.finalizing : "";

          const showCircles = scan.stage === "volatility" || scan.stage === "finalizing";
          const isBuy = scan.direction === "BUY";
          const countdown = scan.validUntil ? Math.max(0, scan.validUntil - now) : 0;
          const totalMs = scan.validUntil && scan.startMs ? scan.validUntil - scan.startMs : 1;
          const progress = totalMs ? Math.max(0, Math.min(100, (countdown / totalMs) * 100)) : 0;
          const mm = String(Math.floor(countdown / 60000)).padStart(2, "0");
          const ss = String(Math.floor((countdown % 60000) / 1000)).padStart(2, "0");

          return (
            <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/75 backdrop-blur-sm" onClick={closeScan}>
              <div onClick={e => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl glass p-5 slide-up max-h-[90vh] overflow-y-auto overflow-hidden">
                {/* Background candles */}
                <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden" style={{ opacity: 0.22 }}>
                  <ScanChartBg />
                </div>

                <button onClick={closeScan} className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                  <X size={14} className="text-rose-400" />
                </button>

                <div className="relative z-10">
                  {/* Top: pair info */}
                  <div className="min-h-[110px] pt-2">
                    {scan.pair ? (
                      <div className="text-center slide-up">
                        <div className="flex justify-center gap-2 mb-3">
                          {scan.pair.flags.map((f, i) => (
                            <div key={i} className="w-11 h-11 rounded-xl bg-neutral-900/80 border border-white/15 flex items-center justify-center text-2xl shadow-lg">
                              {f}
                            </div>
                          ))}
                        </div>
                        <div className="text-2xl font-extrabold tracking-wider">{scan.pair.label}</div>
                        {displayPrice !== null && (
                          <div className="mt-1 flex items-center justify-center gap-3">
                            <span className="text-xl font-extrabold mono text-yellow-400" style={{ textShadow: "0 0 12px rgba(234,179,8,0.4)" }}>
                              {displayPrice.toFixed(scan.pair.digits)}
                            </span>
                            <span className="text-lg font-extrabold mono" style={{ color: "#c084fc" }}>
                              {scan.pair.payout}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {scan.stage === "result" ? (
                    <>
                      {/* Big direction block */}
                      <div
                        className={`mt-4 py-7 rounded-2xl border-2 text-center relative overflow-hidden ${
                          isBuy ? "bg-emerald-500/15 border-emerald-400" : "bg-rose-500/15 border-rose-400"
                        } slide-up`}
                        style={{
                          boxShadow: isBuy
                            ? "0 0 50px rgba(16,185,129,0.5), inset 0 0 60px rgba(16,185,129,0.1)"
                            : "0 0 50px rgba(244,63,94,0.5), inset 0 0 60px rgba(244,63,94,0.1)"
                        }}
                      >
                        <div
                          className={`text-6xl font-black leading-none ${isBuy ? "text-emerald-400" : "text-rose-400"}`}
                          style={{ textShadow: isBuy ? "0 0 20px rgba(16,185,129,0.8)" : "0 0 20px rgba(244,63,94,0.8)" }}
                        >
                          {isBuy ? "↑" : "↓"}
                        </div>
                        <div
                          className={`text-3xl font-black tracking-[0.25em] mt-3 ${isBuy ? "text-emerald-400" : "text-rose-400"}`}
                          style={{ textShadow: isBuy ? "0 0 15px rgba(16,185,129,0.6)" : "0 0 15px rgba(244,63,94,0.6)" }}
                        >
                          {isBuy ? t.buy : t.sell}
                        </div>
                      </div>

                      <div className="mt-4 text-center text-sm font-bold text-neutral-300">{scan.pair.label}</div>

                      {/* Info table */}
                      <div className="mt-3 rounded-xl border border-white/10 overflow-hidden bg-black/50">
                        <InfoRow
                          label={t.market}
                          value={scan.pair.otc ? "OTC" : scan.pair.source === "binance" ? "CRYPTO" : "FX"}
                        />
                        <InfoRow label={t.time_label} value={scan.expiration} />
                        <InfoRow label={t.valid_until} value={`${mm}:${ss}`} hl />
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-white/5">
                        <div
                          className="h-full rounded-full transition-[width] duration-500 ease-linear"
                          style={{
                            width: `${progress}%`,
                            background: "linear-gradient(90deg, #60a5fa, #c084fc, #f472b6)",
                            boxShadow: "0 0 12px rgba(192,132,252,0.5)"
                          }}
                        />
                      </div>

                      {/* Buttons */}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          onClick={runAnalysis}
                          className="py-3 rounded-xl bg-neutral-800/80 border border-white/10 font-bold text-sm hover:bg-neutral-700 hover:border-yellow-500/30 transition flex items-center justify-center gap-2"
                        >
                          <RotateCcw size={14} /> {t.retry}
                        </button>
                        <button
                          onClick={closeScan}
                          className="py-3 rounded-xl bg-neutral-800/80 border border-white/10 font-bold text-sm hover:bg-neutral-700 transition flex items-center justify-center gap-2"
                        >
                          <ArrowLeft size={14} /> {t.back}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      {/* Radar OR volatility circles */}
                      <div className="flex justify-center">
                        {showCircles ? (
                          <VolatilityCircles finalizing={scan.stage === "finalizing"} />
                        ) : (
                          <RadarIcon />
                        )}
                      </div>

                      {/* Status text */}
                      <div
                        className={`mt-6 text-xs tracking-[0.3em] font-bold ${
                          scan.stage === "finalizing" ? "text-yellow-400" : "text-neutral-300"
                        }`}
                        style={scan.stage === "finalizing" ? { textShadow: "0 0 10px rgba(234,179,8,0.5)" } : undefined}
                      >
                        {stageLabel}
                      </div>

                      {/* Expiration pill (appears from stage analyzing onward) */}
                      {scan.expiration && (scan.stage === "analyzing" || scan.stage === "volatility" || scan.stage === "finalizing") && (
                        <div className="mt-5 inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 slide-up" style={{ boxShadow: "0 0 20px rgba(16,185,129,0.25)" }}>
                          <span className="text-[9px] tracking-[0.25em] text-emerald-400/70 font-bold uppercase">{t.expiration}</span>
                          <span className="text-2xl font-black text-emerald-400 mono">{scan.expiration}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* EDU / INDICATOR MODAL */}
        {modal && (
          <Modal onClose={() => setModal(null)}>
            <div className="text-[10px] tracking-[0.3em] text-yellow-400 font-bold">
              {modal.type === "edu" ? t.tag_edu : t.tag_ind}
            </div>
            <div className="text-xl font-extrabold mt-1">
              {modal.type === "edu" ? modal.payload.title : modal.payload.name}
            </div>
            {modal.type === "indicator" && (
              <div className="text-xs text-neutral-500 mt-0.5">{modal.payload.sub}</div>
            )}

            {modal.type === "indicator" && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3">
                <IndicatorChart kind={modal.payload.svgKey} />
              </div>
            )}

            <div className="mt-4 text-sm leading-relaxed text-neutral-300 space-y-3">
              {modal.type === "edu"
                ? modal.payload.body.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)
                : <p>{modal.payload.body}</p>}
            </div>
          </Modal>
        )}

        {/* ASSET SIGNAL MODAL */}
        {assetSignal && (
          <Modal onClose={() => setAssetSignal(null)}>
            {assetSignal.loading ? (
              <div className="py-10 text-center">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-yellow-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-yellow-400 border-r-transparent border-b-transparent spin-glow" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={22} className="text-yellow-400" />
                  </div>
                </div>
                <div className="mt-5 text-[10px] tracking-[0.3em] text-yellow-400 font-bold">{t.tag_asset_analysis}</div>
                <div className="text-xl font-extrabold mt-1">{assetSignal.asset.ticker}</div>
                <div className="mt-3 text-[11px] text-neutral-500">{t.processing}</div>
                <div className="mt-4 space-y-1 text-[10px] text-neutral-600 mono">
                  <div>{t.step_volatility}</div>
                  <div>{t.step_rsi}</div>
                  <div>{t.step_patterns}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-1">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="relative w-11 h-10 flex items-center justify-center">
                    <AssetIcon asset={assetSignal.asset} />
                  </div>
                  <div className="text-[10px] tracking-[0.3em] text-yellow-400 font-bold">{t.tag_signal}</div>
                </div>
                <div className="text-2xl font-extrabold">{assetSignal.asset.ticker}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">{t.cat_short[assetSignal.asset.catKey]}</div>

                <div className={`mt-5 py-5 rounded-2xl border ${
                  assetSignal.result.isUp
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-rose-500/10 border-rose-500/30"
                }`}>
                  <div className={`text-5xl font-black ${assetSignal.result.isUp ? "text-emerald-400" : "text-rose-400"}`}>
                    {assetSignal.result.isUp ? "⬆" : "⬇"}
                  </div>
                  <div className={`text-2xl font-extrabold tracking-widest mt-2 ${
                    assetSignal.result.isUp ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {assetSignal.result.isUp ? t.dir_up : t.dir_down}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Stat label={t.probability} value={`${assetSignal.result.prob}%`} hl />
                  <Stat label={t.expiration}  value={assetSignal.result.time} />
                  <Stat label={t.entry}       value={assetSignal.result.entry} />
                  <Stat label={t.target}      value={assetSignal.result.target} />
                </div>

                <button
                  onClick={() => setAssetSignal(null)}
                  className="mt-5 w-full gold-grad text-black font-extrabold py-3 rounded-xl tracking-wider text-sm"
                >
                  {t.accept_signal}
                </button>
              </div>
            )}
          </Modal>
        )}
      </div>
    </LangCtx.Provider>
  );
}

/* ────────────────────────── COMPONENTS ────────────────────────── */

function AccordionBlock({ icon, title, count, open, onToggle, children }) {
  return (
    <section className={`rounded-2xl border transition-colors ${open ? "border-yellow-500/25 bg-neutral-900/50" : "border-white/5 bg-neutral-900/40"} hairline`}>
      <button onClick={onToggle} className="w-full px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-800/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
          {icon}
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-extrabold tracking-wider">{title}</div>
          <div className="text-[10px] text-neutral-500">{count}</div>
        </div>
        <ChevronDown size={18} className={`text-neutral-400 transition-transform ${open ? "rotate-180 text-yellow-400" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 slide-up">{children}</div>}
    </section>
  );
}

function CommodityIcon({ type }) {
  // Используем градиентные круги + inline SVG-символы
  const cfg = {
    gold: {
      bg: "radial-gradient(circle at 30% 30%, #fde047 0%, #eab308 60%, #854d0e 100%)",
      ring: "rgba(250,204,21,0.5)",
      symbol: <text x="12" y="17" textAnchor="middle" fontSize="11" fontWeight="900" fill="#422006">Au</text>,
    },
    silver: {
      bg: "radial-gradient(circle at 30% 30%, #f1f5f9 0%, #94a3b8 60%, #475569 100%)",
      ring: "rgba(203,213,225,0.5)",
      symbol: <text x="12" y="17" textAnchor="middle" fontSize="11" fontWeight="900" fill="#1e293b">Ag</text>,
    },
    platinum: {
      bg: "radial-gradient(circle at 30% 30%, #f1f5f9 0%, #cbd5e1 60%, #64748b 100%)",
      ring: "rgba(226,232,240,0.6)",
      symbol: <text x="12" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1e293b">Pt</text>,
    },
    palladium: {
      bg: "radial-gradient(circle at 30% 30%, #e0e7ff 0%, #a5b4fc 60%, #4338ca 100%)",
      ring: "rgba(165,180,252,0.5)",
      symbol: <text x="12" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1e1b4b">Pd</text>,
    },
    copper: {
      bg: "radial-gradient(circle at 30% 30%, #fed7aa 0%, #ea580c 60%, #7c2d12 100%)",
      ring: "rgba(251,146,60,0.5)",
      symbol: <text x="12" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill="#431407">Cu</text>,
    },
    oil: {
      bg: "radial-gradient(circle at 30% 30%, #525252 0%, #171717 60%, #000 100%)",
      ring: "rgba(82,82,82,0.5)",
      symbol: (
        <>
          {/* бочка */}
          <rect x="7" y="6" width="10" height="12" rx="1" fill="#1a1a1a" stroke="#525252" strokeWidth="0.5" />
          <line x1="7" y1="10" x2="17" y2="10" stroke="#737373" strokeWidth="0.4" />
          <line x1="7" y1="14" x2="17" y2="14" stroke="#737373" strokeWidth="0.4" />
          <text x="12" y="14.5" textAnchor="middle" fontSize="3.5" fontWeight="900" fill="#fbbf24">OIL</text>
        </>
      ),
    },
    gas: {
      bg: "radial-gradient(circle at 30% 30%, #fde68a 0%, #f59e0b 60%, #b45309 100%)",
      ring: "rgba(251,191,36,0.5)",
      symbol: (
        <path d="M12 5 Q8 10 10 14 Q12 12 12 14 Q14 10 12 5 Z" fill="#fff" opacity="0.95" />
      ),
    },
    coffee: {
      bg: "radial-gradient(circle at 30% 30%, #a16207 0%, #713f12 60%, #422006 100%)",
      ring: "rgba(161,98,7,0.5)",
      symbol: (
        <>
          <rect x="7" y="9" width="9" height="7" rx="0.5" fill="#fff" opacity="0.9" />
          <path d="M16 10 Q18 10 18 12 T16 14" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.9" />
          <path d="M9 6 Q10 7 9.5 8.5 M11 5.5 Q12 7 11.5 8.5 M13 6 Q14 7 13.5 8.5" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.7" />
        </>
      ),
    },
  };
  const c = cfg[type] || cfg.gold;
  return (
    <div
      className="w-9 h-9 rounded-full shadow-inner flex items-center justify-center"
      style={{ background: c.bg, boxShadow: `0 0 12px ${c.ring}, inset 0 0 6px rgba(0,0,0,0.3)` }}
    >
      <svg viewBox="0 0 24 24" width="26" height="26">
        {c.symbol}
      </svg>
    </div>
  );
}

// Красивый fallback для акций: первая буква на градиенте фирменного цвета
function StockLetterIcon({ ticker, brandColor }) {
  const letter = ticker.charAt(0);
  const bg = brandColor || "#525252";
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm shadow"
      style={{
        background: `linear-gradient(135deg, ${bg} 0%, ${bg}dd 100%)`,
        boxShadow: `0 2px 8px ${bg}40, inset 0 1px 0 rgba(255,255,255,0.15)`,
      }}
    >
      {letter}
    </div>
  );
}

// Универсальная иконка актива — выбирает правильный тип рендера и обрабатывает ошибки загрузки.
function AssetIcon({ asset }) {
  const [imgError, setImgError] = useState(false);

  // 1) Два флага (FX / OTC)
  if (asset.flagUrls && asset.flagUrls.length >= 2) {
    return (
      <>
        {asset.flagUrls.map((url, i) => (
          <div
            key={i}
            className="absolute w-7 h-7 rounded-full bg-neutral-800 border border-white/20 overflow-hidden shadow"
            style={{ left: i === 0 ? 0 : 14, top: i === 0 ? 0 : 8, zIndex: 2 - i }}
          >
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        ))}
      </>
    );
  }

  // 2) Одиночная картинка (крипта / акции / индексы с одним флагом)
  if (asset.iconUrl && !imgError) {
    return (
      <img
        src={asset.iconUrl}
        alt={asset.ticker}
        className="w-9 h-9 rounded-full bg-white object-contain shadow"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  // 3) Кастомная SVG (сырьё)
  if (asset.customIcon) {
    return <CommodityIcon type={asset.customIcon} />;
  }

  // 4) Fallback — для акций красивая буква, для остальных эмодзи
  if (asset.catKey === "stocks") {
    return <StockLetterIcon ticker={asset.ticker} brandColor={asset.brandColor} />;
  }

  return (
    <>
      {(asset.flags || []).map((f, i) => (
        <div
          key={i}
          className="absolute w-7 h-7 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-sm"
          style={{ left: i === 0 ? 0 : 14, top: i === 0 ? 0 : 10, zIndex: 2 - i }}
        >{f}</div>
      ))}
    </>
  );
}

function AssetRow({ asset, fav, onFav, onClick }) {
  const { t } = useT();
  const up = asset.change >= 0;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 active:bg-yellow-500/10 transition text-left group"
    >
      <div className="relative w-11 h-10 shrink-0 flex items-center justify-center">
        <AssetIcon asset={asset} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate group-hover:text-yellow-400 transition-colors">{asset.ticker}</div>
        <div className="text-[10px] text-neutral-500 truncate">
          {t.cat_short[asset.catKey]} · <span className="text-yellow-400 font-semibold">{asset.yield}%</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm mono font-semibold">
          {typeof asset.price === "number"
            ? asset.price.toFixed(asset.digits ?? (asset.price < 0.001 ? 8 : asset.price < 1 ? 5 : asset.price < 100 ? 3 : 2))
            : asset.price}
        </div>
        <div className={`text-[10px] mono font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
          {up ? "+" : ""}{fmt(asset.change, 2)}%
        </div>
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onFav(); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onFav(); } }}
        className="p-1 shrink-0 cursor-pointer"
      >
        <Star size={16} className={fav ? "text-yellow-400 fill-yellow-400" : "text-neutral-600"} />
      </span>
    </button>
  );
}

function PrioDots({ level }) {
  const colors = level === "high" ? ["bg-red-500","bg-red-500","bg-red-500"]
               : level === "mid"  ? ["bg-yellow-400","bg-yellow-400","bg-neutral-700"]
               :                    ["bg-neutral-600","bg-neutral-700","bg-neutral-700"];
  return (
    <div className="flex gap-0.5">
      {colors.map((c, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${c}`} />)}
    </div>
  );
}

function Stat({ label, value, hl }) {
  return (
    <div className={`px-4 py-3 rounded-xl border ${hl ? "border-yellow-500/30 bg-yellow-500/5" : "border-white/10 bg-black/40"}`}>
      <div className="text-[10px] tracking-widest text-neutral-500">{label}</div>
      <div className={`text-lg font-extrabold mono ${hl ? "text-yellow-400" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl glass p-5 slide-up max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ────────────────────────── ACCESS GATE ────────────────────────── */

function AccessGate({ mode, t, error, tgId, onRecheck, onClaim }) {
  const [uid, setUid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Добавляем к реф-ссылке sub_id1 с telegram ID (как требует Pocket Partners),
  // а также дублируем в sub_id и click_id на случай разных конфигураций постбека.
  // Backend webhook ловит любой из этих вариантов.
  const brokerHref = tgId
    ? (BROKER_URL + (BROKER_URL.includes("?") ? "&" : "?") + `sub_id1=${tgId}&sub_id=${tgId}&click_id=${tgId}`)
    : BROKER_URL;

  const uidValid = /^\d{4,15}$/.test(uid.trim());

  const handleSubmit = async () => {
    if (!uidValid || submitting) return;
    setSubmitError("");
    setSubmitting(true);
    const ok = await onClaim(uid.trim());
    setSubmitting(false);
    if (!ok) setSubmitError(t.gate_broker_submit_err);
  };

  return (
    <div className="relative z-10 px-5 mt-8 pb-24">
      <div className="max-w-md mx-auto rounded-2xl border border-yellow-500/20 bg-neutral-900/70 p-6 slide-up">
        {mode === "loading" && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto rounded-full border-2 border-yellow-500/30 border-t-yellow-400 spin-glow" />
            <div className="mt-4 text-sm text-neutral-400 tracking-wider">{t.gate_loading}</div>
          </div>
        )}

        {mode === "error" && (
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-lg font-bold">{t.gate_error}</div>
            {error && <div className="mt-2 text-xs text-neutral-500 mono">{error}</div>}
            <button onClick={onRecheck} className="mt-5 w-full gold-grad text-black font-extrabold py-3 rounded-xl text-sm">
              {t.gate_retry}
            </button>
          </div>
        )}

        {mode === "channel" && (
          <>
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">📣</div>
              <div className="text-lg font-extrabold">{t.gate_channel_title}</div>
              <div className="mt-2 text-sm text-neutral-400 leading-relaxed">{t.gate_channel_desc}</div>
            </div>
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center gold-grad text-black font-extrabold py-3 rounded-xl text-sm mb-2"
            >
              {t.gate_channel_btn}
            </a>
            <button
              onClick={onRecheck}
              className="w-full py-3 rounded-xl bg-neutral-800 border border-white/10 font-bold text-sm hover:bg-neutral-700"
            >
              {t.gate_check_btn}
            </button>
          </>
        )}

        {mode === "broker" && (
          <>
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">🏦</div>
              <div className="text-lg font-extrabold">{t.gate_broker_title}</div>
              <div className="mt-2 text-sm text-neutral-400 leading-relaxed">{t.gate_broker_desc}</div>
            </div>
            <div className="space-y-2 mb-4 text-xs text-neutral-400">
              <div className="flex items-center gap-2"><span className="text-yellow-400">→</span> {t.gate_broker_step1}</div>
              <div className="flex items-center gap-2"><span className="text-yellow-400">→</span> {t.gate_broker_step2}</div>
              <div className="flex items-center gap-2"><span className="text-yellow-400">→</span> {t.gate_broker_step3}</div>
            </div>
            <a
              href={brokerHref}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center gold-grad text-black font-extrabold py-3 rounded-xl text-sm mb-3"
            >
              {t.gate_broker_btn_register}
            </a>
            <input
              type="text"
              inputMode="numeric"
              value={uid}
              onChange={e => { setUid(e.target.value.replace(/\D/g, "").slice(0, 15)); setSubmitError(""); }}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
              placeholder={t.gate_broker_uid_placeholder}
              className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-sm mono font-bold focus:outline-none mb-1 ${
                uid && !uidValid ? "border-rose-500/50 focus:border-rose-500" : "border-white/10 focus:border-yellow-500/40"
              }`}
            />
            <div className="text-[10px] text-neutral-500 mb-2 px-1">
              {uid && !uidValid ? t.gate_broker_uid_hint_err : t.gate_broker_uid_hint}
            </div>
            {submitError && (
              <div className="text-xs text-rose-400 mb-2 px-1">{submitError}</div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!uidValid || submitting}
              className="w-full py-3 rounded-xl bg-neutral-800 border border-white/10 font-bold text-sm hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "..." : t.gate_broker_submit}
            </button>
          </>
        )}

        {mode === "broker_pending" && (
          <div className="text-center">
            <div className="text-5xl mb-2">⏳</div>
            <div className="text-lg font-extrabold">{t.gate_broker_pending_title}</div>
            <div className="mt-2 text-sm text-neutral-400 leading-relaxed">{t.gate_broker_pending_desc}</div>
            <button
              onClick={onRecheck}
              className="mt-5 w-full py-3 rounded-xl bg-neutral-800 border border-white/10 font-bold text-sm hover:bg-neutral-700"
            >
              {t.gate_retry}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── SCAN MODAL COMPONENTS ────────────────────────── */

function RadarIcon() {
  return (
    <div className="relative w-28 h-28">
      {/* pinging outer ring */}
      <div
        className="absolute inset-0 rounded-full border-2 border-yellow-500/30"
        style={{ animation: "ping-slow 2.2s cubic-bezier(0,0,0.2,1) infinite" }}
      />
      {/* concentric rings */}
      <div className="absolute inset-3 rounded-full border border-yellow-500/25" />
      <div className="absolute inset-6 rounded-full border border-yellow-500/20" />
      {/* center dish */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-neutral-950/80 border border-yellow-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.4)]">
          <SatelliteDish size={22} className="text-yellow-300" strokeWidth={2} />
        </div>
      </div>
      <style>{`
        @keyframes ping-slow {
          0%   { transform: scale(1);   opacity: 0.8 }
          80%  { transform: scale(1.6); opacity: 0   }
          100% { transform: scale(1.6); opacity: 0   }
        }
      `}</style>
    </div>
  );
}

function VolatilityCircles({ finalizing }) {
  const color1 = finalizing ? "#eab308" : "#fb923c";
  const color2 = finalizing ? "#fde047" : "#f43f5e";
  const glow1  = finalizing ? "rgba(234,179,8,0.55)" : "rgba(251,146,60,0.5)";
  const glow2  = finalizing ? "rgba(253,224,71,0.55)" : "rgba(244,63,94,0.5)";
  return (
    <div className="relative w-36 h-24">
      <div
        className="absolute w-20 h-20 rounded-full border-2"
        style={{
          left: 8, top: 2,
          borderColor: color1,
          boxShadow: `0 0 25px ${glow1}, inset 0 0 15px ${glow1}`,
          animation: "vol-breathe 1.8s ease-in-out infinite"
        }}
      />
      <div
        className="absolute w-20 h-20 rounded-full border-2"
        style={{
          right: 8, bottom: 2,
          borderColor: color2,
          boxShadow: `0 0 25px ${glow2}, inset 0 0 15px ${glow2}`,
          animation: "vol-breathe 1.8s ease-in-out infinite",
          animationDelay: "0.6s"
        }}
      />
      <style>{`
        @keyframes vol-breathe {
          0%,100% { transform: scale(0.92); opacity: 0.75 }
          50%     { transform: scale(1.05); opacity: 1 }
        }
      `}</style>
    </div>
  );
}

function ScanChartBg() {
  // Генерим случайный свечной график один раз на время жизни модалки
  const candles = useMemo(() => {
    let y = 100;
    const out = [];
    for (let i = 0; i < 26; i++) {
      const up = Math.random() > 0.45;
      const range = 8 + Math.random() * 14;
      const open = y;
      y += (up ? -1 : 1) * (4 + Math.random() * 8);
      const close = y;
      const high = Math.min(open, close) - Math.random() * 8;
      const low  = Math.max(open, close) + Math.random() * 8;
      out.push({ x: i * 15 + 10, up, open, close, high, low });
    }
    return out;
  }, []);

  // Тонкая линия тренда поверх свечей
  const trendPath = useMemo(() => {
    const pts = candles.map(c => `${c.x},${(c.open + c.close) / 2}`);
    return "M" + pts.join(" L");
  }, [candles]);

  return (
    <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      {candles.map((c, i) => (
        <g key={i}>
          <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={c.up ? "#10b981" : "#f43f5e"} strokeWidth="1" />
          <rect
            x={c.x - 3}
            y={Math.min(c.open, c.close)}
            width="6"
            height={Math.max(1, Math.abs(c.open - c.close))}
            fill={c.up ? "#10b981" : "#f43f5e"}
          />
        </g>
      ))}
      <path d={trendPath} stroke="#10b981" strokeWidth="1.2" fill="none" opacity="0.6" />
    </svg>
  );
}

function InfoRow({ label, value, hl }) {
  return (
    <div className="grid grid-cols-2 px-4 py-3 border-b border-white/5 last:border-b-0">
      <div className="text-[10px] tracking-widest text-neutral-500 font-bold uppercase flex items-center">{label}</div>
      <div className={`text-right font-extrabold mono text-base ${hl ? "text-yellow-400" : "text-neutral-100"}`} style={hl ? { textShadow: "0 0 10px rgba(234,179,8,0.4)" } : undefined}>
        {value}
      </div>
    </div>
  );
}

/* ────────────────────────── INDICATOR CHARTS (SVG) ────────────────────────── */

function IndicatorChart({ kind }) {
  const charts = {
    bollinger: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <defs>
          <linearGradient id="bb-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d="M0,25 C60,18 120,30 180,20 C240,14 270,26 300,22 L300,95 C270,90 240,100 180,96 C120,90 60,102 0,96 Z" fill="url(#bb-fill)" />
        <path d="M0,25 C60,18 120,30 180,20 C240,14 270,26 300,22" stroke="#eab308" strokeWidth="1" fill="none" strokeDasharray="3 3" opacity="0.7" />
        <path d="M0,60 C60,56 120,64 180,58 C240,52 270,64 300,60" stroke="#eab308" strokeWidth="1.5" fill="none" />
        <path d="M0,95 C60,90 120,100 180,96 C240,90 270,100 300,96" stroke="#eab308" strokeWidth="1" fill="none" strokeDasharray="3 3" opacity="0.7" />
        <path d="M0,55 L25,65 L50,50 L75,70 L100,45 L125,60 L150,75 L175,55 L200,40 L225,65 L250,50 L275,70 L300,55" stroke="#fff" strokeWidth="1.5" fill="none" />
        <text x="6" y="14" fill="#eab308" fontSize="9" fontFamily="monospace">SMA+2σ</text>
        <text x="6" y="116" fill="#eab308" fontSize="9" fontFamily="monospace">SMA−2σ</text>
      </svg>
    ),
    macd: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <line x1="0" y1="60" x2="300" y2="60" stroke="#444" strokeDasharray="2 3" />
        {[15, 35, 55, 75, 95, 115, 135, 155, 175, 195, 215, 235, 255, 275].map((x, i) => {
          const h = [14, 22, 18, 8, -6, -18, -22, -12, 4, 16, 24, 20, 10, 2][i];
          return <rect key={i} x={x} y={h >= 0 ? 60 - h : 60} width="10" height={Math.abs(h)} fill={h >= 0 ? "#10b981" : "#f43f5e"} opacity="0.55" />;
        })}
        <path d="M0,70 C40,60 80,35 120,40 C160,48 200,80 240,75 C270,70 290,55 300,50" stroke="#eab308" strokeWidth="2" fill="none" />
        <path d="M0,65 C40,58 80,45 120,48 C160,52 200,70 240,68 C270,66 290,58 300,55" stroke="#60a5fa" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
        <circle cx="122" cy="44" r="4" fill="none" stroke="#10b981" strokeWidth="1.5" />
        <text x="130" y="36" fill="#10b981" fontSize="9" fontFamily="monospace">cross↑</text>
        <text x="6" y="14" fill="#eab308" fontSize="9" fontFamily="monospace">MACD</text>
        <text x="6" y="26" fill="#60a5fa" fontSize="9" fontFamily="monospace">Signal</text>
      </svg>
    ),
    stochastic: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="0" y="0"  width="300" height="24" fill="#f43f5e" opacity="0.08" />
        <rect x="0" y="96" width="300" height="24" fill="#10b981" opacity="0.08" />
        <line x1="0" y1="24" x2="300" y2="24" stroke="#f43f5e" strokeDasharray="3 3" opacity="0.6" />
        <line x1="0" y1="96" x2="300" y2="96" stroke="#10b981" strokeDasharray="3 3" opacity="0.6" />
        <path d="M0,60 C30,20 60,10 90,30 C120,60 150,100 180,105 C210,95 240,60 270,30 C285,20 300,25 300,40" stroke="#eab308" strokeWidth="2" fill="none" />
        <path d="M0,70 C30,40 60,30 90,40 C120,65 150,95 180,100 C210,90 240,65 270,45 C285,35 300,40 300,50" stroke="#60a5fa" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
        <text x="6" y="16" fill="#f43f5e" fontSize="9" fontFamily="monospace">80 overbought</text>
        <text x="6" y="114" fill="#10b981" fontSize="9" fontFamily="monospace">20 oversold</text>
      </svg>
    ),
    adx: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <line x1="0" y1="70" x2="300" y2="70" stroke="#eab308" strokeDasharray="3 3" opacity="0.7" />
        <text x="240" y="65" fill="#eab308" fontSize="9" fontFamily="monospace">ADX=25</text>
        <path d="M0,100 C40,95 80,90 120,60 C160,35 200,30 240,40 C270,50 290,70 300,85" stroke="#eab308" strokeWidth="2" fill="none" />
        <path d="M0,80 C40,70 80,50 120,55 C160,65 200,80 240,90 C270,95 290,90 300,85" stroke="#10b981" strokeWidth="1.5" fill="none" />
        <path d="M0,90 C40,85 80,95 120,92 C160,85 200,75 240,65 C270,55 290,60 300,70" stroke="#f43f5e" strokeWidth="1.5" fill="none" />
        <text x="6" y="14" fill="#eab308" fontSize="9" fontFamily="monospace">ADX</text>
        <text x="40" y="14" fill="#10b981" fontSize="9" fontFamily="monospace">+DI</text>
        <text x="70" y="14" fill="#f43f5e" fontSize="9" fontFamily="monospace">−DI</text>
      </svg>
    ),
    fractals: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        {[
          { x: 20, o: 70, c: 50, h: 45, l: 75, up: true },
          { x: 50, o: 55, c: 40, h: 30, l: 60, up: true },
          { x: 80, o: 42, c: 25, h: 18, l: 48, up: true, fractalTop: true },
          { x: 110, o: 30, c: 45, h: 25, l: 50, up: false },
          { x: 140, o: 48, c: 60, h: 42, l: 65, up: false },
          { x: 170, o: 62, c: 75, h: 56, l: 90, up: false },
          { x: 200, o: 78, c: 88, h: 70, l: 95, up: false, fractalBot: true },
          { x: 230, o: 85, c: 72, h: 68, l: 90, up: true },
          { x: 260, o: 70, c: 55, h: 50, l: 75, up: true },
        ].map((c, i) => (
          <g key={i}>
            <line x1={c.x + 5} y1={c.h} x2={c.x + 5} y2={c.l} stroke={c.up ? "#10b981" : "#f43f5e"} strokeWidth="1" />
            <rect x={c.x} y={Math.min(c.o, c.c)} width="10" height={Math.abs(c.o - c.c) || 2} fill={c.up ? "#10b981" : "#f43f5e"} />
            {c.fractalTop && <text x={c.x + 5} y={c.h - 4} fill="#eab308" fontSize="12" textAnchor="middle">▼</text>}
            {c.fractalBot && <text x={c.x + 5} y={c.l + 12} fill="#eab308" fontSize="12" textAnchor="middle">▲</text>}
          </g>
        ))}
        <text x="6" y="14" fill="#eab308" fontSize="9" fontFamily="monospace">Fractal highs / lows</text>
      </svg>
    ),
    rsi: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="0" y="0"  width="300" height="36" fill="#f43f5e" opacity="0.08" />
        <rect x="0" y="84" width="300" height="36" fill="#10b981" opacity="0.08" />
        <line x1="0" y1="36" x2="300" y2="36" stroke="#f43f5e" strokeDasharray="3 3" opacity="0.6" />
        <line x1="0" y1="60" x2="300" y2="60" stroke="#555" strokeDasharray="2 4" opacity="0.4" />
        <line x1="0" y1="84" x2="300" y2="84" stroke="#10b981" strokeDasharray="3 3" opacity="0.6" />
        <path d="M0,70 C25,50 50,30 75,28 C100,32 125,55 150,75 C175,95 200,100 225,90 C250,75 275,50 300,45" stroke="#eab308" strokeWidth="2" fill="none" />
        <circle cx="75" cy="28" r="3" fill="#f43f5e" />
        <circle cx="225" cy="90" r="3" fill="#10b981" />
        <text x="6" y="16" fill="#f43f5e" fontSize="9" fontFamily="monospace">70 overbought</text>
        <text x="6" y="114" fill="#10b981" fontSize="9" fontFamily="monospace">30 oversold</text>
      </svg>
    ),
  };
  return charts[kind] || charts.bollinger;
}

/* ────────────────────────── CALCULATOR ────────────────────────── */

function CalculatorBlock() {
  const { t } = useT();
  const c = t.calc;
  const [deposit, setDeposit]   = useState(100);
  const [firstPct, setFirstPct] = useState(1);
  const [coef, setCoef]         = useState(2.2);
  const [steps, setSteps]       = useState(5);
  const [payout, setPayout]     = useState(82);
  const [winrate, setWinrate]   = useState(65);
  const [simulated, setSimulated] = useState(null);

  const { rows, firstBet, totalRisk, riskPct } = useMemo(() => {
    const first = (deposit * firstPct) / 100;
    const rows = [];
    let total = 0;
    for (let i = 0; i < steps; i++) {
      const bet = first * Math.pow(coef, i);
      const profitIfWin = bet * (payout / 100) - total;
      total += bet;
      rows.push({ step: i + 1, bet, profit: profitIfWin });
    }
    return { rows, firstBet: first, totalRisk: total, riskPct: (total / deposit) * 100 };
  }, [deposit, firstPct, coef, steps, payout]);

  const runSim = () => {
    const TRADES = 100;
    let bal = deposit;
    let maxDD = 0;
    let wins = 0, losses = 0, blowups = 0;
    for (let i = 0; i < TRADES; i++) {
      let streakBet = firstBet;
      let cumLoss = 0;
      let resolved = false;
      for (let s = 0; s < steps; s++) {
        if (Math.random() * 100 < winrate) {
          bal += streakBet * (payout / 100) - cumLoss;
          wins++;
          resolved = true;
          break;
        } else {
          cumLoss += streakBet;
          streakBet *= coef;
        }
      }
      if (!resolved) {
        bal -= cumLoss;
        losses++;
        if (bal < 0) { blowups++; bal = 0; break; }
      }
      if (bal < deposit) maxDD = Math.max(maxDD, ((deposit - bal) / deposit) * 100);
    }
    const safeBet =
      winrate >= 70 ? Math.max(0.5, firstPct * 0.8) :
      winrate >= 55 ? Math.max(0.25, firstPct * 0.5) :
      Math.max(0.1, firstPct * 0.25);
    setSimulated({
      finalBal: bal, wins, losses, blowups, maxDD,
      recommendation: blowups > 0
        ? c.rec_bad(winrate, blowups, safeBet.toFixed(2), Math.max(3, steps - 2))
        : c.rec_ok(safeBet.toFixed(2), maxDD.toFixed(1)),
    });
  };

  return (
    <div className="space-y-4 mt-3">
      <div className="grid grid-cols-2 gap-2">
        <NumInput label={c.deposit}   value={deposit}  onChange={setDeposit}  step={10}  min={10} />
        <NumInput label={c.first_pct} value={firstPct} onChange={setFirstPct} step={0.1} min={0.1} />
        <NumInput label={c.coef}      value={coef}     onChange={setCoef}     step={0.1} min={1.1} />
        <NumInput label={c.steps}     value={steps}    onChange={v => setSteps(Math.round(v))} step={1} min={1} max={12} />
        <div className="col-span-2">
          <NumInput label={c.payout}  value={payout}   onChange={setPayout}   step={1}   min={1}  max={100} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={c.first_bet}  value={fmtMoney(firstBet)} />
        <Stat label={c.total_risk} value={fmtMoney(totalRisk)} />
        <Stat label={c.risk_pct}   value={`${fmt(riskPct, 1)}%`} hl={riskPct > 50} />
      </div>

      <div className="rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_1fr] text-[10px] uppercase tracking-widest text-neutral-500 px-3 py-2 bg-black/50">
          <div>{c.col_step}</div><div>{c.col_bet}</div><div>{c.col_profit}</div>
        </div>
        {rows.map(r => (
          <div key={r.step} className="grid grid-cols-[48px_1fr_1fr] px-3 py-2 border-t border-white/5 text-sm mono">
            <div className="text-neutral-500">{r.step}</div>
            <div>{fmtMoney(r.bet)}</div>
            <div className={r.profit >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {r.profit >= 0 ? "+" : ""}{fmtMoney(r.profit)}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-yellow-500/15 bg-yellow-500/[0.03] p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[10px] tracking-[0.25em] text-yellow-400 font-bold">{c.sim_title}</div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <NumInput label={c.winrate} value={winrate} onChange={setWinrate} step={1} min={1} max={99} />
          </div>
          <button
            onClick={runSim}
            className="gold-grad text-black font-extrabold text-xs px-5 rounded-xl tracking-wider shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center gap-1 h-[52px] mt-auto"
          >
            <Play size={12} /> {c.run}
          </button>
        </div>
        {simulated && (
          <div className="mt-3 slide-up">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Stat label={c.balance}  value={fmtMoney(simulated.finalBal)} hl={simulated.finalBal >= deposit} />
              <Stat label={c.wins}     value={simulated.wins} />
              <Stat label={c.blowups}  value={simulated.blowups} />
            </div>
            <div className="p-3 rounded-xl bg-black/50 border border-white/10">
              <div className="text-[10px] tracking-[0.25em] text-yellow-400 font-bold mb-1">{c.recommendation}</div>
              <div className="text-xs text-neutral-300 leading-relaxed">{simulated.recommendation}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NumInput({ label, value, onChange, step = 1, min, max }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-widest text-neutral-500 uppercase">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full mt-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm mono font-bold focus:outline-none focus:border-yellow-500/40"
      />
    </label>
  );
}
