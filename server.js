// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Для выполнения HTTP-запросов на серверной стороне
require('dotenv').config(); // Для загрузки переменных окружения из .env

const app = express();
const port = process.env.PORT || 3000; // Render предоставит PORT

// Включаем CORS для всех запросов
app.use(cors());
// Разрешаем Express парсить JSON-тело запросов
app.use(express.json());

// Ваш Shinoa API токен из переменных окружения Render
const SHINOA_AUTH_TOKEN = process.env.SHINOA_AUTH_TOKEN;
const SHINOA_API_BASE_URL = 'https://logs.shinoa.tech/api/v1'; // Базовый URL Shinoa

// Эндпоинт для проксирования запросов к Shinoa
app.post('/api/shinoa-logs', async (req, res) => {
    // Получаем данные, переданные от расширения
    const { nickname, logType, serverId } = req.body;

    if (!nickname || !SHINOA_AUTH_TOKEN) {
        return res.status(400).json({ success: false, error: 'Missing nickname or Shinoa API token.' });
    }

    try {
        const targetUrl = `${SHINOA_API_BASE_URL}/punish`; // Предполагаем, что endpoint для наказаний - /punish

        // Формируем тело запроса для Shinoa.
        // ПОЖАЛУЙСТА, УТОЧНИТЕ ФОРМАТ ЗАПРОСА ДЛЯ SHINOA!
        // На основе вашего скриншота, запрос был POST на /punish
        // и в Request Payload видно "player": "Concentracia_Space".
        // Возможно, также потребуется "type", "server" и т.д.
        const shinoaRequestBody = {
            player: nickname,
            // Добавьте другие параметры, если Shinoa API их требует,
            // например: type: 'warn', server: serverId
            // Вам нужно будет определить, как Shinoa фильтрует по типам логов.
        };

        // Выполняем запрос к Shinoa API с нужными заголовками и телом
        const shinoaResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Для Shinoa, возможно, потребуется передавать 'TOKEN' как Cookie
                // или 'Authorization' header, если у вас есть Bearer токен.
                // Если это кука, то сложнее, так как fetch() в Node.js
                // не управляет куками автоматически как браузер.
                // В вашем случае, судя по скриншоту, TOKEN был в Cookie.
                // Простейший вариант для прокси - это передать его как обычный заголовок,
                // если Shinoa его примет.
                'X-Shinoa-Auth-Token': SHINOA_AUTH_TOKEN // ПРИМЕР: передача токена через кастомный заголовок
            },
            body: JSON.stringify(shinoaRequestBody)
        });

        // Проверяем, успешен ли запрос к Shinoa
        if (!shinoaResponse.ok) {
            const errorText = await shinoaResponse.text();
            console.error('Shinoa API error:', shinoaResponse.status, errorText);
            return res.status(shinoaResponse.status).json({ success: false, error: `Shinoa API returned ${shinoaResponse.status}: ${errorText}` });
        }

        const shinoaData = await shinoaResponse.json();
        res.json({ success: true, data: shinoaData }); // Возвращаем данные от Shinoa
    } catch (error) {
        console.error('Proxy error forwarding to Shinoa:', error);
        res.status(500).json({ success: false, error: 'Internal proxy error' });
    }
});

app.listen(port, () => {
    console.log(`Proxy server listening on port ${port}`);
});