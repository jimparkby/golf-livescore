# Инструкция по настройке системы турниров

## Шаг 1: Настройка переменных окружения

Добавьте в файл `.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=golf
DB_USER=postgres
DB_PASSWORD=your_password

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_IDS=your_telegram_id  # Узнать через @userinfobot

# Claude AI для прогнозов
ANTHROPIC_API_KEY=your_api_key

# URLs
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com
```

## Шаг 2: Запуск базы данных

База данных автоматически создаст нужные таблицы при первом запуске.

## Шаг 3: Импорт турниров

Запустите скрипт для импорта всех турниров 2026 года:

```bash
cd backend
npm run import-tournaments
```

Это создаст все турниры из списка в базе данных со статусом "completed".

## Шаг 4: Что теперь можно делать

### В мини-аппе:

1. **Просмотр турниров** (`/tournaments`)
   - Все 33 турнира сезона 2026
   - Группировка по месяцам
   - Клик на турнир → детальная страница

2. **Детальная страница турнира** (`/tournament/:id`)
   - **Вкладка "Результаты"** - фотографии результатов (для завершенных турниров)
   - **Вкладка "Таблица"** - таблица лидеров
   - **Вкладка "AI Прогнозы"** - для активных турниров
   - **Вкладка "Лучшие игроки"** - топ по HCP и победам

### В Telegram боте:

#### Админ-команды:

```bash
/admin                              # Меню админа
/create_tournament                  # Создать новый турнир
/list_tournaments                   # Список всех турниров
/activate_tournament <id>           # Запустить турнир
/complete_tournament <id>           # завершить турнир
/upload_flight <id> <flight_number> # Загрузить результаты флайта
/import_history                     # Импорт исторических данных
/stats                              # Статистика системы
```

## Шаг 5: Добавление фотографий результатов

### Вариант 1: Через Telegram бота (рекомендуется)

1. Активируйте турнир:
   ```
   /activate_tournament rookie-cup-18
   ```

2. Загрузите фото результатов:
   ```
   /upload_flight rookie-cup-18 1
   ```
   Затем отправьте фото скор-карты

3. Бот автоматически:
   - Распознает результаты с фото
   - Сопоставит игроков
   - Обновит счета
   - Добавит фото в галерею

4. Завершите турнир:
   ```
   /complete_tournament rookie-cup-18
   ```

### Вариант 2: Напрямую через БД

```sql
UPDATE tournaments
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{photos}',
  '["photo_2026-06-07_19-30-47.jpg", "photo_2026-06-07_19-30-53.jpg"]'::jsonb
)
WHERE id = 'rookie-cup-18';
```

## Шаг 6: Импорт исторических данных игроков

Подготовьте JSON файл по образцу `backend/example-history-import.json`:

```json
[
  {
    "player_name": "Иванов Иван",
    "tournament_name": "XVIII Rookie Cup 2025",
    "tournament_date": "2025-06-07",
    "position": 1,
    "total_score": 78,
    "handicap_index": 8.5,
    "scores": {
      "holes": [4, 5, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 5, 3, 4]
    }
  }
]
```

Отправьте боту:
```
/import_history
```
Затем отправьте JSON файл.

Пересчитайте статистику:
```bash
cd backend
npm run update-stats
```

## Список турниров 2026

Все эти турниры будут импортированы в систему:

### Апрель
- ✅ III Весенний Кубок им. Н. Ермашова by БСБК (26 апреля)

### Май
- ✅ Hole in One Challenge (9 мая)
- ✅ Whitebird Spring Open Cup (16-17 мая)
- ✅ Minsk Golf Invitational 2026 (22-23 мая)
- ✅ Международный детский гольф-турнир «Луч» (31 мая)

### Июнь
- ✅ XVIII Rookie Cup 2026 (7 июня)
- ✅ Hardy Cup (12 июня)
- ✅ Pets Day (13 июня)
- ✅ PRIME LINE CUP (26-28 июня)

### Июль
- ✅ BELAVIA Golf Open 2026 (4 июля)
- ✅ XIX Rookie Cup 2026 (5 июля)
- ✅ VIII Кубок Гольф-клуба Минск (10-12 июля)
- ✅ ФУТГОЛЬФ. Belarus Open (19 июля)
- ✅ II Кубок Братства: Беларусь — Россия by WhiteBird (24 июля)
- ✅ Лига Гольфа (РФ) 3 этап, Минск (25-26 июля)

### Август
- ✅ X Time to Golf 2026 (1 августа)
- ✅ Ladies Golf Open (8 августа)
- ✅ AVATR Golf Cup (22 августа)
- ✅ Тур «Золотые 50» (27 августа)
- ✅ Активлизинг Investment Cup (29 августа)

### Сентябрь
- ✅ Infinity Golf Cup 2026 (5 сентября)
- ✅ Лига гольфа (РФ) 4 этап и финал (11-13 сентября)
- ✅ XX Rookie Cup (13 сентября)
- ✅ XX Belarus Golf Open Cup (19-20 сентября)
- ✅ «Привет» от Гринкипера by Technogym (26 сентября)

### Октябрь
- ✅ Отбор BMW Golf Cup World Final (2-4 октября)
- ✅ BMW Challenge Cup 2026 (4 октября)
- ✅ Этап Евразийской Лиги Гольфа (7 октября)
- ✅ Minsk Golf InterClub 2026 by Kaspersky (9-10 октября)
- ✅ Футгольф (11 октября)
- ✅ Благотворительный турнир БСБК (17 октября)
- ✅ XXI Rookie Cup (25 октября)

### Ноябрь
- ✅ XXII SUPER Rookie Cup (7 ноября)

**Всего: 33 турнира**

## Фотографии результатов

У вас есть фотографии для следующих турниров:

1. **III Весенний Кубок им. Н. Ермашова** (26 апреля) - 4 фото
2. **Hole in One Challenge** (9 мая) - 3 фото
3. **Whitebird Spring Open Cup** (16-17 мая) - 4 фото
4. **Международный детский гольф-турнир «Луч»** (31 мая) - 3 фото
5. **XVIII Rookie Cup 2026** (7 июня) - 5 фото
6. **Pets Day** (13 июня) - 3 фото

Эти фотографии уже привязаны к турнирам в скрипте импорта.

## Хранение фотографий

⚠️ **ВАЖНО**: Текущая реализация - это прототип. Для продакшена нужно:

1. Загружать фотографии в облачное хранилище (S3, Cloudflare R2, etc.)
2. Хранить в БД только URL фотографий
3. Раздавать через CDN

Пример для продакшена:
```javascript
// В settings хранить URLs вместо имен файлов
{
  "photos": [
    "https://cdn.example.com/tournaments/rookie-cup-18/photo1.jpg",
    "https://cdn.example.com/tournaments/rookie-cup-18/photo2.jpg"
  ]
}
```

## Следующие шаги

1. ✅ Импортировать турниры: `npm run import-tournaments`
2. 📸 Загрузить фотографии результатов через бота или напрямую в БД
3. 📊 Импортировать исторические данные игроков
4. 🎯 Тестировать AI-прогнозы на новых турнирах
5. 🚀 Запустить в продакшн

## Поддержка

Если возникнут вопросы:
- Документация: `backend/TOURNAMENTS.md`
- Примеры: `backend/example-history-import.json`
- Feature guide: `TOURNAMENTS_FEATURE.md`
