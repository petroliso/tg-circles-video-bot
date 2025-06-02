const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Создаем директорию для базы данных, если она не существует
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'statistics.db');
const db = new sqlite3.Database(dbPath);

// Инициализация базы данных
function initDatabase() {
  db.serialize(() => {
    // Таблица пользователей
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица статистики по видео
    db.run(`
      CREATE TABLE IF NOT EXISTS video_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Таблица для итоговой статистики
    db.run(`
      CREATE TABLE IF NOT EXISTS total_stats (
        id INTEGER PRIMARY KEY,
        total_videos_processed INTEGER DEFAULT 0,
        total_effects_applied INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Вставляем запись для общей статистики, если её еще нет
    db.get(`SELECT * FROM total_stats WHERE id = 1`, (err, row) => {
      if (!row) {
        db.run(`INSERT INTO total_stats (id) VALUES (1)`);
      }
    });
  });

  console.log('База данных SQLite инициализирована');
}

// Регистрация пользователя или обновление информации
function ensureUserExists(user) {
  return new Promise((resolve, reject) => {
    const { id, username, first_name, last_name } = user;
    
    db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (!row) {
        // Создаем нового пользователя
        db.run(
          `INSERT INTO users (id, username, first_name, last_name) VALUES (?, ?, ?, ?)`,
          [id, username || '', first_name || '', last_name || ''],
          function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
          }
        );
      } else {
        // Обновляем информацию о пользователе
        db.run(
          `UPDATE users SET username = ?, first_name = ?, last_name = ? WHERE id = ?`,
          [username || '', first_name || '', last_name || '', id],
          function(err) {
            if (err) return reject(err);
            resolve(id);
          }
        );
      }
    });
  });
}

// Обновление статистики пользователя
function updateUserStats(userId, action) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO video_stats (user_id, action) VALUES (?, ?)`,
      [userId, action],
      function(err) {
        if (err) return reject(err);
        
        // Обновляем общую статистику
        const updateTotalQuery = action === 'video' 
          ? `UPDATE total_stats SET total_videos_processed = total_videos_processed + 1, last_updated = CURRENT_TIMESTAMP WHERE id = 1`
          : `UPDATE total_stats SET total_effects_applied = total_effects_applied + 1, last_updated = CURRENT_TIMESTAMP WHERE id = 1`;
        
        db.run(updateTotalQuery, function(err) {
          if (err) return reject(err);
          resolve();
        });
      }
    );
  });
}

// Получение статистики пользователя
function getUserStats(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        COUNT(CASE WHEN action = 'video' THEN 1 END) as processed_videos,
        COUNT(CASE WHEN action = 'effect' THEN 1 END) as applied_effects,
        MAX(created_at) as last_activity
      FROM video_stats 
      WHERE user_id = ?`,
      [userId],
      (err, row) => {
        if (err) return reject(err);
        resolve({
          processedVideos: row ? row.processed_videos || 0 : 0,
          appliedEffects: row ? row.applied_effects || 0 : 0,
          lastActivity: row && row.last_activity ? new Date(row.last_activity) : 'никогда'
        });
      }
    );
  });
}

// Получение общей статистики
function getTotalStats() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM total_stats WHERE id = 1`, (err, totalRow) => {
      if (err) return reject(err);
      
      db.get(`SELECT COUNT(DISTINCT user_id) as total_users FROM video_stats`, (err, usersRow) => {
        if (err) return reject(err);
        
        resolve({
          totalVideosProcessed: totalRow ? totalRow.total_videos_processed : 0,
          totalEffectsApplied: totalRow ? totalRow.total_effects_applied : 0,
          totalUsers: usersRow ? usersRow.total_users : 0
        });
      });
    });
  });
}

// Закрытие базы данных
function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error('Ошибка при закрытии базы данных:', err.message);
    } else {
      console.log('База данных SQLite закрыта');
    }
  });
}

module.exports = {
  initDatabase,
  ensureUserExists,
  updateUserStats,
  getUserStats,
  getTotalStats,
  closeDatabase
};
