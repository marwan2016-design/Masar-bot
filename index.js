[9/18/2026 11:08 PM] TradeLine: const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// ==========================================
// TOKENS
// ==========================================

const TELEGRAM_TOKEN = '8375130826:AAGCq1il8Bkit0PuvwgZxYakvHssIFC2Wmw';

const NOCODB_TOKEN = 'nc_pat_malRaeiUmpPk277KG7xUSst1yZBRKue2iuZYvCPv';

const NOCODB_URL =
    'https://app.nocodb.com/api/v2/tables/mpryrwjikak17ao/records';


// ==========================================
// RENDER WEB SERVER
// ==========================================

const app = express();

const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Masar Control Bot is running ✅');
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        bot: 'Masar Control'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(✅ Web server running on port ${PORT});
});


// ==========================================
// TELEGRAM BOT
// ==========================================

const bot = new TelegramBot(TELEGRAM_TOKEN, {
    polling: true
});

console.log('✅ Telegram bot started');


// ==========================================
// GET CONFIG FROM NOCODB
// ==========================================

async function getConfig() {
    try {
        const response = await axios.get(
            NOCODB_URL,
            {
                headers: {
                    'xc-token': NOCODB_TOKEN
                }
            }
        );

        console.log(
            'NocoDB response:',
            JSON.stringify(response.data)
        );

        if (
            !response.data ||
            !response.data.list ||
            response.data.list.length === 0
        ) {
            throw new Error(
                'No configuration record found in NocoDB'
            );
        }

        return response.data.list[0];

    } catch (error) {
        console.error(
            '❌ NocoDB GET ERROR:',
            error.response?.status,
            error.response?.data || error.message
        );

        throw error;
    }
}


// ==========================================
// UPDATE CONFIG IN NOCODB
// ==========================================

async function updateConfig(currentConfig, changes) {
    try {
        const updateData = {
            Id: currentConfig.Id,
            ...changes
        };

        console.log(
            'Updating NocoDB:',
            JSON.stringify(updateData)
        );

        const response = await axios.patch(
            NOCODB_URL,
            updateData,
            {
                headers: {
                    'xc-token': NOCODB_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(
            '✅ NocoDB updated:',
            JSON.stringify(response.data)
        );

        return response.data;

    } catch (error) {
        console.error(
            '❌ NocoDB PATCH ERROR:',
            error.response?.status,
            error.response?.data || error.message
        );

        throw error;
    }
}


// ==========================================
// CREATE CONTROL PANEL
// ==========================================

function createControlPanel(config) {
    const executionEnabled =
        config.execution_enabled === true ||
        config.execution_enabled === 1 ||
        config.execution_enabled === 'true';

    const newsEnabled =
        config.news_filter === true ||
        config.news_filter === 1 ||
        config.news_filter === 'true';


    const statusText = executionEnabled
        ? '🟢 شغال (ACTIVE)'
        : '🔴 متوقف (DISABLED)';

    const newsText = newsEnabled
        ? 'مفعّل ✅'
        : 'معطّل ❌';


    const message = 🤖 *لوحة تحكم التداول - Masar Control*
───────────────────────────────
📊 *حالة التداول:* ${statusText}
📐 *حجم اللوت:* \${config.lot_size}\
📰 *فلتر الأخبار:* ${newsText}
───────────────────────────────;
[9/18/2026 11:08 PM] TradeLine: const keyboard = {
        inline_keyboard: [
            [
                {
                    text: executionEnabled
                        ? '🔴 إيقاف التداول'
                        : '🟢 تشغيل التداول',

                    callback_data: 'toggle_execution'
                }
            ],

            [
                {
                    text: '📐 0.01',
                    callback_data: 'set_lot_0.01'
                },
                {
                    text: '📐 0.02',
                    callback_data: 'set_lot_0.02'
                },
                {
                    text: '📐 0.05',
                    callback_data: 'set_lot_0.05'
                }
            ],

            [
                {
                    text: '📰 تغيير حالة فلتر الأخبار',
                    callback_data: 'toggle_news'
                }
            ]
        ]
    };


    return {
        message,
        keyboard
    };
}


// ==========================================
// SEND CONTROL PANEL
// ==========================================

async function sendControlPanel(chatId) {
    try {
        const config = await getConfig();

        const panel = createControlPanel(config);

        await bot.sendMessage(
            chatId,
            panel.message,
            {
                parse_mode: 'Markdown',
                reply_markup: panel.keyboard
            }
        );

    } catch (error) {
        await bot.sendMessage(
            chatId,
            '❌ حدث خطأ أثناء الاتصال بقاعدة البيانات.'
        );
    }
}


// ==========================================
// /START
// ==========================================

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    console.log(
        📩 /start from chat ID: ${chatId}
    );

    await sendControlPanel(chatId);
});


// ==========================================
// BUTTON CALLBACKS
// ==========================================

bot.on('callback_query', async (query) => {

    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    console.log(
        Button pressed: ${data}
    );

    try {
        const currentConfig = await getConfig();

        const executionEnabled =
            currentConfig.execution_enabled === true ||
            currentConfig.execution_enabled === 1 ||
            currentConfig.execution_enabled === 'true';

        const newsEnabled =
            currentConfig.news_filter === true ||
            currentConfig.news_filter === 1 ||
            currentConfig.news_filter === 'true';


        let changes = {};


        // ==================================
        // TOGGLE EXECUTION
        // ==================================

        if (data === 'toggle_execution') {

            changes.execution_enabled =
                !executionEnabled;
        }


        // ==================================
        // CHANGE LOT SIZE
        // ==================================

        else if (data.startsWith('set_lot_')) {

            const lot = data.replace(
                'set_lot_',
                ''
            );

            changes.lot_size =
                parseFloat(lot);
        }


        // ==================================
        // TOGGLE NEWS FILTER
        // ==================================

        else if (data === 'toggle_news') {

            changes.news_filter =
                !newsEnabled;
        }


        else {
            await bot.answerCallbackQuery(
                query.id,
                {
                    text: '❌ أمر غير معروف'
                }
            );

            return;
        }


        // ==================================
        // UPDATE NOCODB
        // ==================================

        await updateConfig(
            currentConfig,
            changes
        );


        // ==================================
        // TELEGRAM CONFIRMATION
        // ==================================
[9/18/2026 11:08 PM] TradeLine: await bot.answerCallbackQuery(
            query.id,
            {
                text: '✅ تم التحديث بنجاح'
            }
        );


        // ==================================
        // GET NEW VALUES
        // ==================================

        const newConfig =
            await getConfig();

        const panel =
            createControlPanel(newConfig);


        // ==================================
        // UPDATE SAME TELEGRAM MESSAGE
        // ==================================

        try {
            await bot.editMessageText(
                panel.message,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: panel.keyboard
                }
            );

        } catch (editError) {

            // Telegram sometimes returns
            // "message is not modified"
            // وهذا ليس خطأ حقيقي

            if (
                !editError.message.includes(
                    'message is not modified'
                )
            ) {
                console.error(
                    'Edit message error:',
                    editError.message
                );
            }
        }


    } catch (error) {

        console.error(
            '❌ CALLBACK ERROR:',
            error.response?.status,
            error.response?.data ||
            error.message
        );


        try {
            await bot.answerCallbackQuery(
                query.id,
                {
                    text: '❌ فشل التحديث'
                }
            );
        } catch (_) {}


        await bot.sendMessage(
            chatId,
            '❌ فشل تحديث البيانات في NocoDB.'
        );
    }
});


// ==========================================
// TELEGRAM POLLING ERRORS
// ==========================================

bot.on('polling_error', (error) => {
    console.error(
        '❌ Telegram polling error:',
        error.message
    );
});
