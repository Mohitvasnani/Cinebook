-- Time-dependent seed: the same nine daily slots for today and the next six
-- days. Kept separate from V3 because this is the part that goes stale.
--
-- current_date + d  -> a date
-- date + time       -> a timestamp with no zone (a wall clock reading)
-- ... AT TIME ZONE  -> anchors that wall clock to a real instant (timestamptz)

INSERT INTO showtime (film_id, screen_id, starts_at, price_minor, currency)
SELECT f.id,
       sc.id,
       ((current_date + d) + slot.time_of_day) AT TIME ZONE 'Europe/London',
       slot.price_minor,
       'GBP'
FROM generate_series(0, 6) AS d
CROSS JOIN (VALUES
        ('The Long Quiet', 'Screen 1', time '13:10', 1150),
        ('The Long Quiet', 'Screen 1', time '15:50', 1150),
        ('The Long Quiet', 'Screen 3', time '18:40', 1150),
        ('The Long Quiet', 'Screen 3', time '21:15', 1150),
        ('Saltwater',      'Screen 2', time '14:20', 1400),
        ('Saltwater',      'Screen 2', time '17:30', 1400),
        ('Saltwater',      'Screen 2', time '20:45', 1400),
        ('Paper Moons',    'Screen 4', time '11:00', 1150),
        ('Paper Moons',    'Screen 4', time '13:30', 1150)
     ) AS slot(film_title, screen_name, time_of_day, price_minor)
JOIN film   f  ON f.title = slot.film_title
JOIN screen sc ON sc.name = slot.screen_name;
