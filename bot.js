const { Telegraf } = require('telegraf');

const func = require('./utils/func');
const userAction = require('./utils/userAction');
const userFunc = require('./utils/userFunc');
const chatAction = require('./utils/chatAction');
const adminAction = require('./utils/adminAction');
const handleMessage = require('./utils/handleMessage');
const reputation = require('./utils/reputation');

const bot = new Telegraf(process.env.BOT_TOKEN);
const userDislikeCounts = {};

bot.start((ctx) => userAction.start(ctx));
bot.command('setnick', (ctx) => userAction.setNick(ctx));
bot.command('mynick', (ctx) => userAction.myNick(ctx));
bot.command('listnicks', (ctx) => userAction.listNick(ctx));
bot.command('resetnick', (ctx) => userAction.resetNick(ctx));
bot.command('stats', (ctx) => userFunc.stats(ctx));
bot.command('top', (ctx) => userFunc.top(ctx));
bot.command('info', (ctx) => userFunc.info(ctx));
bot.command('help', (ctx) => userFunc.help(ctx));
bot.command('poll', (ctx) => userFunc.pull(ctx));
bot.command('warn', (ctx) => adminAction.warn(ctx));
bot.command('unwarn', (ctx) => adminAction.unwarn(ctx));
bot.command('ban', (ctx) => adminAction.ban(ctx));
bot.command('unban', (ctx) => adminAction.unban(ctx));
bot.command('mute', (ctx) => adminAction.mute(ctx));
bot.command('unmute', (ctx) => adminAction.unmute(ctx));
bot.command('setrole', (ctx) => adminAction.setRole(ctx));
bot.command('like', (ctx) => reputation.like(ctx));
bot.command('dislike', (ctx) => reputation.dislike(ctx));
bot.on('chat_member', async (ctx) => chatAction.chatMember(ctx));
bot.on('new_chat_members', (ctx) => chatAction.newMember(ctx));
bot.on('left_chat_member', (ctx) => chatAction.leftMember(ctx));
bot.on("message_reaction", async (ctx) => handleMessage.messageReaction(ctx, userDislikeCounts));
bot.on('message', (ctx) => handleMessage.handleMessage(ctx));

bot.launch({allowedUpdates: [ 'message', 'message_reaction']})
  .then(() => func.log('Бот успешно запущен', 'start'))
  .catch((error) => func.log(`Ошибка при запуске бота: ${error.message}`, 'error'));