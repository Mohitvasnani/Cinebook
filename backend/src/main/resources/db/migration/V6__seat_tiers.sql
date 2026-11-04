-- Seat tiers and the pricing rule.
--
-- A tier is a lookup table rather than a CHECK constraint, because it carries
-- data: the display name the UI shows and the price uplift over the showtime's
-- base. A CHECK would need a migration to add a tier and would leave the price
-- in application code.
--
-- Price for a seat = showtime.price_minor + seat_tier.price_delta_minor.
-- The base lives on the showtime because it varies by screening; the uplift
-- lives on the tier because it does not.

CREATE TABLE seat_tier (
    code              text PRIMARY KEY,
    display_name      text NOT NULL,
    -- Minor units, added to the showtime's base price. Integer, never a float.
    price_delta_minor int  NOT NULL CHECK (price_delta_minor >= 0),
    -- Front of house to back. Drives display order so the UI does not hardcode it.
    sort_order        int  NOT NULL UNIQUE
);

INSERT INTO seat_tier (code, display_name, price_delta_minor, sort_order) VALUES
    ('NORMAL',    'Normal',      0, 1),
    ('PREMIUM',   'Premium',   250, 2),
    ('EXECUTIVE', 'Executive', 500, 3);

-- Added nullable, backfilled, then constrained. Adding it NOT NULL in one step
-- fails against a table that already has 480 rows and no default.
ALTER TABLE seat ADD COLUMN tier text REFERENCES seat_tier(code);

-- A to E Normal, F to H Premium, I to J Executive. Single-character labels, so
-- BETWEEN on text is a plain alphabetical comparison.
UPDATE seat
   SET tier = CASE
                WHEN row_label BETWEEN 'A' AND 'E' THEN 'NORMAL'
                WHEN row_label BETWEEN 'F' AND 'H' THEN 'PREMIUM'
                ELSE 'EXECUTIVE'
              END;

ALTER TABLE seat ALTER COLUMN tier SET NOT NULL;