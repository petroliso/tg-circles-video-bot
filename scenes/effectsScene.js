const { Scenes } = require("telegraf");
const { message } = require("telegraf/filters");
const { updateUserStats } = require("../bot");

const effectsScene = new Scenes.BaseScene("effects");

effectsScene.enter((ctx) => {
  ctx.reply("Отправьте мне видео для наложения эффектов");
});

effectsScene.command("cancel", (ctx) => {
  ctx.reply("Операция отменена");
  ctx.scene.leave();
  ctx.reply("Что вы хотите сделать?", {
    reply_markup: {
      keyboard: [["🎬 Обработать видео"], ["📊 Статистика"]],
      resize_keyboard: true,
    },
  });
});

effectsScene.on(message("video"), async (ctx) => {
  try {
    const videoFileId = ctx.message.video.file_id;

    await ctx.reply("Выберите эффект для наложения:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🖼 Белая рамка", callback_data: "effect_frame_white" },
            { text: "🔵 Блюр", callback_data: "effect_blur" },
          ],
          [
            { text: "🔄 Реверс", callback_data: "effect_reverse" },
            { text: "🌈 Цветокоррекция", callback_data: "effect_color" },
          ],
        ],
      },
    });

    ctx.scene.state.videoFileId = videoFileId;
  } catch (error) {
    console.error("Ошибка при получении видео:", error);
    ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
    ctx.scene.leave();
  }
});

effectsScene.action(/effect_(.+)/, async (ctx) => {
  try {
    const effect = ctx.match[1];
    const videoFileId = ctx.scene.state.videoFileId;

    if (!videoFileId) {
      ctx.reply("Видео не найдено. Пожалуйста, отправьте видео снова.");
      return;
    }

    const processingMsg = await ctx.reply(
      `Применяю эффект "${getEffectName(effect)}"...`
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));

    updateUserStats(ctx.from.id, "effect");

    await ctx.replyWithVideo(videoFileId, {
      caption: `Видео с эффектом "${getEffectName(effect)}"`,
      supports_streaming: true,
    });

    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

    await ctx.reply("Хотите применить еще эффекты?", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Да", callback_data: "more_effects" },
            { text: "Нет, вернуться в меню", callback_data: "back_to_main" },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Ошибка при применении эффекта:", error);
    ctx.reply(
      "Произошла ошибка при применении эффекта. Пожалуйста, попробуйте еще раз."
    );
  }
});

effectsScene.action("more_effects", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("Выберите эффект для наложения:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🖼 Белая рамка", callback_data: "effect_frame_white" },
          { text: "🔵 Блюр", callback_data: "effect_blur" },
        ],
        [
          { text: "🔄 Реверс", callback_data: "effect_reverse" },
          { text: "🌈 Цветокоррекция", callback_data: "effect_color" },
        ],
      ],
    },
  });
});

effectsScene.action("back_to_main", (ctx) => {
  ctx.answerCbQuery();
  ctx.scene.leave();
  ctx.reply("Что вы хотите сделать?", {
    reply_markup: {
      keyboard: [["🎬 Обработать видео"], ["📊 Статистика"]],
      resize_keyboard: true,
    },
  });
});

effectsScene.on("message", (ctx) => {
  ctx.reply(
    "Пожалуйста, отправьте видеофайл или используйте кнопки для навигации"
  );
});

function getEffectName(effectCode) {
  const effects = {
    frame_white: "Белая рамка",
    blur: "Блюр",
    reverse: "Реверс",
    color: "Цветокоррекция",
  };

  return effects[effectCode] || "Неизвестный эффект";
}

module.exports = { effectsScene };
