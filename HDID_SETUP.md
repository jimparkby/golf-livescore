# HDID Integration Setup

Интеграция с HowDidIDo (HDID) для Golf Club Minsk.

## Как это работает

При первом входе в приложение:
1. Новые пользователи вводят имя и фамилию на английском
2. Система проверяет whitelist членов Golf Club Minsk из HDID
3. Если пользователь найден → присваивается HCP из HDID
4. Если не найден → доступ запрещен

## Импорт данных из CSV

### 1. Подготовка

CSV файл `hdid_members.csv` уже создан и содержит 252 члена клуба:
- 168 мужчин (HCP от -2.6 до 54.0)
- 82 женщины (HCP от 8.9 до 54.0)

Структура CSV:
```csv
last_name,first_name,hcp,gender
SACHSENMAIER,PATRICK,-2.6,male
PRYHOZHY,HEORHI,1.5,male
LASTOUSKAYA,ALENA,8.9,female
```

### 2. Импорт в базу данных

```bash
cd backend
npm run import:hdid
```

Скрипт:
- Создаст таблицу `hdid_members` (если её нет)
- Импортирует все записи из CSV
- При повторном запуске обновит существующие записи (ON CONFLICT DO UPDATE)
- Покажет статистику по импортированным данным

Пример вывода:
```
[import] Found 252 members to import
[import] Complete: 252 imported, 0 skipped
[import] Database stats: {
  total: 252,
  males: 168,
  females: 82,
  min_hcp: -2.6,
  max_hcp: 54.0,
  avg_hcp: 25.3
}
```

### 3. Включение расширения pg_trgm

Расширение `pg_trgm` автоматически создается при старте сервера (миграции в `db.js`).

Оно используется для fuzzy matching имен:
- Точное совпадение → мгновенный доступ
- Похожие имена (например, ANDREI vs ANDREY) → сопоставление с порогом 60%

Если расширение недоступно, система будет работать только с точными совпадениями.

## Обновление данных HDID

Для обновления whitelist:

1. Получите новый список из HDID (скриншоты или экспорт)
2. Обновите `hdid_members.csv`
3. Запустите импорт повторно: `npm run import:hdid`

Существующие записи будут обновлены, новые добавлены.

## Структура базы данных

Таблица `hdid_members`:
```sql
CREATE TABLE hdid_members (
  id SERIAL PRIMARY KEY,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  hcp NUMERIC NOT NULL,
  gender TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(last_name, first_name)
);
```

## Логика авторизации

1. **Существующий пользователь** (есть в таблице `users`)
   - Пропускается проверка whitelist
   - Обновляется только username и photo_url

2. **Новый пользователь**
   - Требуется ввод имени/фамилии на английском
   - Проверка по whitelist (exact match или fuzzy match)
   - Если не найден → 403 "Доступ запрещен"
   - Если найден → создание пользователя с HCP из HDID

## Примеры использования

### Проверка импорта
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM hdid_members;"
psql $DATABASE_URL -c "SELECT * FROM hdid_members WHERE last_name = 'SACHSENMAIER';"
```

### Поиск пользователя
```bash
psql $DATABASE_URL -c "SELECT * FROM hdid_members WHERE
  similarity(UPPER(first_name), 'ANDREI') > 0.6 AND
  similarity(UPPER(last_name), 'PRYHOZHY') > 0.6;"
```

## Troubleshooting

### Ошибка: relation "hdid_members" does not exist
Запустите сервер хотя бы один раз — миграции создадут таблицу автоматически.

### Ошибка: function similarity() does not exist
Расширение pg_trgm не установлено. Проверьте права доступа к БД или установите вручную:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Ошибка при импорте: ENOENT hdid_members.csv
Убедитесь что файл `hdid_members.csv` находится в корне проекта.
