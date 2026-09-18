const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// المفاتيح الخاصة بقاعدتك وبوتك
const TELEGRAM_TOKEN = '8375130826:AAGCq1il8Bkit0PuvwgZxYakvHssIFC2Wmw';
const NOCODB_TOKEN = 'nc_pat_malRaeiUmpPk277KG7xUSst1yZBRKue2iuZYvCPv';
const NOCODB_URL = 'https://app.nocodb.com/api/v2/tables/mpryrwjikak17ao/records';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.onText(/\/start/, async (msg) => {
    sendControlPanel(msg.chat.id);
});

async function sendControlPanel(chatId) {
    try {
        const response = await axios.get(NOCODB_URL, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const config = response.data.list[0];

        const statusText = config.execution_enabled ? '🟢 شغال (ACTIVE)' : '🔴 متوقف (DISABLED)';
        const newsText = config.news_filter ? 'مفعّل ✅' : 'معطّل ❌';
        
        const message = 🤖 *لوحة تحكم التداول - Masar Control*\n +
                        ───────────────────────────────\n +
                        📊 *حالة التداول:* ${statusText}\n +
                        📐 *حجم اللوت:* \${config.lot_size}\\n +
                        📰 *فلتر الأخبار:* ${newsText}\n +
                        ───────────────────────────────;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: config.execution_enabled ? '🔴 إيقاف التداول' : '🟢 تشغيل التداول', callback_data: 'toggle_execution' }
                ],
                [
                    { text: '📐 0.01', callback_data: 'set_lot_0.01' },
                    { text: '📐 0.02', callback_data: 'set_lot_0.02' },
                    { text: '📐 0.05', callback_data: 'set_lot_0.05' }
                ],
                [
                    { text: '📰 تغيير حالة فلتر الأخبار', callback_data: 'toggle_news' }
                ]
            ]
        };

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (error) {
        bot.sendMessage(chatId, '❌ حدث خطأ أثناء الاتصال بقاعدة البيانات.');
    }
}

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    try {
        const response = await axios.get(NOCODB_URL, { headers: { 'xc-token': NOCODB_TOKEN } });
        const currentConfig = response.data.list[0];

        let updateData = { Id: currentConfig.Id };

        if (data === 'toggle_execution') {
            updateData.execution_enabled = !currentConfig.execution_enabled;
        } else if (data.startsWith('set_lot_')) {
            updateData.lot_size = parseFloat(data.split('_')[2]);
        } else if (data === 'toggle_news') {
            updateData.news_filter = !currentConfig.news_filter;
        }

        await axios.patch(NOCODB_URL, updateData, {
            headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' }
        });

        bot.answerCallbackQuery(query.id, { text: 'تم التحديث بنجاح!' });
        sendControlPanel(chatId);
    } catch (err) {
        bot.sendMessage(chatId, '❌ فشل تحديث البيانات في NocoDB.');
    }
});
