# ScreenBook Design Brief

Handoff spec for designing the screens. Describes what each screen is for, what
data it shows, and every state it has to handle. Visual direction is open; the
constraints at the bottom are not.

## What this is

A cinema seat booking app. You pick a screening, pick a seat, the seat is held
for you for five minutes, then you confirm and get a booking reference.

The engineering point of the project is that two people must never book the same
seat. One screen exists purely to show that happening. Everything else is an
ordinary booking flow.

Mobile-first. Must work at 375px wide.

---

## Pages (5)

### 1. `/` Showtimes

**Role:** pick a screening. The entry point.

**Shows:** a list of 5 showtimes. Each has film title, screen name, start time,
runtime, ticket price, and how many of 120 seats are free.

**Action:** tap a showtime, go to its seat map.

**States:** loading, loaded, empty (no screenings), error with retry.

### 2. `/showtimes/[id]` Seat selection

**Role:** the core screen. Choose a seat and claim it.

**Shows:** a header with the film, screen and time, then a seat map of 120 seats
in 10 rows (A to J) of 12.

**Action:** tap an available seat to select it, then press Hold. That claims the
seat for 300 seconds and moves to checkout.

**States:** loading skeleton, loaded, unknown showtime (404), load error.

**The conflict state matters most:** between the map rendering and the user
tapping, someone else can take that seat. The hold request comes back 409, the
seat has to flip to its new state in place, and the user needs a short, calm
message telling them to pick another. This is not an error page, it is a normal
thing that happens.

### 3. `/hold/[holdId]` Checkout

**Role:** confirm the held seat before the hold lapses.

**Shows:** the held seat, the showtime, the price, and a countdown to expiry.

**Action:** confirm, which converts the hold into a booking.

**States:** loading, active (timer running), urgent (under 60 seconds left),
expired, already confirmed, submitting, error.

The countdown is the centre of this screen. It should create mild urgency
without feeling like a scam countdown.

### 4. `/bookings/[ref]` Confirmation

**Role:** proof of booking. Reloadable and shareable by URL.

**Shows:** booking reference (`CB-7F3K2Q`), film, screen, start time, seat, price
paid, time booked.

**Action:** none, terminal screen. Copying the reference is useful.

**States:** loading, loaded, unknown reference (404).

The reference is the hero. It is designed to be read aloud, so it needs to be
large and unambiguous.

### 5. `/race` Concurrency demo

**Role:** make the invisible engineering visible. Fires two hold requests at the
same seat at the same instant and shows that exactly one wins.

**Shows:** a showtime and seat picker, a Fire button, then two request lanes side
by side, each with its method and path, status code, response time, and outcome.
One reads 201 WON, the other 409 LOST.

**States:** idle, in flight, resolved, plus a permanent note saying whether this
is running against the mock or the real API.

This page is the reason the project exists. It is the one screen a technical
viewer will remember.

---

## Components

### Shell
| Component | Role | States |
|---|---|---|
| `SiteHeader` | wordmark, mode badge, link to the race demo | default, scrolled |
| `ModeBanner` | one line: mock data or live API | demo, live |
| `SiteFooter` | links to the repo and the API docs | one |

### Showtimes
| Component | Role | States |
|---|---|---|
| `ShowtimeCard` | one screening | default, hover, focus, nearly full, sold out (not tappable) |
| `ShowtimeList` | the list | loading, loaded, empty, error |

### Seat selection
| Component | Role | States |
|---|---|---|
| `ScreenCurve` | the "SCREEN" marker above the grid | one |
| `SeatMap` | the grid, including aisles | loading, loaded |
| `SeatRow` | row letter at both ends plus 12 seats | one |
| `Seat` | **the hard one.** One seat | available, selected, held by someone else, booked, hover, keyboard focus, pending |
| `SeatLegend` | key to the four seat states | one |
| `SelectionSummary` | chosen seat, price, Hold button | nothing selected, selected, submitting, conflict |
| `ConflictNotice` | "that seat just went, pick another" | one |

### Checkout
| Component | Role | States |
|---|---|---|
| `HoldCountdown` | time left on the hold | comfortable, urgent, expired |
| `HeldSeatSummary` | film, screen, time, seat, price | one |
| `ConfirmButton` | convert hold to booking | idle, submitting, disabled |
| `ExpiredNotice` | hold lapsed, with a route back | one |

### Confirmation
| Component | Role | States |
|---|---|---|
| `TicketStub` | the booking itself | one |
| `CopyReference` | copy the code | idle, copied |

### Race demo
| Component | Role | States |
|---|---|---|
| `RaceSetup` | showtime and seat pickers, Fire button | idle, firing |
| `RequestLane` | one of the two requests | waiting, in flight, won, lost |
| `OutcomeBadge` | 201 WON / 409 LOST | won, lost |
| `ModeCaveat` | what this proves in each mode | demo, live |

### Shared
`Button` (idle, hover, focus, loading, disabled), `StatusPill`, `Skeleton`,
`ErrorState` with retry, `EmptyState`.

---

## The five real design problems

Worth spending the effort here. Everything else is straightforward.

1. **120 seats at 375px wide.** Twelve seats across leaves roughly 26px each
   including gutters. Decide: scale down, scroll horizontally, or zoom.
2. **Four seat states without relying on colour.** Red and green is the obvious
   choice and the worst one. Shape, fill pattern, border weight, opacity or a
   glyph has to carry the meaning too.
3. **Aisles.** What separates a cinema from a grid of squares is the gaps. Decide
   where they fall and how rows are labelled.
4. **The countdown.** Urgency without anxiety, and not through colour alone.
5. **The race page.** A developer-facing screen inside a consumer-facing app.
   Decide whether it matches the rest of the site or deliberately looks like a
   debugging tool.

---

## Fixed. Not open to design

These come from the API and changing them means changing the backend.

- 10 rows labelled A to J, 12 seats per row, 120 seats total, one screen layout
- A hold lasts 300 seconds
- **One seat per hold.** There is no basket and no multi-seat selection. The
  summary shows exactly one seat
- Prices in GBP
- No login, no account, no payment step. Nobody signs in
- Booking references are `CB-` followed by 6 characters
- Seat states are exactly four: AVAILABLE, HELD, BOOKED, and the user's own
  SELECTED before they press Hold
- Must work at 375px
