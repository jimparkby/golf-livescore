# Tournament System Documentation

## Обзор

Система турниров с AI-аналитикой для GolfMinsk Live. Позволяет:
- Создавать и управлять турнирами
- Отслеживать результаты в реальном времени
- Получать AI-прогнозы на победу
- Загружать результаты флайтов через Telegram бота
- Вести историю игроков и статистику

## Структура базы данных

### Таблицы

#### tournaments
Основная информация о турнирах
- `id` - UUID
- `name` - Название турнира
- `description` - Описание
- `course_name` - Название поля
- `start_date` - Дата начала
- `end_date` - Дата окончания
- `status` - Статус: upcoming, active, completed, cancelled
- `tier` - Уровень: gold, platinum, diamond, closed
- `format` - Формат игры
- `holes_count` - Количество лунок
- `entry_fee` - Стоимость участия
- `max_participants` - Максимум участников
- `registration_deadline` - Дедлайн регистрации
- `settings` - Дополнительные настройки (JSONB)

#### tournament_participants
Участники турниров
- `id` - UUID
- `tournament_id` - Ссылка на турнир
- `user_id` - Ссылка на пользователя
- `flight_number` - Номер флайта
- `tee_time` - Время старта
- `handicap_index` - Handicap на момент турнира
- `status` - Статус: registered, started, finished, withdrawn
- `total_score` - Общий счет
- `position` - Позиция в турнире

#### tournament_rounds
Связь раундов с турнирами
- `id` - UUID
- `tournament_id` - Ссылка на турнир
- `round_id` - Ссылка на раунд
- `participant_id` - Ссылка на участника
- `round_number` - Номер раунда

#### player_tournament_history
Историческая статистика игроков
- `id` - UUID
- `player_name` - Имя игрока
- `player_normalized_name` - Нормализованное имя (для поиска)
- `user_id` - Ссылка на пользователя (если зарегистрирован)
- `tournament_name` - Название турнира
- `tournament_date` - Дата турнира
- `position` - Позиция
- `total_score` - Общий счет
- `handicap_index` - Handicap
- `scores` - Детальные результаты (JSONB)

#### player_statistics
Агрегированная статистика игроков
- `id` - UUID
- `user_id` - Ссылка на пользователя
- `player_name` - Имя игрока
- `player_normalized_name` - Нормализованное имя
- `tournaments_played` - Сыграно турниров
- `tournaments_won` - Выиграно турниров
- `top3_finishes` - Попаданий в ТОП-3
- `top10_finishes` - Попаданий в ТОП-10
- `best_position` - Лучшая позиция
- `average_score` - Средний счет
- `current_handicap` - Текущий handicap
- `best_handicap` - Лучший handicap
- `last_tournament_date` - Дата последнего турнира
- `statistics` - Дополнительная статистика (JSONB)

#### tournament_flight_photos
Загруженные фото результатов флайтов
- `id` - UUID
- `tournament_id` - Ссылка на турнир
- `flight_number` - Номер флайта
- `telegram_file_id` - ID файла в Telegram
- `processed` - Обработано ли
- `scores` - Распознанные результаты (JSONB)
- `uploaded_by` - Кто загрузил
- `uploaded_at` - Когда загружено

## API Endpoints

### Tournaments

#### GET /api/tournaments
Получить список всех турниров
```
Query params:
- status: upcoming|active|completed|cancelled
```

#### GET /api/tournaments/:id
Получить информацию о турнире

#### POST /api/tournaments
Создать турнир (требуется авторизация)
```json
{
  "name": "Название турнира",
  "description": "Описание",
  "course_name": "Поле",
  "start_date": "2026-06-21T10:00:00Z",
  "end_date": "2026-06-21T18:00:00Z",
  "tier": "gold",
  "format": "stroke_play",
  "holes_count": 18,
  "entry_fee": 150,
  "max_participants": 100
}
```

#### PUT /api/tournaments/:id
Обновить турнир (требуется авторизация)

#### GET /api/tournaments/:id/leaderboard
Получить таблицу лидеров

#### POST /api/tournaments/:id/register
Зарегистрироваться на турнир

#### DELETE /api/tournaments/:id/register
Отменить регистрацию

### Predictions & Statistics

#### GET /api/predictions/tournament/:id/win-probability
Получить AI-прогнозы на победу в турнире

Response:
```json
[
  {
    "player_id": "uuid",
    "name": "Имя игрока",
    "win_probability": 0.25,
    "confidence": "high",
    "reasoning": "Сильный handicap и стабильные результаты",
    "key_factors": ["Лучший HCP", "3 победы в сезоне"],
    "has_historical_data": true
  }
]
```

#### GET /api/predictions/leaderboards
Получить таблицы лучших игроков

Response:
```json
{
  "byHandicap": [...],
  "byWins": [...]
}
```

### Flight Photos

#### POST /api/flights/tournament/:id/flight-photo
Загрузить фото результатов флайта

#### GET /api/flights/tournament/:id/flight-photos
Получить все загруженные фото флайта

## Telegram Bot - Админ команды

Для использования админ команд нужно добавить свой Telegram ID в переменную окружения:
```
TELEGRAM_ADMIN_IDS=123456789,987654321
```

### Команды

#### /admin
Показать меню админ-панели

#### /create_tournament
Создать новый турнир (пошаговый процесс)

#### /list_tournaments
Показать список всех турниров

#### /activate_tournament <tournament_id>
Активировать турнир

#### /complete_tournament <tournament_id>
Завершить турнир

#### /upload_flight <tournament_id> <flight_number>
Загрузить результаты флайта (после команды отправить фото)

#### /import_history
Импортировать исторические данные (отправить JSON файл)

#### /stats
Показать статистику системы

## Формат данных для импорта истории

JSON файл со следующей структурой:
```json
[
  {
    "player_name": "Иванов Иван",
    "tournament_name": "Весенний кубок 2025",
    "tournament_date": "2025-05-15",
    "position": 3,
    "total_score": 85,
    "handicap_index": 12.5,
    "scores": {
      "holes": [4, 5, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 5, 3, 4]
    }
  }
]
```

## Workflow использования

### 1. Создание турнира
1. Админ использует `/create_tournament` в боте или создает через API
2. Турнир создается со статусом `upcoming`

### 2. Регистрация участников
1. Игроки регистрируются через мини-апп
2. Админ может назначить флайты и tee times

### 3. Активация турнира
1. Админ использует `/activate_tournament <id>`
2. Статус меняется на `active`
3. Становятся доступны AI-прогнозы

### 4. Загрузка результатов
1. Во время турнира админ использует `/upload_flight <id> <flight_number>`
2. Отправляет фото скор-карты
3. Бот распознает результаты и обновляет таблицу

### 5. Завершение турнира
1. Админ использует `/complete_tournament <id>`
2. Статус меняется на `completed`
3. Результаты сохраняются в историю игроков
4. Обновляется статистика

## AI-прогнозы

Система использует Claude AI для расчета вероятности победы. Учитываются:
- Текущий Handicap Index
- История участия в турнирах
- Количество побед и попаданий в ТОП-3
- Недавние результаты
- Текущий счет (если турнир активен)

Прогнозы имеют уровень уверенности:
- **high** - много исторических данных, стабильные результаты
- **medium** - средний объем данных
- **low** - мало данных или новый игрок

## Переменные окружения

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_IDS=123456789,987654321

# Claude AI для прогнозов
ANTHROPIC_API_KEY=your_api_key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=golf
DB_USER=postgres
DB_PASSWORD=password

# Frontend URL
FRONTEND_URL=https://your-domain.com
```
