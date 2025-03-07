const func = require('./func');

function top(ctx){
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const data = func.loadData();
  const users = data.chats[chatId]?.users;

  if (users) {
    const topUsers = Object.values(users)
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10)
      .map((user, index) => `${index + 1}. ${user.firstName} ${user.lastName || ''}: ${user.messageCount} сообщений`)
      .join('\n');

    ctx.reply(`🏆 Топ пользователей по сообщениям:\n${topUsers}`);
    func.log(`Пользователь ${ctx.from.id} запросил топ пользователей в чате ${chatId}`, 'command');
  } else {
    ctx.reply('⚠️ В этом чате еще нет пользователей в базе данных.');
    func.log(`В чате ${chatId} нет пользователей в базе данных`, 'error');
  }
  func.incrementUserMessage(chatId, userId);
}

function stats(ctx) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  const data = func.loadData();
  const user = data.chats[chatId]?.users[userId];

  if (user) {
    ctx.reply(`📊 Вы отправили ${user.messageCount} сообщений в этом чате.`);
    func.log(`Пользователь ${userId} запросил статистику в чате ${chatId}`, 'command');
  } else {
    ctx.reply('⚠️ Вы не найдены в базе данных.');
    func.log(`Пользователь ${userId} не найден в базе данных чата ${chatId}`, 'error');
  }
  func.incrementUserMessage(chatId, userId);
}

function info(ctx) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  const data = func.loadData();
  const user = data.chats[chatId]?.users[userId];

  if (user) {
    const infoMessage = `
👤 Информация о вас:
- Имя: ${user.firstName} ${user.lastName || ''}
- Ник: ${user.customNick || '❌ Нет ника'}
- Сообщений: ${user.messageCount}
        `;
    ctx.reply(infoMessage);
    func.log(`Пользователь ${userId} запросил информацию о себе в чате ${chatId}`, 'command');
  } else {
    ctx.reply('⚠️ Вы не найдены в базе данных.');
    func.log(`Пользователь ${userId} не найден в базе данных чата ${chatId}`, 'error');
  }
  func.incrementUserMessage(chatId, userId);
}

function pull(ctx){
  const args = ctx.message.text.split('"').filter(arg => arg.trim() !== '');
  if (args.length < 3) return ctx.reply('⚠️ Укажите вопрос и варианты ответа.');

  const question = args[1];
  const options = args.slice(2);

  ctx.replyWithPoll(question, options);
  func.log(`Создан опрос: ${question}`, 'poll');
}

function help(ctx){
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const helpMessage = `
🆘 Привет! Вот список доступных команд:

➡️ /start - Приветствие и описание бота.
➡️ /setnick <ник> - Установить или изменить свой ник.
➡️ /mynick - Показать свой ник.
➡️ /listnicks - Показать список всех ников пользователей в чате.
➡️ /stats - Показать количество ваших сообщений в этом чате.
➡️ /top - Показать топ пользователей по количеству сообщений.
➡️ /resetnick - Сбросить ваш ник.
➡️ /info - Показать информацию о вас (имя, ник, количество сообщений).
➡️ /help - Показать это сообщение с описанием команд.
➡️ /like - Поставить лайк пользователю.
➡️ /dislike - Поставить дизлайк пользователю.
➡️ /poll - Создать опрос.
    `;

  ctx.reply(helpMessage);
  func.log(`Пользователь ${ctx.from.id} запросил помощь в чате ${ctx.chat.id}`, 'command');
  func.incrementUserMessage(chatId, userId);
}

module.exports = {
  top,
  stats,
  info,
  pull,
  help
}