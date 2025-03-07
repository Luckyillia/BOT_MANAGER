const func = require('./func');

function like(ctx){
  const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
  if (!userId) return ctx.reply('⚠️ Укажите пользователя.');

  const data = func.loadData();
  if (!data.chats[ctx.chat.id].users[userId]) {
    data.chats[ctx.chat.id].users[userId].reputation = 0;
  }

  data.chats[ctx.chat.id].users[userId].reputation++;
  func.saveData(data);
  ctx.reply(`👍 Репутация пользователя @${ctx.from.username} повышена.`);
}

function dislike(ctx){
  const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
  if (!userId) return ctx.reply('⚠️ Укажите пользователя.');

  const data = func.loadData();
  if (!data.chats[ctx.chat.id].users[userId]) {
    data.chats[ctx.chat.id].users[userId].reputation = 0;
  }

  data.chats[ctx.chat.id].users[userId].reputation--;
  func.saveData(data);
  ctx.reply(`👎 Репутация пользователя @${ctx.from.username} понижена.`);
}

module.exports = {
  like,
  dislike
}