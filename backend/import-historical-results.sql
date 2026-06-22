-- Import historical tournament results from 6 completed tournaments
-- This data will be used by AI to calculate win probabilities

-- Tournament 1: III Весенний Кубок им. Н. Ермашова (ID: 1, date: 2026-04-26)
INSERT INTO player_tournament_results (tournament_id, player_name, place, group_name, net, format) VALUES
-- Группа Man HCP по 13,5
(1, 'Дворников Анатолий', 1, 'Группа Man HCP по 13,5', 66, 'Stroke net'),
(1, 'Прокопович Алексей', 2, 'Группа Man HCP по 13,5', 71, 'Stroke net'),
(1, 'Михалкевич Андрей', 3, 'Группа Man HCP по 13,5', 71, 'Stroke net'),
-- Группа Man HCP 13,6-22
(1, 'Антонов Павел', 1, 'Группа Man HCP 13,6-22', 67, 'Stroke net'),
(1, 'Ярец Николай', 2, 'Группа Man HCP 13,6-22', 68, 'Stroke net'),
(1, 'Козельский Захар', 3, 'Группа Man HCP 13,6-22', 69, 'Stroke net'),
-- Группа Man HCP 22,1-36
(1, 'Нечипоренко Андрей', 1, 'Группа Man HCP 22,1-36', NULL, 'Stableford'),
(1, 'Громов Сергей', 2, 'Группа Man HCP 22,1-36', NULL, 'Stableford'),
(1, 'Чергинец Игорь', 3, 'Группа Man HCP 22,1-36', NULL, 'Stableford'),
-- Группа Woman HCP по 22
(1, 'Шевченко Ирина', 1, 'Группа Woman HCP по 22', 70, 'Stroke net'),
(1, 'Козельская Татьяна', 2, 'Группа Woman HCP по 22', 71, 'Stroke net'),
(1, 'Гончаренок Жанна', 3, 'Группа Woman HCP по 22', 72, 'Stroke net'),
-- Группа Woman HCP 22,1-36
(1, 'Сергеева Варвара', 1, 'Группа Woman HCP 22,1-36', NULL, 'Stableford'),
(1, 'Хасанова Алина', 2, 'Группа Woman HCP 22,1-36', NULL, 'Stableford'),
(1, 'Шибеко Светлана', 3, 'Группа Woman HCP 22,1-36', NULL, 'Stableford');

-- Nominations for tournament 1
INSERT INTO player_nominations (tournament_id, player_name, nomination_title, nomination_value) VALUES
(1, 'Дик Ольга', 'Переходящий кубок', NULL),
(1, 'Пригожий Георгий', 'Best gross Man', NULL),
(1, 'Дик Ольга', 'Best gross Woman', NULL),
(1, 'Безбородько Вадим', 'Longest Drive Man', NULL),
(1, 'Ластовская Елена', 'Longest Drive Woman', NULL),
(1, 'Девятовский Вадим', 'Closest to the pin Man', '1.25м'),
(1, 'Сергеева Варвара', 'Closest to the pin Woman', '6.8м');

-- Tournament 2: Hole in One Challenge (ID: 2, date: 2026-05-09)
INSERT INTO player_tournament_results (tournament_id, player_name, place, group_name, net, format) VALUES
-- Группа Man HCP по 14
(2, 'Жаловский Денис', 1, 'Группа Man HCP по 14', 25, 'Stableford'),
(2, 'Граков Алексей', 2, 'Группа Man HCP по 14', 25, 'Stableford'),
(2, 'Мацкевич Дмитрий', 3, 'Группа Man HCP по 14', 28, 'Stableford'),
-- Группа Man HCP 14,1-28
(2, 'Савченко Юрий', 1, 'Группа Man HCP 14,1-28', 24, 'Stableford'),
(2, 'Козельский Сергей', 2, 'Группа Man HCP 14,1-28', 25, 'Stableford'),
(2, 'Бобченко Валерий', 3, 'Группа Man HCP 14,1-28', 25, 'Stableford'),
-- Группа Man HCP 28,1-36
(2, 'Зубков Андрей', 1, 'Группа Man HCP 28,1-36', 23, 'Stableford'),
(2, 'Саликов Андрей', 2, 'Группа Man HCP 28,1-36', 27, 'Stableford'),
(2, 'Ермашов Алексей', 3, 'Группа Man HCP 28,1-36', 31, 'Stableford'),
-- Группа Woman HCP по 24
(2, 'Лычковская Алла', 1, 'Группа Woman HCP по 24', 23, 'Stableford'),
(2, 'Гончаренок Жанна', 2, 'Группа Woman HCP по 24', 24, 'Stableford'),
(2, 'Ластовская Елена', 3, 'Группа Woman HCP по 24', 29, 'Stableford'),
-- Группа Woman HCP 24,1-36
(2, 'Сухова Анастасия', 1, 'Группа Woman HCP 24,1-36', 25, 'Stableford'),
(2, 'Колосовская Мария', 2, 'Группа Woman HCP 24,1-36', 30, 'Stableford'),
(2, 'Сочнева Елена', 3, 'Группа Woman HCP 24,1-36', 32, 'Stableford'),
-- Группа ДШГ (Junior)
(2, 'Ясинская София', 1, 'Группа ДШГ', NULL, 'Junior'),
(2, 'Знахарчук Александр', 2, 'Группа ДШГ', NULL, 'Junior'),
(2, 'Козельский Матвей', 3, 'Группа ДШГ', NULL, 'Junior'),
-- Группа Начинающих
(2, 'Рудена Андрей', 1, 'Группа Начинающих', NULL, 'Stableford'),
(2, 'Климук Александр', 2, 'Группа Начинающих', NULL, 'Stableford'),
(2, 'Колосовский Евгений', 3, 'Группа Начинающих', NULL, 'Stableford');

INSERT INTO player_nominations (tournament_id, player_name, nomination_title, nomination_value) VALUES
(2, 'Жаловский Денис', 'HOLE IN ONE', '8 лунка'),
(2, 'Агеев Захар', 'Closest to the Pin Man', '1,21 м'),
(2, 'Чибисова Ольга', 'Closest to the Pin Woman', '3,18 м');

-- Tournament 3: Whitebird Spring Open Cup (ID: 3, date: 2026-05-16)
INSERT INTO player_tournament_results (tournament_id, player_name, place, group_name, score, format) VALUES
-- Группа Man HCP по 13,5
(3, 'Пригожий Георгий', 1, 'Группа Man HCP по 13,5', 68, 'Stableford'),
(3, 'Прокорим Александр', 2, 'Группа Man HCP по 13,5', 67, 'Stableford'),
(3, 'Примак Виталий', 3, 'Группа Man HCP по 13,5', 63, 'Stableford'),
-- Группа Man HCP 13,6-22
(3, 'Козельский Захар', 1, 'Группа Man HCP 13,6-22', 72, 'Stableford'),
(3, 'Фетисов Валентин', 2, 'Группа Man HCP 13,6-22', 66, 'Stableford'),
(3, 'Ярец Николай', 2, 'Группа Man HCP 13,6-22', 66, 'Stableford'),
-- Группа Man HCP 22,1-36
(3, 'Лагутик Сергей', 1, 'Группа Man HCP 22,1-36', 62, 'Stableford'),
(3, 'Вашкевич Артем', 2, 'Группа Man HCP 22,1-36', 59, 'Stableford'),
(3, 'Левчук Андрей', 2, 'Группа Man HCP 22,1-36', 59, 'Stableford'),
-- Группа Woman HCP по 24
(3, 'Ластовская Елена', 1, 'Группа Woman HCP по 24', 64, 'Stableford'),
(3, 'Толкачева Полина', 2, 'Группа Woman HCP по 24', 60, 'Stableford'),
(3, 'Козельская Татьяна', 3, 'Группа Woman HCP по 24', 59, 'Stableford'),
-- Группа Woman HCP 24,1-36
(3, 'Черевикова Юлия', 1, 'Группа Woman HCP 24,1-36', 61, 'Stableford'),
(3, 'Сергеева Варвара', 2, 'Группа Woman HCP 24,1-36', 57, 'Stableford'),
(3, 'Хасанова Алина', 3, 'Группа Woman HCP 24,1-36', 55, 'Stableford');

INSERT INTO player_nominations (tournament_id, player_name, nomination_title, nomination_value) VALUES
(3, 'Прокопович Алексей', 'Главный приз Man', '73 очка'),
(3, 'Шибеко Светлана', 'Главный приз Woman', '66 очков'),
(3, 'Примак Виталий', 'Longest Drive Man', NULL),
(3, 'Ластовская Елена', 'Longest Drive Woman', NULL),
(3, 'Девятовский Вадим', 'Closest to the pin Man', '3,64 м'),
(3, 'Колосовская Мария', 'Closest to the pin Woman', '8,54 м');

-- Tournament 4: Международный детский гольф-турнир «Луч» (ID: 5, date: 2026-05-31)
INSERT INTO player_tournament_results (tournament_id, player_name, place, group_name, score, format) VALUES
-- Академическое поле: Группа 5-9 лет
(5, 'Жишкевич Мирослав', 1, 'АП: Группа 5-9 лет', 14, 'Junior'),
(5, 'Бегун Агата', 2, 'АП: Группа 5-9 лет', 11, 'Junior'),
(5, 'Агеев Лука', 3, 'АП: Группа 5-9 лет', 11, 'Junior'),
-- Академическое поле: Группа 10-11 лет
(5, 'Петрович Яна', 1, 'АП: Группа 10-11 лет', 14, 'Junior'),
(5, 'Дергач Елизавета', 2, 'АП: Группа 10-11 лет', 13, 'Junior'),
(5, 'Кондратенко Семен', 3, 'АП: Группа 10-11 лет', 13, 'Junior'),
-- Академическое поле: Группа 12-15 лет
(5, 'Рачек Данила', 1, 'АП: Группа 12-15 лет', 15, 'Junior'),
(5, 'Босякова София', 2, 'АП: Группа 12-15 лет', 10, 'Junior'),
(5, 'Шалимо Артур', 3, 'АП: Группа 12-15 лет', 8, 'Junior'),
-- Чемпионское поле: Группа 7-11 лет
(5, 'Браславская Ева', 1, 'ЧП: Группа 7-11 лет', 18, 'Junior'),
(5, 'Агеев Захар', 2, 'ЧП: Группа 7-11 лет', 17, 'Junior'),
(5, 'Туманов Роман', 3, 'ЧП: Группа 7-11 лет', 16, 'Junior'),
-- Чемпионское поле: Группа 12-15 лет
(5, 'Сухова Анастасия', 1, 'ЧП: Группа 12-15 лет', 18, 'Junior'),
(5, 'Козельский Захар', 2, 'ЧП: Группа 12-15 лет', 18, 'Junior'),
(5, 'Ясинская София', 3, 'ЧП: Группа 12-15 лет', 17, 'Junior');

INSERT INTO player_nominations (tournament_id, player_name, nomination_title, nomination_value) VALUES
(5, 'Жишкевич Мирослав', 'Closest to the pin мальчики АП', '6,21м'),
(5, 'Дергач Елизавета', 'Closest to the pin девочки АП', '5,79м'),
(5, 'Ткач Милан', 'Closest to the pin мальчики ЧП', '3,67м'),
(5, 'Ясинская София', 'Closest to the pin девочки ЧП', '4,9м');

-- Tournament 5: XVIII Rookie Cup 2026 (ID: 6, date: 2026-06-07)
INSERT INTO player_tournament_results (tournament_id, player_name, place, group_name, score, format) VALUES
-- Группа Man
(6, 'Петрович Александр', 1, 'Группа Man', 27, 'Stableford'),
(6, 'Шарафутдинов Артем', 2, 'Группа Man', 26, 'Stableford'),
(6, 'Погорелов Сергей', 3, 'Группа Man', 22, 'Stableford'),
-- Группа Woman
(6, 'Жабкина Алина', 1, 'Группа Woman', 16, 'Stableford'),
(6, 'Рыбакова Людмила', 2, 'Группа Woman', 15, 'Stableford'),
(6, 'Харламова Елена', 3, 'Группа Woman', 12, 'Stableford'),
-- Группа Junior
(6, 'Знахарчук Александр', 1, 'Группа Junior', 26, 'Stableford'),
(6, 'Быков Архип', 2, 'Группа Junior', 19, 'Stableford'),
(6, 'Петрович Яна', 3, 'Группа Junior', 19, 'Stableford');

INSERT INTO player_nominations (tournament_id, player_name, nomination_title, nomination_value) VALUES
(6, 'Петрович Александр', 'Longest Drive Man', NULL),
(6, 'Харламова Елена', 'Longest Drive Woman', NULL),
(6, 'Ковалев Андрей', 'Closest to the pin Man', '14,66м'),
(6, 'Сочнева Елена', 'Closest to the pin Woman', '2,65м'),
(6, 'Знахарчук Александр', 'Longest Drive Junior', NULL),
(6, 'Знахарчук Александр', 'Closest to the pin Junior', '1м');

-- Tournament 6: Pets Day (ID: 8, date: 2026-06-13)
INSERT INTO player_tournament_results (tournament_id, player_name, place, group_name, score, format) VALUES
-- Группа Man по 14 HCP
(8, 'Фетисов Валентин', 1, 'Группа Man по 14 HCP', 39, 'Stableford'),
(8, 'Прокопович Максим', 2, 'Группа Man по 14 HCP', 36, 'Stableford'),
(8, 'Михалкевич Андрей', 3, 'Группа Man по 14 HCP', 36, 'Stableford'),
-- Группа Man 14,1-22 HCP
(8, 'Антонов Павел', 1, 'Группа Man 14,1-22 HCP', 39, 'Stableford'),
(8, 'Козельский Захар', 2, 'Группа Man 14,1-22 HCP', 35, 'Stableford'),
(8, 'Литвинчик Степан', 3, 'Группа Man 14,1-22 HCP', 35, 'Stableford'),
-- Группа Man 22,1-36 HCP
(8, 'Вашков Иван', 1, 'Группа Man 22,1-36 HCP', 40, 'Stableford'),
(8, 'Денисов Роман', 2, 'Группа Man 22,1-36 HCP', 38, 'Stableford'),
(8, 'Вашкевич Артем', 3, 'Группа Man 22,1-36 HCP', 36, 'Stableford'),
-- Группа Woman по 22 HCP
(8, 'Козельская Татьяна', 1, 'Группа Woman по 22 HCP', 34, 'Stableford'),
(8, 'Видевич Наталья', 2, 'Группа Woman по 22 HCP', 32, 'Stableford'),
(8, 'Ластовская Елена', 3, 'Группа Woman по 22 HCP', 29, 'Stableford'),
-- Группа Woman 22,1-36 HCP
(8, 'Хасанова Алина', 1, 'Группа Woman 22,1-36 HCP', 45, 'Stableford'),
(8, 'Ясинская София', 2, 'Группа Woman 22,1-36 HCP', 42, 'Stableford'),
(8, 'Тарасик Ольга', 3, 'Группа Woman 22,1-36 HCP', 37, 'Stableford');

INSERT INTO player_nominations (tournament_id, player_name, nomination_title, nomination_value) VALUES
(8, 'Захсенмайер Патрик', 'Best Stableford gross Man', NULL),
(8, 'Туманова Наталья', 'Best Stableford gross Woman', NULL),
(8, 'Захсенмайер Патрик', 'Longest Drive Man', NULL),
(8, 'Дик Ольга', 'Longest Drive Woman', NULL),
(8, 'Литвинчик Степан', 'Closest to the pin Man', '0.79м'),
(8, 'Толкачева Полина', 'Closest to the pin Woman', '4.83м');

-- Verify import
SELECT COUNT(*) as total_results FROM player_tournament_results;
SELECT COUNT(*) as total_players FROM player_statistics;
SELECT player_name, total_tournaments, first_places, top3_finishes
FROM player_statistics
ORDER BY first_places DESC, total_tournaments DESC
LIMIT 10;
