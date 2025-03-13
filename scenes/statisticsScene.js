const { Scenes } = require("telegraf");
const { db } = require("../bot");

const statisticsScene = new Scenes.BaseScene("statistics");

// Добавляем обработчик команды /cancel в начало
statisticsScene.command("cancel", (ctx) => {
  ctx.reply("Операция отменена");
  ctx.scene.leave();
  ctx.reply("Что вы хотите сделать?", {
    reply_markup: {
      keyboard: [["🎬 Обработать видео"], ["📊 Статистика"]],
      resize_keyboard: true,
    },
  });
});

statisticsScene.enter((ctx) => {
  const userId = ctx.from.id;
  const userData = db.users[userId] || {
    processedVideos: 0,
    appliedEffects: 0,
    lastActivity: "никогда",
  };

  const statsMessage = `
📊 *Ваша статистика*:
  
🎬 Обработано видео: ${userData.processedVideos}
✨ Применено эффектов: ${userData.appliedEffects}
🕒 Последняя активность: ${
    userData.lastActivity instanceof Date
      ? userData.lastActivity.toLocaleString("ru-RU")
      : userData.lastActivity
  }

📈 *Общая статистика*:
🎬 Всего обработано видео: ${db.totalVideosProcessed}
✨ Всего применено эффектов: ${db.totalEffectsApplied}
👥 Всего пользователей: ${Object.keys(db.users).length}
  `;

  ctx.replyWithMarkdown(statsMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Вернуться в главное меню", callback_data: "back_to_main" }],
      ],
    },
  });
});

statisticsScene.action("back_to_main", (ctx) => {
  ctx.answerCbQuery();
  ctx.scene.leave();
  ctx.reply("Что вы хотите сделать?", {
    reply_markup: {
      keyboard: [["🎬 Обработать видео"], ["📊 Статистика"]],
      resize_keyboard: true,
    },
  });
});

statisticsScene.on("message", (ctx) => {
  ctx.reply("Используйте кнопки для навигации");
});

module.exports = { statisticsScene };
