const { Scenes } = require("telegraf");
const { message } = require("telegraf/filters");
const { updateUserStats } = require("../bot");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fetch = require("node-fetch");

// Устанавливаем путь к ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// Создаем временную директорию, если её нет
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

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

    try {
      // Получаем информацию о файле
      const fileInfo = await ctx.telegram.getFile(videoFileId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileInfo.file_path}`;
      
      // Создаем уникальное имя файла
      const timestamp = Date.now();
      const inputPath = path.join(tempDir, `input_${timestamp}.mp4`);
      const outputPath = path.join(tempDir, `output_${timestamp}.mp4`);
      
      // Скачиваем видео
      const response = await fetch(fileUrl);
      const fileStream = fs.createWriteStream(inputPath);
      await new Promise((resolve, reject) => {
        response.body.pipe(fileStream);
        fileStream.on("finish", resolve);
        fileStream.on("error", reject);
      });
      
      // Получаем информацию о видеофайле для отладки
      console.log(`Обработка видео: ${inputPath}`);
      
      // Обрабатываем видео через ffmpeg с более простыми и надежными параметрами
      await new Promise((resolve, reject) => {
        // Используем более простой подход с минимальными параметрами
        const command = ffmpeg(inputPath)
          .size('400x400') // Фиксированный размер для круглого видео
          .videoCodec('libx264')
          .outputFormat('mp4')
          .outputOptions([
            '-pix_fmt yuv420p', // Необходимо для совместимости H.264
            '-preset ultrafast', // Для более быстрой конвертации
            '-r 30',
            '-t 60', // Ограничение в 1 минуту
            '-crf 28' // Качество видео
          ])
          .on('start', (commandLine) => {
            console.log('Команда FFmpeg:', commandLine);
          })
          .on('progress', (progress) => {
            console.log(`Обработка: ${progress.percent ? progress.percent.toFixed(1) + '%' : 'прогресс...'}`);
          })
          .on('end', () => {
            console.log('Видео успешно обработано');
            resolve();
          })
          .on('error', (err, stdout, stderr) => {
            console.error('Ошибка при обработке видео:', err);
            console.error('FFmpeg stderr:', stderr);
            reject(err);
          });
          
        // Сохраняем результат в файл
        command.save(outputPath);
      });
      
      // Отправляем обработанное видео как видеосообщение (кружок)
      await ctx.replyWithVideoNote({
        source: fs.createReadStream(outputPath)
      });
      
      updateUserStats(ctx.from.id, "video");
      
      // Очищаем временные файлы
      setTimeout(() => {
        fs.unlink(inputPath, (err) => {
          if (err) console.error('Ошибка при удалении временного файла:', err);
        });
        fs.unlink(outputPath, (err) => {
          if (err) console.error('Ошибка при удалении временного файла:', err);
        });
      }, 1000);
      
    } catch (error) {
      console.error('Ошибка при обработке видео:', error);
      await ctx.reply('Произошла ошибка при конвертации видео. Пожалуйста, попробуйте другой файл.');
    }
    
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
