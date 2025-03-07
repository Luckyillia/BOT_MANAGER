const func = require('./func');

function start(ctx) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || '';
  const lastName = ctx.from.last_name || '';

  func.addUserIfNotExists(chatId, ctx);
  ctx.reply(`👋 Привет, ${firstName} ${lastName}! Я бот, который помогает управлять группой.`);
  func.log(`Пользователь ${userId} запустил команду /start в чате ${chatId}`, 'command');
  func.incrementUserMessage(chatId, userId);
}

function setNick(ctx) {
  if (!func.isGroupChat(ctx)) {
    func.log(`Пользователь ${ctx.from.id} попытался использовать /setnick не в групповом чате`, 'error');
    return ctx.reply('⚠️ Эта команда доступна только в групповых чатах.');
  }

  const newNick = ctx.message.text.split(' ')[1];

  if (!newNick) {
    func.log(`Пользователь ${ctx.from.id} не указал ник в команде /setnick`, 'error');
    return ctx.reply('⚠️ Пожалуйста, введите ник. Пример: /setnick ВашНик');
  }

  if (newNick.length > 20) {
    func.log(`Пользователь ${ctx.from.id} указал слишком длинный ник: ${newNick}`, 'error');
    return ctx.reply('⚠️ Ник не может быть длиннее 20 символов.');
  }

  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  const data = func.loadData();

  if (data.chats[chatId] && data.chats[chatId].users[userId]) {
    data.chats[chatId].users[userId].customNick = newNick;
    func.saveData(data);
    ctx.reply(`✅ Ваш новый ник успешно установлен: ${newNick}`);
    func.log(`Пользователь ${userId} изменил ник на ${newNick} в чате ${chatId}`, 'command');
  } else {
    func.addUserIfNotExists(chatId, ctx, newNick);
    ctx.reply(`✅ Ваш новый ник успешно установлен: ${newNick}`);
    func.log(`Пользователь ${userId} добавлен с ником ${newNick} в чат ${chatId}`, 'command');
  }
  func.incrementUserMessage(chatId, userId);
}

function myNick(ctx) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  const data = func.loadData();
  const user = data.chats[chatId]?.users[userId];

  if (user) {
    const nick = user.customNick || '❌ У вас пока нет установленного ника.';
    ctx.reply(`👤 Ваш ник: ${nick}`);
    func.log(`Пользователь ${userId} запросил свой ник в чате ${chatId}`, 'command');
  } else {
    ctx.reply('⚠️ Вы не найдены в базе данных.');
    func.log(`Пользователь ${userId} не найден в базе данных чата ${chatId}`, 'error');
  }
  func.incrementUserMessage(chatId, userId);
}

function listNick(ctx){
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const data = func.loadData();
  const users = data.chats[chatId]?.users;

  if (users) {
    const nicks = Object.values(users)
      .map(user => `${user.firstName} ${user.lastName || ''}: ${user.customNick || '❌ Нет ника'}`)
      .join('\n');

    const message = nicks || '⚠️ В этом чате еще нет установленных ников.';
    ctx.reply(message);
    func.log(`Пользователь ${ctx.from.id} запросил список ников в чате ${chatId}`, 'command');
  } else {
    ctx.reply('⚠️ В этом чате еще нет пользователей в базе данных.');
    func.log(`В чате ${chatId} нет пользователей в базе данных`, 'error');
  }
  func.incrementUserMessage(chatId, userId);
}

function resetNick(ctx) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  const data = func.loadData();

  if (data.chats[chatId] && data.chats[chatId].users[userId]) {
    data.chats[chatId].users[userId].customNick = '';
    func.saveData(data);
    ctx.reply('✅ Ваш ник успешно сброшен.');
    func.log(`Пользователь ${userId} сбросил ник в чате ${chatId}`, 'command');
  } else {
    ctx.reply('⚠️ Вы не найдены в базе данных.');
    func.log(`Пользователь ${userId} не найден в базе данных чата ${chatId}`, 'error');
  }
  func.incrementUserMessage(chatId, userId);
}
module.exports = {
  start,
  setNick,
  myNick,
  listNick,
  resetNick
}