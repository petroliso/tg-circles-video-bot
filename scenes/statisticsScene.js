const { Scenes } = require("telegraf");
const { getUserStats, getTotalStats } = require("../bot");

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

statisticsScene.enter(async (ctx) => {
  try {
    const userId = ctx.from.id;
    
    // Получаем статистику пользователя из базы данных
    const userData = await getUserStats(userId);
    
    // Получаем общую статистику
    const totalStats = await getTotalStats();
    
    // Форматируем дату последней активности
    const lastActivity = userData.lastActivity instanceof Date
      ? userData.lastActivity.toLocaleString("ru-RU")
      : userData.lastActivity;
    
    const statsMessage = `
📊 *Ваша статистика*:
  
🎬 Обработано видео: ${userData.processedVideos}
✨ Применено эффектов: ${userData.appliedEffects}
🕒 Последняя активность: ${lastActivity}

📈 *Общая статистика*:
🎬 Всего обработано видео: ${totalStats.totalVideosProcessed}
✨ Всего применено эффектов: ${totalStats.totalEffectsApplied}
👥 Всего пользователей: ${totalStats.totalUsers}
  `;

    ctx.replyWithMarkdown(statsMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Вернуться в главное меню", callback_data: "back_to_main" }],
        ],
      },
    });
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    ctx.reply('Произошла ошибка при получении статистики. Пожалуйста, попробуйте позже.');
    ctx.scene.leave();
  }
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

// Обработчик кнопок навигации
statisticsScene.hears("🎬 Обработать видео", (ctx) => {
  ctx.scene.leave();
  ctx.scene.enter("videoProcessing");
});

// Обработчик для всех других сообщений
statisticsScene.on("message", (ctx) => {
  ctx.reply("Используйте кнопки для навигации");
});

module.exports = { statisticsScene };
