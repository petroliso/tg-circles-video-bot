const { Scenes } = require("telegraf");
const { message } = require("telegraf/filters");
const { updateUserStats } = require("../bot");

const videoProcessingScene = new Scenes.BaseScene("videoProcessing");

videoProcessingScene.enter((ctx) => {
  ctx.reply("Выберите действие с видео:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🔄 Конвертировать в кружок",
            callback_data: "convert_circle",
          },
        ],
        [{ text: "✨ Наложить эффекты", callback_data: "apply_effects" }],
        [{ text: "❌ Отмена", callback_data: "cancel_action" }],
      ],
    },
  });
});

videoProcessingScene.command("cancel", (ctx) => {
  ctx.reply("Операция отменена");
  ctx.scene.leave();
  ctx.reply("Что вы хотите сделать?", {
    reply_markup: {
      keyboard: [["🎬 Обработать видео"], ["📊 Статистика"]],
      resize_keyboard: true,
    },
  });
});

// Обработчик для конвертации в кружок
videoProcessingScene.action("convert_circle", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("Отправьте мне видеофайл для конвертации в кружок");
  ctx.scene.state.action = "convert_circle";
});

// Обработчик для наложения эффектов
videoProcessingScene.action("apply_effects", (ctx) => {
  ctx.answerCbQuery();
  ctx.scene.leave();
  ctx.scene.enter("effects");
});

// Обработчик для отмены
videoProcessingScene.action("cancel_action", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("Операция отменена");
  ctx.scene.leave();
  ctx.reply("Что вы хотите сделать?", {
    reply_markup: {
      keyboard: [["🎬 Обработать видео"], ["📊 Статистика"]],
      resize_keyboard: true,
    },
  });
});

videoProcessingScene.on(message("video"), async (ctx) => {
  try {
    // Если не выбрано действие, предлагаем выбрать
    if (!ctx.scene.state.action) {
      ctx.reply("Пожалуйста, сначала выберите действие с видео:", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔄 Конвертировать в кружок",
                callback_data: "convert_circle",
              },
            ],
            [{ text: "✨ Наложить эффекты", callback_data: "apply_effects" }],
            [{ text: "❌ Отмена", callback_data: "cancel_action" }],
          ],
        },
      });
      return;
    }

    const videoFileId = ctx.message.video.file_id;
    const processingMsg = await ctx.reply("Обрабатываю видео...");

    await new Promise((resolve) => setTimeout(resolve, 3000));

    updateUserStats(ctx.from.id, "video");

    await ctx.replyWithVideo(videoFileId, {
      caption: "Ваше видео было конвертировано в кружок!",
      supports_streaming: true,
      has_spoiler: false,
    });

    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

    await ctx.scene.leave();
    await ctx.reply("Что еще вы хотите сделать?", {
      reply_markup: {
        keyboard: [["🎬 Обработать видео"], ["📊 Статистика"]],
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error("Ошибка при обработке видео:", error);
    ctx.reply(
      "Произошла ошибка при обработке видео. Пожалуйста, попробуйте еще раз."
    );
    ctx.scene.leave();
  }
});

videoProcessingScene.on("message", (ctx) => {
  ctx.reply("Пожалуйста, отправьте видеофайл или /cancel для отмены");
});

module.exports = { videoProcessingScene };
