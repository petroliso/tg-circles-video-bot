const { Telegraf, Scenes, session } = require("telegraf");
const { message } = require("telegraf/filters");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const db = {
  users: {},
  totalVideosProcessed: 0,
  totalEffectsApplied: 0,
};

function updateUserStats(userId, action) {
  if (!db.users[userId]) {
    db.users[userId] = {
      processedVideos: 0,
      appliedEffects: 0,
      lastActivity: new Date(),
    };
  }

  if (action === "video") {
    db.users[userId].processedVideos += 1;
    db.totalVideosProcessed += 1;
  } else if (action === "effect") {
    db.users[userId].appliedEffects += 1;
    db.totalEffectsApplied += 1;
  }

  db.users[userId].lastActivity = new Date();
}

module.exports = { bot, db, updateUserStats };

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
  ctx.reply("Пожалуйста, сначала выберите действие из меню");
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
