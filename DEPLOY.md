# Mells.Bet — деплой

Все зависимости (`node_modules`) уже установлены и лежат в архиве —
`npm install` делать не нужно.

## Что нужно сделать

1. Распаковать архив на сервере как есть (сохранив структуру папок).
2. Скопировать `.env.example` в `.env` и заполнить реальными значениями:
   - `DATABASE_URL` — строка подключения к Postgres
   - `SESSION_SECRET` — любая длинная случайная строка
   - `BASE_URL` — публичный адрес, на котором будет доступен сайт
     (например `https://mells.bet`)
   - `SPWORLDS_CARD_ID` / `SPWORLDS_CARD_TOKEN` — из раздела "Кошелёк" →
     "Поделиться картой" на spworlds.ru
   - `SPWORLDS_MINIAPP_ID` / `SPWORLDS_MINIAPP_TOKEN` — со страницы
     созданного Mini App на spworlds.ru (ID публичный, TOKEN секретный,
     выдаётся один раз)
   - `BOOTSTRAP_ADMIN_SPWMINI_IDS` — spworlds accountId того, кто должен
     стать первым админом (через запятую, если их несколько)
3. В `public/index.html` найти строку
   ```
   const SPWMINI_APP_ID = 'REPLACE_WITH_YOUR_SPWORLDS_APP_ID';
   ```
   и вписать туда тот же ID приложения, что и в `.env` (он не секретный,
   поэтому его нормально указывать прямо в клиентском коде).
4. Запустить сервер:
   ```
   node server.js
   ```
   или, если используется pm2:
   ```
   pm2 start server.js --name mells-bet
   ```
   (или `pm2 start npm --name mells-bet -- start`)

## Важно

- Сайт теперь работает **только** будучи встроенным в spworlds.ru как
  Mini App (iframe) — без этого авторизация не сработает (это ожидаемо,
  не баг).
- Сессионная cookie требует HTTPS (`Secure`) — без HTTPS вход не будет
  сохраняться между запросами.
- База данных должна быть Postgres, доступная по `DATABASE_URL`; таблицы
  создаются автоматически при первом старте сервера.
