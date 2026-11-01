-- Static catalogue. Nothing in here depends on the current date, so it runs
-- once and is never revisited.

INSERT INTO screen (name) VALUES
    ('Screen 1'), ('Screen 2'), ('Screen 3'), ('Screen 4');

-- Ten rows of twelve in every screen. Crossing two generated series beats
-- writing 480 INSERT lines by hand, and chr(64 + 1) is 'A'.
INSERT INTO seat (screen_id, row_label, seat_number)
SELECT sc.id, r.row_label, n.seat_number
FROM screen sc
CROSS JOIN (SELECT chr(64 + i) AS row_label FROM generate_series(1, 10) AS i) AS r
CROSS JOIN (SELECT i AS seat_number       FROM generate_series(1, 12) AS i) AS n;

-- Invented titles, same three the frontend mock uses. Real films drag in
-- studio-owned posters and nothing here needs them to be real.
INSERT INTO film (title, runtime_minutes) VALUES
    ('The Long Quiet', 128),
    ('Saltwater',      112),
    ('Paper Moons',     99);
