// --- START OF FILE server.js ---
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Для выполнения HTTP-запросов на серверной стороне
require('dotenv').config(); // Для загрузки переменных окружения из .env

const app = express();
const port = process.env.PORT || 3000; // Render предоставит PORT, для локальной разработки 3000

// Включаем CORS для всех запросов
app.use(cors());
// Разрешаем Express парсить JSON-тело запросов
app.use(express.json());

// Ваш Shinoa API токен из переменных окружения Render
// (Это должна быть строка TOKEN=...;XSRF=... из ваших куки)
const SHINOA_AUTH_COOKIE = process.env.SHINOA_AUTH_COOKIE;
const SHINOA_API_BASE_URL = 'https://logs.shinoa.tech/api/v1'; // Базовый URL Shinoa

// Эндпоинт для проксирования запросов к Shinoa
app.post('/api/shinoa-logs', async (req, res) => {
    // Получаем данные, переданные от расширения
    const { nickname, logType, serverId } = req.body; // serverId пока не используется Shinoa API, но передаем на всякий случай

    if (!nickname || !SHINOA_AUTH_COOKIE) {
        return res.status(400).json({ success: false, error: 'Missing nickname or Shinoa authentication cookie.' });
    }

    try {
        let targetPath = '/punish'; // По умолчанию ищем наказания
        // Вам нужно будет уточнить у Shinoa, какой API использовать для других типов логов
        // Например: if (logType === 'disconnects') targetPath = '/disconnects';

        const targetUrl = `${SHINOA_API_BASE_URL}${targetPath}`;

        // Формируем тело запроса для Shinoa.
        // На основе скриншота, Shinoa API для '/punish' принимает 'player'
        const shinoaRequestBody = {
            player: nickname,
            // Добавьте другие параметры, если Shinoa API их требует
            // Например: type: logType (если Shinoa использует поле 'type' в запросе)
            // server: serverId (если Shinoa использует поле 'server' в запросе)
        };

        // Выполняем запрос к Shinoa API с нужными заголовками и телом
        const shinoaResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Передаем токен авторизации как Cookie.
                // Это критически важный шаг, так как Shinoa ожидает этот заголовок.
                // Строка SHINOA_AUTH_COOKIE должна быть в формате "TOKEN=ВАШ_ТОКЕН; XSRF=ВАШ_XSRF_ТОКЕН"
                'Cookie': SHINOA_AUTH_COOKIE
            },
            body: JSON.stringify(shinoaRequestBody)
        });

        // Проверяем, успешен ли запрос к Shinoa
        if (!shinoaResponse.ok) {
            const errorText = await shinoaResponse.text();
            console.error('Shinoa API error:', shinoaResponse.status, errorText);
            // Пытаемся передать ошибку Shinoa обратно клиенту
            return res.status(shinoaResponse.status).json({ success: false, error: `Shinoa API returned ${shinoaResponse.status}: ${errorText}` });
        }

        const shinoaData = await shinoaResponse.json();
        res.json({ success: true, data: shinoaData }); // Возвращаем данные от Shinoa
    } catch (error) {
        console.error('Proxy error forwarding to Shinoa:', error);
        res.status(500).json({ success: false, error: `Internal proxy error: ${error.message}` });
    }
});

// Простой эндпоинт для проверки работоспособности прокси
app.get('/', (req, res) => {
    res.send('Shinoa Proxy is running. Use POST /api/shinoa-logs to query.');
});

app.listen(port, () => {
    console.log(`Shinoa Proxy server listening on port ${port}`);
});
// --- END OF FILE server.js ---
