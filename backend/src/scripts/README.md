# Database Scripts

## Update Tournament Slugs

После деплоя миграции с добавлением колонки `slug` в таблицу `tournaments`, запустите этот скрипт для заполнения slug всех существующих турниров:

```bash
node backend/src/scripts/update-tournament-slugs.js
```

Или через Railway CLI:

```bash
railway run node src/scripts/update-tournament-slugs.js
```

Скрипт сопоставит названия турниров из базы данных со slug из `frontend/src/lib/tournaments.ts` и обновит записи.
