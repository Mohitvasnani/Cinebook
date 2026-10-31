# CineBook API Contract

The document both sides are built against. Written before either side was
implemented, so the Next.js client and the Spring Boot service agree by
construction rather than by discovery.

- Base path: `/api`
- All timestamps ISO-8601 UTC with a trailing `Z`
- All money in integer minor units (pence), never floats
- Errors use RFC 9457 problem details (`application/problem+json`)
- Hold TTL: 300 seconds

Seven endpoints. Four are the core booking flow. Two are `GET`s that exist so the
client's URLs survive a page refresh. One releases a hold early.

---

## 1. `GET /api/showtimes`

List all showtimes.

**200**

```json
[
  {
    "id": 1,
    "filmTitle": "Blade Runner 2049",
    "screenName": "Screen 1",
    "startsAt": "2026-11-02T19:30:00Z",
    "runtimeMinutes": 164,
    "priceMinor": 1250,
    "currency": "GBP",
    "seatsAvailable": 87,
    "seatsTotal": 120
  }
]
```

No pagination. The dataset is small and bounded by what a cinema screens in a week.

---

## 2. `GET /api/showtimes/{showtimeId}/seats`

The seat map for one showtime.

**200**

```json
{
  "showtimeId": 1,
  "seats": [
    { "id": 1001, "rowLabel": "A", "seatNumber": 1, "status": "AVAILABLE" },
    { "id": 1002, "rowLabel": "A", "seatNumber": 2, "status": "HELD" },
    { "id": 1003, "rowLabel": "A", "seatNumber": 3, "status": "BOOKED" }
  ]
}
```

**404** unknown showtime.

No row or column counts are sent. The client groups on `rowLabel` to build the
grid, so the layout is described in one place rather than two.

`status` is computed per request, never stored on the seat:

```sql
SELECT s.id, s.row_label, s.seat_number,
       CASE
         WHEN b.id IS NOT NULL THEN 'BOOKED'
         WHEN h.id IS NOT NULL THEN 'HELD'
         ELSE 'AVAILABLE'
       END AS status
FROM seat s
LEFT JOIN booking b
       ON b.seat_id = s.id AND b.showtime_id = :showtimeId
LEFT JOIN seat_hold h
       ON h.seat_id = s.id AND h.showtime_id = :showtimeId
      AND h.booked_at IS NULL
      AND h.expires_at > now()
WHERE s.screen_id = (SELECT screen_id FROM showtime WHERE id = :showtimeId)
ORDER BY s.row_label, s.seat_number;
```

The `h.expires_at > now()` predicate is doing the real work. An expired hold
reads as AVAILABLE the instant it expires, with no sweeper involved. A scheduled
job to delete old hold rows is then housekeeping, not correctness.

---

## 3. `POST /api/holds`

Claim a seat for 300 seconds.

**Request**

```json
{ "showtimeId": 1, "seatId": 1002 }
```

**201**, with `Location: /api/holds/{holdId}`

```json
{
  "holdId": "0199c3a4-7f21-7b8e-9d44-1a2b3c4d5e6f",
  "showtimeId": 1,
  "seatId": 1002,
  "rowLabel": "A",
  "seatNumber": 2,
  "expiresAt": "2026-10-31T08:12:00Z",
  "ttlSeconds": 300
}
```

Both `expiresAt` and `ttlSeconds` are returned. The first is authoritative and
what gets displayed. The second lets the browser count down against its own
clock, so a user whose machine clock is minutes out does not see a timer that
starts at zero.

**409** seat already held or booked:

```json
{
  "type": "https://cinebook.dev/problems/seat-unavailable",
  "title": "Seat unavailable",
  "status": 409,
  "detail": "Seat A2 is already held or booked for this showtime.",
  "instance": "/api/holds",
  "seatId": 1002
}
```

**404** unknown showtime or seat. **422** validation failure.

One seat per hold. Multi-seat holds mean an all-or-nothing claim across N rows,
which is a different and harder problem, deferred deliberately.

---

## 4. `GET /api/holds/{holdId}`

Read a hold. Exists so the checkout page renders on a cold load rather than only
when the user arrives by clicking.

**200**

```json
{
  "holdId": "0199c3a4-7f21-7b8e-9d44-1a2b3c4d5e6f",
  "showtimeId": 1,
  "seatId": 1002,
  "rowLabel": "A",
  "seatNumber": 2,
  "expiresAt": "2026-10-31T08:12:00Z",
  "ttlSeconds": 180,
  "status": "ACTIVE"
}
```

`status` is one of `ACTIVE`, `EXPIRED`, `CONVERTED`. `ttlSeconds` is the
remaining time, so it shrinks across calls.

**404** unknown hold.

---

## 5. `POST /api/bookings`

Convert a hold into a booking.

**Request**

```json
{ "holdId": "0199c3a4-7f21-7b8e-9d44-1a2b3c4d5e6f" }
```

The body carries only the hold ID. The hold already knows its seat and showtime,
so re-sending them would let a client submit a combination that disagrees with
the server, and the server would have to decide which to trust.

**201**

```json
{
  "bookingReference": "CB-7F3K2Q",
  "showtimeId": 1,
  "filmTitle": "Blade Runner 2049",
  "screenName": "Screen 1",
  "startsAt": "2026-11-02T19:30:00Z",
  "seat": { "rowLabel": "A", "seatNumber": 2 },
  "pricePaidMinor": 1250,
  "currency": "GBP",
  "bookedAt": "2026-10-31T08:09:14Z"
}
```

**409** with a distinct `type` per case:

| `type` | Meaning |
|---|---|
| `problems/hold-expired` | The hold lapsed. The seat is available again. |
| `problems/hold-already-converted` | Double submit of the same hold. |

**404** unknown hold.

---

## 6. `GET /api/bookings/{bookingReference}`

Read a booking. Same body as above. **404** if unknown.

Exists so the confirmation page is reloadable and shareable.

The reference is a short human-readable code (`CB-7F3K2Q`), not the primary key.
People read references out loud; UUIDs do not survive that.

---

## 7. `DELETE /api/holds/{holdId}`

Release a hold before it expires.

**204** no content.

**404** unknown hold. **409** `problems/hold-already-converted` if it is already a
booking; a booking is cancelled, not released, and cancellation is out of scope.

Added after the design review: the checkout screen offers "Release and go back",
and without this the seat would sit locked for the rest of its five minutes even
though the user has explicitly walked away. Releasing early is the difference
between a hold that models intent and one that just models a timeout.

---

## Identifier strategy

| Resource | ID type | Why |
|---|---|---|
| Showtime, Seat | `bigint` | Catalogue data, safe to expose, cheap to index. |
| Hold, Booking | UUIDv7 | A hold ID is a capability: whoever has it can convert it to a booking, so it must be unguessable. UUIDv7 is time-ordered, so the index does not fragment the way random UUIDv4 does. |
| Booking reference | `CB-` + 6 base32 chars | Human-facing, readable aloud, distinct from the primary key. |

## Deliberately out of scope

Deferred, with the reasoning recorded so the omissions read as decisions rather
than gaps:

- **Multi-seat holds.** An all-or-nothing claim across N seats. The single-seat
  case already demonstrates the locking.
- **Idempotency keys** on `POST /api/holds`. Matters under real retry pressure,
  not for proving the locking works.
- **Authentication.** There is no user model. Holds are bearer capabilities.
- **Payment.** `pricePaidMinor` records the price at booking time; no money moves.
- **Pagination** on showtimes.
