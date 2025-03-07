const func = require('./func');
const maxWarns = 3;

const logAction = (action, ctx, userId) => {
  func.log(`${action} Admin ${ctx.from.id} acted on user ${userId} in chat ${ctx.chat.id}`, 'admin_action');
};

const setRole = async (ctx) => {
  const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
  const role = ctx.message.text.split(' ')[2];
  if (!userId || !role) return ctx.reply('⚠️ Укажите пользователя и роль.');

  const data = func.loadData();
  const chatId = ctx.chat.id;

  // Admin check
  const isAdmin = await ctx.chat.getMember(ctx.from.id);
  if (!isAdmin || isAdmin.status !== 'administrator') {
    return ctx.reply("❌ У вас нет прав администратора для выполнения этой команды.");
  }

  if (!data.chats[chatId].users[userId]) {
    return ctx.reply("⚠️ Этот пользователь не найден.");
  }

  // Set the role for the user
  data.chats[chatId].users[userId].role = role;
  func.saveData(data);

  ctx.reply(`✅ Пользователю @${ctx.from.username} назначена роль: ${role}`);
};


const warn = async (ctx) => {
  const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
  if (!userId) return ctx.reply('⚠️ Укажите пользователя.');

  const data = func.loadData();
  const chatId = ctx.chat.id;

  // Admin check
  const isAdmin = await ctx.chat.getMember(ctx.from.id);
  if (!isAdmin || isAdmin.status !== 'administrator') {
    return ctx.reply("❌ У вас нет прав администратора для выполнения этой команды.");
  }

  if (!data.chats[chatId].users[userId]) {
    data.chats[chatId].users[userId] = { warns: 0 }; // Initialize warns if not present
  }

  data.chats[chatId].users[userId].warns++;
  func.saveData(data);

  if (data.chats[chatId].users[userId].warns >= maxWarns) {
    ctx.banChatMember(userId); // Ban the user
    ctx.reply(`⛔ Пользователь @${ctx.from.username} забанен за превышение лимита предупреждений.`);
  } else {
    ctx.reply(`⚠️ Пользователь @${ctx.from.username} получил предупреждение. Всего предупреждений: ${data.chats[chatId].users[userId].warns}`);
  }
};
const unwarn = async (ctx) => {
  const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
  if (!userId) return ctx.reply('⚠️ Укажите пользователя.');

  const data = func.loadData();
  const chatId = ctx.chat.id;

  // Admin check
  const isAdmin = await ctx.chat.getMember(ctx.from.id);
  if (!isAdmin || isAdmin.status !== 'administrator') {
    return ctx.reply("❌ У вас нет прав администратора для выполнения этой команды.");
  }

  if (!data.chats[chatId].users[userId] || data.chats[chatId].users[userId].warns === 0) {
    return ctx.reply("⚠️ У этого пользователя нет предупреждений.");
  }

  data.chats[chatId].users[userId].warns--;
  func.saveData(data);

  ctx.reply(`⚠️ Предупреждение для пользователя @${ctx.from.username} снято. Всего предупреждений: ${data.chats[chatId].users[userId].warns}`);
};
const ban = async (ctx) => {
  const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
  if (!userId) return ctx.reply('⚠️ Укажите пользователя.');

  const data = func.loadData();
  const chatId = ctx.chat.id;

  // Admin check
  const isAdmin = await ctx.chat.getMember(ctx.from.id);
  if (!isAdmin || isAdmin.status !== 'administrator') {
    return ctx.reply("❌ У вас нет прав администратора для выполнения этой команды.");
  }

  if (!data.chats[chatId].users[userId]) {
    data.chats[chatId].users[userId] = { warns: 0 }; // Initialize if user doesn't exist
  }

  // Ban the user
  ctx.banChatMember(userId);
  ctx.reply(`⛔ Пользователь @${ctx.from.username} забанен.`);

  logAction('banned', ctx, userId);
};
const unban = async (ctx) => {
  const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
  if (!userId) return ctx.reply('⚠️ Укажите пользователя.');

  const data = func.loadData();
  const chatId = ctx.chat.id;

  // Admin check
  const isAdmin = await ctx.chat.getMember(ctx.from.id);
  if (!isAdmin || isAdmin.status !== 'administrator') {
    return ctx.reply("❌ У вас нет прав администратора для выполнения этой команды.");
  }

  if (!data.chats[chatId].users[userId]) {
    return ctx.reply("⚠️ Этот пользователь не забанен.");
  }

  // Unban the user
  ctx.unbanChatMember(userId);
  ctx.reply(`✅ Пользователь @${ctx.from.username} разбанен.`);

  logAction('unbanned', ctx, userId);
};
const mute = async (ctx) => {
  const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
  const duration = ctx.message.text.split(' ')[2];
  if (!userId || !duration) return ctx.reply('⚠️ Укажите пользователя и время мута.');

  const data = func.loadData();
  const chatId = ctx.chat.id;

  // Admin check
  const isAdmin = await ctx.chat.getMember(ctx.from.id);
  if (!isAdmin || isAdmin.status !== 'administrator') {
    return ctx.reply("❌ У вас нет прав администратора для выполнения этой команды.");
  }

  if (!data.chats[chatId].users[userId]) {
    return ctx.reply("⚠️ Этот пользователь не найден.");
  }

  const match = duration.match(/^(\d+)([mh]?)$/);
  if (!match) return ctx.reply("Неправильный формат времени! Пример: 5m (минуты), 3h (часы)");

  const time = parseInt(match[1]);
  const unit = match[2] || 'm';
  let milliseconds;

  switch (unit) {
    case 'm':
      milliseconds = time * 60 * 1000;
      break;
    case 'h':
      milliseconds = time * 60 * 60 * 1000;
      break;
    default:
      return ctx.reply("Неправильная единица времени!");
  }

  // Mute the user
  ctx.restrictChatMember(userId, { can_send_messages: false, until_date: Date.now() + milliseconds });

  ctx.reply(`⏳ Пользователь @${ctx.from.username} замучен на ${duration}.`);

  logAction('muted', ctx, userId);
};
const unmute = async (ctx) => {
  const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
  if (!userId) return ctx.reply('⚠️ Укажите пользователя.');

  const data = func.loadData();
  const chatId = ctx.chat.id;

  // Admin check
  const isAdmin = await ctx.chat.getMember(ctx.from.id);
  if (!isAdmin || isAdmin.status !== 'administrator') {
    return ctx.reply("❌ У вас нет прав администратора для выполнения этой команды.");
  }

  if (!data.chats[chatId].users[userId]) {
    return ctx.reply("⚠️ Этот пользователь не найден.");
  }

  // Unmute the user
  ctx.restrictChatMember(userId, { can_send_messages: true });

  ctx.reply(`✅ Пользователь @${ctx.from.username} размучен.`);

  logAction('unmuted', ctx, userId);
};



module.exports = {
  setRole,
  warn,
  unwarn,
  ban,
  unban,
  mute,
  unmute
}