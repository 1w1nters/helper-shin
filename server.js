// --- START OF FILE server.js ---
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config(); // Можно оставить, если есть другие переменные

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// SHINOA_AUTH_COOKIE из переменных окружения здесь больше НЕ НУЖЕН,
// так как кука будет передаваться от клиента в каждом запросе.
// const SHINOA_AUTH_COOKIE = process.env.SHINOA_AUTH_COOKIE; // ЭТУ СТРОКУ УДАЛИТЬ ИЛИ ЗАКОММЕНТИРОВАТЬ

const SHINOA_API_BASE_URL = 'https://logs.shinoa.tech/api/v1';

// Эндпоинт для проксирования запросов к Shinoa
app.post('/api/shinoa-logs', async (req, res) => {
    // Получаем данные, переданные от расширения
    const { nickname, logType, serverId, shinoaCookie } = req.body; // ТЕПЕРЬ ОЖИДАЕМ shinoaCookie ОТ РАСШИРЕНИЯ

    // Проверяем, что никнейм и кука переданы
    if (!nickname || !shinoaCookie) {
        return res.status(400).json({ success: false, error: 'Missing nickname or Shinoa authentication cookie from client.' });
    }

    try {
        let targetPath = '/punish';
        // Если Shinoa имеет разные эндпоинты для disconnects/setname, нужно будет адаптировать здесь
        // Пример:
        // if (logType === 'disconnects') targetPath = '/disconnects';
        // else if (logType === 'setname') targetPath = '/setname';

        const targetUrl = `${SHINOA_API_BASE_URL}${targetPath}`;

        const shinoaRequestBody = {
            player: nickname,
            // Добавьте другие параметры, если Shinoa API их требует
            // Например: type: logType, server: serverId
        };

        // Выполняем запрос к Shinoa API с нужными заголовками и телом
        const shinoaResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': shinoaCookie // ИСПОЛЬЗУЕМ КУКУ, ПЕРЕДАННУЮ РАСШИРЕНИЕМ
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
        res.json({ success: true, data: shinoaData });
    } catch (error) {
        console.error('Proxy error forwarding to Shinoa:', error);
        res.status(500).json({ success: false, error: `Internal proxy error: ${error.message}` });
    }
});

app.get('/', (req, res) => {
    res.send('Shinoa Proxy is running. Use POST /api/shinoa-logs to query.');
});

app.listen(port, () => {
    console.log(`Shinoa Proxy server listening on port ${port}`);
});
// --- END OF FILE server.js ---
