const { Telegraf, Scenes, session } = require("telegraf");
const { message } = require("telegraf/filters");
require("dotenv").config();

// Импорт функций для работы с базой данных SQLite
const { 
  initDatabase, 
  ensureUserExists, 
  updateUserStats: dbUpdateUserStats, 
  getUserStats, 
  getTotalStats, 
  closeDatabase 
} = require('./database');

// Инициализируем базу данных при запуске
initDatabase();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Функция обновления статистики пользователя
async function updateUserStats(userId, action) {
  try {
    // Убедимся, что пользователь существует
    await ensureUserExists({ id: userId });
    
    // Обновляем статистику
    await dbUpdateUserStats(userId, action);
  } catch (error) {
    console.error('Ошибка при обновлении статистики:', error);
  }
}

module.exports = { bot, updateUserStats, getUserStats, getTotalStats };

const { videoProcessingScene } = require("./scenes/videoProcessingScene");
const { statisticsScene } = require("./scenes/statisticsScene");
const { effectsScene } = require("./scenes/effectsScene");

const stage = new Scenes.Stage([
  videoProcessingScene,
  statisticsScene,
  effectsScene,
]);
bot.use(session());
bot.use(stage.middleware());

bot.command("start", (ctx) => {
  ctx.reply("Привет! Я бот для обработки видео. Что вы хотите сделать?", {
    reply_markup: {
      keyboard: [["🎬 Обработать видео"], ["📊 Статистика"]],
      resize_keyboard: true,
    },
  });
});

bot.hears("🎬 Обработать видео", (ctx) => ctx.scene.enter("videoProcessing"));
bot.hears("📊 Статистика", (ctx) => ctx.scene.enter("statistics"));
bot.hears("✨ Наложить эффекты", (ctx) => ctx.scene.enter("effects"));

bot.on(message("video"), (ctx) => {
  // Напрямую переходим к обработке видео в режиме конвертации в кружок
  ctx.scene.enter("videoProcessing");
  ctx.scene.state.action = "convert_circle";
});

bot.catch((err, ctx) => {
  console.error(`Ошибка для ${ctx.updateType}`, err);
  ctx.reply(
    "Произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз."
  );
});

if (require.main === module) {
  bot
    .launch()
    .then(() => console.log("Бот запущен!"))
    .catch((err) => console.error("Ошибка при запуске бота:", err));

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
