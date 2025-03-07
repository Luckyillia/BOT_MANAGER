const fs = require('fs');
const path = require('path');


const log = (message, eventType = '') => {
  const date = new Date().toISOString().split('T')[0];
  const logFileName = `bot_${date}.log`;
  const logFilePath = path.join(__dirname, 'logs', logFileName);

  const logMessage = `[${new Date().toISOString()}] [${eventType}] ${message}`;

  console.log(logMessage);

  // Проверяем, существует ли папка logs, если нет — создаем
  if (!fs.existsSync(path.join(__dirname, 'logs'))) {
    fs.mkdirSync(path.join(__dirname, 'logs'));
  }

  // Записываем лог в файл
  fs.appendFileSync(logFilePath, logMessage + '\n');
};

// Функция загрузки данных
const loadData = () => {
  try {
    return JSON.parse(fs.readFileSync('data.json', 'utf-8'));
  } catch (error) {
    log(`Ошибка при загрузке данных: ${error.message}`, 'error');
    return { chats: {} };
  }
};

// Функция сохранения данных
const saveData = (data) => {
  try {
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  } catch (error) {
    log(`Ошибка при сохранении данных: ${error.message}`, 'error');
  }
};

// Функция добавления нового пользователя
const addUserIfNotExists = (chatId, ctx, nick = "") => {
  let data = loadData();

  if (!data.chats[chatId]) {
    data.chats[chatId] = {
      chatTitle: ctx.chat?.title || 'Без названия',
      users: {}
    };
    log(`Создан новый чат: ${chatId}`, 'chat');
  }

  if (!data.chats[chatId].users[ctx.from.id]) {
    data.chats[chatId].users[ctx.from.id] = {
      firstName: ctx.from.first_name || '',
      lastName: ctx.from.last_name || '',
      username: ctx.from.username || 'Нет ника',
      messageCount: 0,
      customNick: nick,
      status: 'member' // Добавляем статус пользователя
    };
    log(`Добавлен новый пользователь: ${ctx.from.id} в чат ${chatId}`, 'user');
  }

  saveData(data);
};

// Проверка, является ли чат групповым
const isGroupChat = (ctx) => ['group', 'supergroup'].includes(ctx.chat?.type);

// Инкрементация счетчика сообщений пользователя
const incrementUserMessage = (chatId, userId) => {
  try {
    const data = loadData();
    if (data.chats[chatId] && data.chats[chatId].users[userId]) {
      data.chats[chatId].users[userId].messageCount++;
      saveData(data);
      log(`Пользователь ${userId} отправил сообщение в чате ${chatId}`, 'message');
    } else {
      log(`Пользователь ${userId} не найден в базе данных чата ${chatId}`, 'error');
    }
  } catch (error) {
    log(`Ошибка при инкрементировании счетчика пользователя: ${error.message}`, 'error');
  }
};

module.exports = {
  log,
  loadData,
  saveData,
  addUserIfNotExists,
  isGroupChat,
  incrementUserMessage
}