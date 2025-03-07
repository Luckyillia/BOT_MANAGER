const func = require('./func');

function newMember(ctx){
  const chatId = ctx.chat.id;
  const chatTitle = ctx.chat.title;
  const data = func.loadData();

  if (!data.chats[chatId]) {
    data.chats[chatId] = {
      chatTitle: chatTitle,
      users: {}
    };
    func.log(`Создан новый чат: ${chatId}`, 'chat');
  }

  ctx.message.new_chat_members.forEach((user) => {
    const userId = user.id;
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const username = user.username || 'Нет ника';

    if (!data.chats[chatId].users[userId]) {
      data.chats[chatId].users[userId] = {
        firstName,
        lastName,
        username,
        messageCount: 0,
        status: 'member'
      };

      ctx.reply(`🎉 Добро пожаловать, ${firstName} ${lastName} (@${username})!`);
      func.log(`Новый пользователь ${userId} добавлен в чат ${chatId}`, 'user');
    } else if (data.chats[chatId].users[userId].status === 'left' || data.chats[chatId].users[userId].status === 'kicked') {
      ctx.reply(`👋 С возвращением, ${firstName} ${lastName} (@${username})!`);
      data.chats[chatId].users[userId].status = 'member';
      func.log(`Пользователь ${userId} вернулся в чат ${chatId} после того, как покинул его.`, 'user');
    }
  });

  func.saveData(data);
}

function leftMember(ctx){
  const chatId = ctx.chat.id;
  const userId = ctx.message.left_chat_member.id;

  let data = func.loadData();

  if (data.chats[chatId] && data.chats[chatId].users[userId]) {
    data.chats[chatId].users[userId].status = 'left'; // Помечаем как покинувшего
    func.saveData(data);
    func.log(`Пользователь ${userId} покинул чат ${chatId} и помечен как "left".`, 'chat_member');
  }

  ctx.reply(`👋 ${ctx.message.left_chat_member.first_name} покинул чат.`);
}

async function chatMember(ctx){
  const chatId = ctx.chat.id;
  const chatMember = ctx.update.chat_member;
  const oldMember = chatMember.old_chat_member;
  const newMember = chatMember.new_chat_member;

  const user = newMember.user;
  const oldStatus = oldMember.status;
  const newStatus = newMember.status;

  func.log(`⚡ chat_member event: ${user.first_name} (${user.id}) | old: ${oldStatus} → new: ${newStatus}`, 'chat_member');

  if ((oldStatus === 'left' || oldStatus === 'kicked') && newStatus === 'member') {
    func.log(`🔗 Пользователь ${user.first_name} (@${user.username || 'Нет ника'}) присоединился по ссылке в чат ${chatId}`, 'chat_member');
    await ctx.reply(`👋 Добро пожаловать, ${user.first_name}! Вы присоединились по ссылке.`);
  } else if (oldStatus === 'member' && newStatus === 'left') {
    func.log(`🚪 Пользователь ${user.first_name} (@${user.username || 'Нет ника'}) сам покинул чат.`, 'chat_member');
    let data = func.loadData();
    if (!data.chats[chatId]) {
      data.chats[chatId] = {
        users: {}
      };
    }
    data.chats[chatId].users[user.id] = {
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      status: 'left'
    };
    func.saveData(data);
  } else if (oldStatus === 'member' && newStatus === 'kicked') {
    func.log(`⛔ Пользователь ${user.first_name} (@${user.username || 'Нет ника'}) был удалён администратором.`, 'chat_member');
  }
}

module.exports = {
  newMember,
  leftMember,
  chatMember,
}