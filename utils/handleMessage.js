const func = require('./func');

function handleMessage(ctx){
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  console.log(ctx.message);
  func.addUserIfNotExists(chatId, ctx);
  func.incrementUserMessage(chatId, userId);
}
async function messageReaction(ctx,userDislikeCounts){
  const update = ctx.update.message_reaction;
  const chatId = update.chat.id;
  const messageId = update.message_id;
  const userId = update.user.id;
  const addedReactions = update.new_reaction;
  const removedReactions = update.old_reaction;

  // Проверяем, поставили ли дизлайк (👎)
  if (addedReactions.some(r => r.type === "emoji" && r.emoji === "👎")) {
    if (!userDislikeCounts[messageId]) {
      userDislikeCounts[messageId] = 0;
    }

    userDislikeCounts[messageId]++;
    if (userDislikeCounts[messageId] >= 2) {
      try {
        const message = await ctx.telegram.getChatMessage(chatId, messageId);
        const authorId = message.from.id;

        await ctx.telegram.restrictChatMember(chatId, authorId, {
          until_date: Math.floor(Date.now() / 1000) + 3600, // 1 час мута
          can_send_messages: false
        });

        await ctx.telegram.sendMessage(chatId, `🚫 Пользователь @${message.from.username} получил мут за 10 дизлайков!`);
        delete userDislikeCounts[messageId];
      } catch (error) {
        console.log("Ошибка при муте пользователя:", error);
      }
    }
  }
  if (removedReactions.some(r => r.type === "emoji" && r.emoji === "👎")) {
    userDislikeCounts[messageId]--;
    console.log(userDislikeCounts);
  }
}

module.exports = {
  handleMessage,
  messageReaction
}