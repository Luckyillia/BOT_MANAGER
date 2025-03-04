const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const bot = new Telegraf(process.env.BOT_TOKEN);
const maxWarns = 3;

// Логирование в файл и консоль
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

// Команда /start
bot.start((ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || '';
    const lastName = ctx.from.last_name || '';

    addUserIfNotExists(chatId, ctx);
    ctx.reply(`👋 Привет, ${firstName} ${lastName}! Я бот, который помогает управлять группой.`);
    log(`Пользователь ${userId} запустил команду /start в чате ${chatId}`, 'command');
    incrementUserMessage(chatId, userId);
});

// Команда /setnick
bot.command('setnick', (ctx) => {
    if (!isGroupChat(ctx)) {
        log(`Пользователь ${ctx.from.id} попытался использовать /setnick не в групповом чате`, 'error');
        return ctx.reply('⚠️ Эта команда доступна только в групповых чатах.');
    }

    const newNick = ctx.message.text.split(' ')[1];

    if (!newNick) {
        log(`Пользователь ${ctx.from.id} не указал ник в команде /setnick`, 'error');
        return ctx.reply('⚠️ Пожалуйста, введите ник. Пример: /setnick ВашНик');
    }

    if (newNick.length > 20) {
        log(`Пользователь ${ctx.from.id} указал слишком длинный ник: ${newNick}`, 'error');
        return ctx.reply('⚠️ Ник не может быть длиннее 20 символов.');
    }

    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const data = loadData();

    if (data.chats[chatId] && data.chats[chatId].users[userId]) {
        data.chats[chatId].users[userId].customNick = newNick;
        saveData(data);
        ctx.reply(`✅ Ваш новый ник успешно установлен: ${newNick}`);
        log(`Пользователь ${userId} изменил ник на ${newNick} в чате ${chatId}`, 'command');
    } else {
        addUserIfNotExists(chatId, ctx, newNick);
        ctx.reply(`✅ Ваш новый ник успешно установлен: ${newNick}`);
        log(`Пользователь ${userId} добавлен с ником ${newNick} в чат ${chatId}`, 'command');
    }
    incrementUserMessage(chatId, userId);
});

// Команда /mynick
bot.command('mynick', (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const data = loadData();
    const user = data.chats[chatId]?.users[userId];

    if (user) {
        const nick = user.customNick || '❌ У вас пока нет установленного ника.';
        ctx.reply(`👤 Ваш ник: ${nick}`);
        log(`Пользователь ${userId} запросил свой ник в чате ${chatId}`, 'command');
    } else {
        ctx.reply('⚠️ Вы не найдены в базе данных.');
        log(`Пользователь ${userId} не найден в базе данных чата ${chatId}`, 'error');
    }
    incrementUserMessage(chatId, userId);
});

// Команда /listnicks
bot.command('listnicks', (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const data = loadData();
    const users = data.chats[chatId]?.users;

    if (users) {
        const nicks = Object.values(users)
          .map(user => `${user.firstName} ${user.lastName || ''}: ${user.customNick || '❌ Нет ника'}`)
          .join('\n');

        const message = nicks || '⚠️ В этом чате еще нет установленных ников.';
        ctx.reply(message);
        log(`Пользователь ${ctx.from.id} запросил список ников в чате ${chatId}`, 'command');
    } else {
        ctx.reply('⚠️ В этом чате еще нет пользователей в базе данных.');
        log(`В чате ${chatId} нет пользователей в базе данных`, 'error');
    }
    incrementUserMessage(chatId, userId);
});

// Команда /stats
bot.command('stats', (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const data = loadData();
    const user = data.chats[chatId]?.users[userId];

    if (user) {
        ctx.reply(`📊 Вы отправили ${user.messageCount} сообщений в этом чате.`);
        log(`Пользователь ${userId} запросил статистику в чате ${chatId}`, 'command');
    } else {
        ctx.reply('⚠️ Вы не найдены в базе данных.');
        log(`Пользователь ${userId} не найден в базе данных чата ${chatId}`, 'error');
    }
    incrementUserMessage(chatId, userId);
});

// Команда /top
bot.command('top', (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const data = loadData();
    const users = data.chats[chatId]?.users;

    if (users) {
        const topUsers = Object.values(users)
          .sort((a, b) => b.messageCount - a.messageCount)
          .slice(0, 10)
          .map((user, index) => `${index + 1}. ${user.firstName} ${user.lastName || ''}: ${user.messageCount} сообщений`)
          .join('\n');

        ctx.reply(`🏆 Топ пользователей по сообщениям:\n${topUsers}`);
        log(`Пользователь ${ctx.from.id} запросил топ пользователей в чате ${chatId}`, 'command');
    } else {
        ctx.reply('⚠️ В этом чате еще нет пользователей в базе данных.');
        log(`В чате ${chatId} нет пользователей в базе данных`, 'error');
    }
    incrementUserMessage(chatId, userId);
});

// Команда /resetnick
bot.command('resetnick', (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const data = loadData();

    if (data.chats[chatId] && data.chats[chatId].users[userId]) {
        data.chats[chatId].users[userId].customNick = '';
        saveData(data);
        ctx.reply('✅ Ваш ник успешно сброшен.');
        log(`Пользователь ${userId} сбросил ник в чате ${chatId}`, 'command');
    } else {
        ctx.reply('⚠️ Вы не найдены в базе данных.');
        log(`Пользователь ${userId} не найден в базе данных чата ${chatId}`, 'error');
    }
    incrementUserMessage(chatId, userId);
});

// Команда /info
bot.command('info', (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const data = loadData();
    const user = data.chats[chatId]?.users[userId];

    if (user) {
        const infoMessage = `
👤 Информация о вас:
- Имя: ${user.firstName} ${user.lastName || ''}
- Ник: ${user.customNick || '❌ Нет ника'}
- Сообщений: ${user.messageCount}
        `;
        ctx.reply(infoMessage);
        log(`Пользователь ${userId} запросил информацию о себе в чате ${chatId}`, 'command');
    } else {
        ctx.reply('⚠️ Вы не найдены в базе данных.');
        log(`Пользователь ${userId} не найден в базе данных чата ${chatId}`, 'error');
    }
    incrementUserMessage(chatId, userId);
});

bot.command('warn', (ctx) => {
    const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
    if (!userId) return ctx.reply('⚠️ Укажите пользователя.');

    const data = loadData();
    if (!data.chats[ctx.chat.id].users[userId]) {
        data.chats[ctx.chat.id].users[userId].warns = 0;
    }

    data.chats[ctx.chat.id].users[userId].warns++;
    saveData(data);

    if (data.chats[ctx.chat.id].users[userId].warns >= maxWarns) {
        ctx.banChatMember(userId); // Бан пользователя
        ctx.reply(`⛔ Пользователь @${ctx.from.username} забанен за превышение лимита предупреждений.`);
    } else {
        ctx.reply(`⚠️ Пользователь @${ctx.from.username} получил предупреждение. Всего предупреждений: ${data.chats[ctx.chat.id].users[userId].warns}`);
    }
});

bot.command('like', (ctx) => {
    const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
    if (!userId) return ctx.reply('⚠️ Укажите пользователя.');

    const data = loadData();
    if (!data.chats[ctx.chat.id].users[userId]) {
        data.chats[ctx.chat.id].users[userId].reputation = 0;
    }

    data.chats[ctx.chat.id].users[userId].reputation++;
    saveData(data);
    ctx.reply(`👍 Репутация пользователя @${ctx.from.username} повышена.`);
});

bot.command('dislike', (ctx) => {
    const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
    if (!userId) return ctx.reply('⚠️ Укажите пользователя.');

    const data = loadData();
    if (!data.chats[ctx.chat.id].users[userId]) {
        data.chats[ctx.chat.id].users[userId].reputation = 0;
    }

    data.chats[ctx.chat.id].users[userId].reputation--;
    saveData(data);
    ctx.reply(`👎 Репутация пользователя @${ctx.from.username} понижена.`);
});

bot.command('poll', (ctx) => {
    const args = ctx.message.text.split('"').filter(arg => arg.trim() !== '');
    if (args.length < 3) return ctx.reply('⚠️ Укажите вопрос и варианты ответа.');

    const question = args[1];
    const options = args.slice(2);

    ctx.replyWithPoll(question, options);
    log(`Создан опрос: ${question}`, 'poll');
});

bot.command('setrole', (ctx) => {
    const userId = ctx.message.reply_to_message?.from.id || ctx.message.text.split(' ')[1]?.replace('@', '');
    const role = ctx.message.text.split(' ')[2];
    if (!userId || !role) return ctx.reply('⚠️ Укажите пользователя и роль.');

    const data = loadData();
    data.chats[ctx.chat.id].users[userId].role = role;
    saveData(data);
    ctx.reply(`✅ Пользователю @${ctx.from.username} назначена роль: ${role}`);
});

// Команда /help
bot.command('help', (ctx) => {
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
    `;

    ctx.reply(helpMessage);
    log(`Пользователь ${ctx.from.id} запросил помощь в чате ${ctx.chat.id}`, 'command');
    incrementUserMessage(chatId, userId);
});

bot.reaction("👍", (ctx) => {
    // user added a 👍 reaction
    console.log(ctx.update);
});

// Обработка событий chat_member
bot.on('chat_member', async (ctx) => {
    const chatId = ctx.chat.id;
    const chatMember = ctx.update.chat_member;
    const oldMember = chatMember.old_chat_member;
    const newMember = chatMember.new_chat_member;

    const user = newMember.user;
    const oldStatus = oldMember.status;
    const newStatus = newMember.status;

    log(`⚡ chat_member event: ${user.first_name} (${user.id}) | old: ${oldStatus} → new: ${newStatus}`, 'chat_member');

    if ((oldStatus === 'left' || oldStatus === 'kicked') && newStatus === 'member') {
        log(`🔗 Пользователь ${user.first_name} (@${user.username || 'Нет ника'}) присоединился по ссылке в чат ${chatId}`, 'chat_member');
        await ctx.reply(`👋 Добро пожаловать, ${user.first_name}! Вы присоединились по ссылке.`);
    } else if (oldStatus === 'member' && newStatus === 'left') {
        log(`🚪 Пользователь ${user.first_name} (@${user.username || 'Нет ника'}) сам покинул чат.`, 'chat_member');
        let data = loadData();
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
        saveData(data);
    } else if (oldStatus === 'member' && newStatus === 'kicked') {
        log(`⛔ Пользователь ${user.first_name} (@${user.username || 'Нет ника'}) был удалён администратором.`, 'chat_member');
    }
});

// Обработка новых участников чата
bot.on('new_chat_members', (ctx) => {
    const chatId = ctx.chat.id;
    const chatTitle = ctx.chat.title;
    const data = loadData();

    if (!data.chats[chatId]) {
        data.chats[chatId] = {
            chatTitle: chatTitle,
            users: {}
        };
        log(`Создан новый чат: ${chatId}`, 'chat');
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
            log(`Новый пользователь ${userId} добавлен в чат ${chatId}`, 'user');
        } else if (data.chats[chatId].users[userId].status === 'left' || data.chats[chatId].users[userId].status === 'kicked') {
            ctx.reply(`👋 С возвращением, ${firstName} ${lastName} (@${username})!`);
            data.chats[chatId].users[userId].status = 'member';
            log(`Пользователь ${userId} вернулся в чат ${chatId} после того, как покинул его.`, 'user');
        }
    });

    saveData(data);
});

// Обработка ухода участника из чата
bot.on('left_chat_member', (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.message.left_chat_member.id;

    let data = loadData();

    if (data.chats[chatId] && data.chats[chatId].users[userId]) {
        data.chats[chatId].users[userId].status = 'left'; // Помечаем как покинувшего
        saveData(data);
        log(`Пользователь ${userId} покинул чат ${chatId} и помечен как "left".`, 'chat_member');
    }

    ctx.reply(`👋 ${ctx.message.left_chat_member.first_name} покинул чат.`);
});

const userDislikeCounts = {}; // Объект для хранения количества дизлайков

bot.on("message_reaction", async (ctx) => {
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
                console.error("Ошибка при муте пользователя:", error);
            }
        }
    }
    if (removedReactions.some(r => r.type === "emoji" && r.emoji === "👎")) {
        userDislikeCounts[messageId]--;
        console.log(userDislikeCounts);
    }
});



// Подсчет сообщений пользователя
bot.on('message', (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    console.log(ctx.message);
    addUserIfNotExists(chatId, ctx);
    incrementUserMessage(chatId, userId);
});

// Запуск бота
bot.launch({allowedUpdates: [ 'message', 'message_reaction']})
  .then(() => log('Бот успешно запущен', 'start'))
  .catch((error) => log(`Ошибка при запуске бота: ${error.message}`, 'error'));