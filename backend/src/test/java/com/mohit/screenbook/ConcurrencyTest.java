package com.mohit.screenbook;

import com.mohit.screenbook.booking.BookingService;
import com.mohit.screenbook.common.HoldAlreadyConvertedException;
import com.mohit.screenbook.common.SeatsUnavailableException;
import com.mohit.screenbook.common.UnavailableSeat;
import com.mohit.screenbook.hold.HoldResponse;
import com.mohit.screenbook.hold.HoldService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Deliberately NOT annotated @Transactional. A transaction on the test would
 * wrap everything, the service calls would join it instead of opening their
 * own, every thread would share one connection, and there would be no
 * concurrency left to test. The rollback at the end would then hide the fact
 * that nothing was proved.
 *
 * So these tests leave rows behind. That is fine: the container is thrown away
 * when the run ends, and every test picks fresh seats from the availability
 * view, which already excludes anything an earlier test claimed.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class ConcurrencyTest {

    /**
     * Eight, not eighty. Each contender holds a connection while it blocks on
     * the seat lock, and Hikari's default pool is ten. Ask for more contenders
     * than connections and the test hangs on the pool rather than proving
     * anything, which is itself the honest limitation of a pessimistic lock.
     */
    private static final int CONTENDERS = 8;

    @Autowired
    HoldService holds;

    @Autowired
    BookingService bookings;

    @Autowired
    JdbcClient jdbc;

    @Test
    @DisplayName("eight simultaneous claims on one seat produce exactly one hold")
    void claimRace() throws Exception {
        Target target = someAvailableSeat();

        List<String> outcomes = runTogether(CONTENDERS, () -> {
            try {
                holds.claim(target.showtimeId(), List.of(target.seatId()));
                return "WON";
            } catch (SeatsUnavailableException e) {
                return "LOST";
            }
        });

        assertEquals(1, count(outcomes, "WON"),
                "exactly one claim should win");
        assertEquals(CONTENDERS - 1, count(outcomes, "LOST"),
                "every other claim should be told the seat is unavailable");
        assertEquals(1, liveHolds(target.showtimeId(), target.seatId()),
                "the database should contain exactly one live hold for that seat");
    }

    @Test
    @DisplayName("two simultaneous confirmations of one hold produce exactly one booking")
    void confirmRace() throws Exception {
        Target target = someAvailableSeat();
        HoldResponse hold = holds.claim(target.showtimeId(), List.of(target.seatId()));
        UUID holdId = hold.holdId();

        List<String> outcomes = runTogether(2, () -> {
            try {
                bookings.confirm(holdId);
                return "WON";
            } catch (HoldAlreadyConvertedException e) {
                return "LOST";
            }
        });

        assertEquals(1, count(outcomes, "WON"),
                "exactly one confirmation should win");
        assertEquals(1, count(outcomes, "LOST"),
                "the other should be told the hold is already converted");
        assertEquals(1, bookedSeats(target.showtimeId(), target.seatId()),
                "the database should contain exactly one booked seat");
    }

    /**
     * The reason sorted lock acquisition exists.
     *
     * Two requests want the same two seats in opposite orders. Locking in the
     * order asked, each would take one seat and then wait for the other, and
     * Postgres would break the cycle a second later by killing one transaction
     * with SQLSTATE 40P01, which Spring surfaces as CannotAcquireLockException.
     *
     * Claiming in ascending seat id order makes that cycle unformable: the
     * second request blocks on the lower seat before it holds anything, so it
     * is waiting on a transaction that is waiting on nobody. One request wins
     * outright and the other gets a clean 409.
     *
     * To see this test earn its keep, delete the .sorted() in HoldService.claim
     * and run it again. A concurrency test you have never watched fail is a
     * test you cannot trust.
     */
    @Test
    @DisplayName("opposite claim orders on the same seats do not deadlock")
    void noDeadlockOnOppositeOrders() throws Exception {
        List<Target> pair = availableSeatsInOneShowtime(2);
        long showtimeId = pair.getFirst().showtimeId();
        long low = pair.get(0).seatId();
        long high = pair.get(1).seatId();

        Callable<String> ascending = () -> attemptClaim(showtimeId, List.of(low, high));
        Callable<String> descending = () -> attemptClaim(showtimeId, List.of(high, low));

        List<String> outcomes = runTogether(List.of(ascending, descending));

        assertEquals(0, count(outcomes, "DEADLOCK"),
                "a deadlock means the locks were not taken in a consistent order");
        assertEquals(1, count(outcomes, "WON"),
                "exactly one request should get both seats");
        assertEquals(1, count(outcomes, "LOST"),
                "the other should be told the seats have gone, not deadlocked");
    }

    /**
     * All or nothing. One seat of the two is already held, so the claim fails,
     * and the seat that WAS free must still be free afterwards.
     *
     * This is the half of the contract that a 409 alone does not prove: the
     * request could have failed while still having written a row for the seat
     * it did get.
     */
    @Test
    @DisplayName("a claim that loses one seat claims none of them")
    void partialFailureClaimsNothing() {
        List<Target> pair = availableSeatsInOneShowtime(2);
        long showtimeId = pair.getFirst().showtimeId();
        long free = pair.get(0).seatId();
        long taken = pair.get(1).seatId();

        holds.claim(showtimeId, List.of(taken));

        SeatsUnavailableException thrown = assertThrows(SeatsUnavailableException.class,
                () -> holds.claim(showtimeId, List.of(free, taken)));

        assertEquals(0, liveHolds(showtimeId, free),
                "the seat that was available must not have been claimed");

        @SuppressWarnings("unchecked")
        List<UnavailableSeat> lost =
                (List<UnavailableSeat>) thrown.getExtras().get("unavailableSeats");

        assertEquals(1, lost.size(), "only the taken seat should be reported");
        assertEquals(taken, lost.getFirst().seatId(),
                "the reported seat should be the one that was already held");
    }

    /**
     * The happy path, which is also the only thing that proves the element
     * collection actually writes rows. If HoldSeat were mapped wrongly this
     * would pass its assertions on the response and still leave hold_seat
     * empty, so the row count is checked directly.
     */
    @Test
    @DisplayName("a three seat claim writes one hold with three seats")
    void multiSeatClaimPersistsEverySeat() {
        List<Target> three = availableSeatsInOneShowtime(3);
        long showtimeId = three.getFirst().showtimeId();
        List<Long> seatIds = three.stream().map(Target::seatId).toList();

        HoldResponse hold = holds.claim(showtimeId, seatIds);

        assertEquals(3, hold.seats().size(), "the response should list three seats");
        assertEquals(
                hold.seats().stream().mapToInt(seat -> seat.priceMinor()).sum(),
                hold.totalMinor(),
                "the total should be the sum of the seat prices");
        assertEquals(3, holdSeatRows(hold.holdId()),
                "hold_seat should contain one row per seat");
    }

    /* ------------------------------------------------------------- plumbing */

    private String attemptClaim(long showtimeId, List<Long> seatIds) {
        try {
            holds.claim(showtimeId, seatIds);
            return "WON";
        } catch (SeatsUnavailableException e) {
            return "LOST";
        } catch (CannotAcquireLockException e) {
            /* Caught and named rather than allowed to propagate, so a failure
               reads as "deadlocked" instead of as a stack trace. */
            return "DEADLOCK";
        }
    }

    /**
     * Runs the same task on n threads released at the same instant.
     *
     * The barrier is the whole point. Without it the threads start whenever the
     * pool gets round to them, which can be far enough apart that they never
     * overlap, and then the test passes without having tested anything.
     */
    private <T> List<T> runTogether(int n, Callable<T> task) throws Exception {
        return runTogether(Collections.nCopies(n, task));
    }

    /** Different tasks on one start line, for races between unlike requests. */
    private <T> List<T> runTogether(List<Callable<T>> tasks) throws Exception {
        CyclicBarrier startLine = new CyclicBarrier(tasks.size());
        ExecutorService pool = Executors.newFixedThreadPool(tasks.size());
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (Callable<T> task : tasks) {
                futures.add(pool.submit(() -> {
                    startLine.await(10, TimeUnit.SECONDS);
                    return task.call();
                }));
            }
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) {
                /* get() rethrows anything the task threw other than the ones
                   caught above, so an unexpected failure fails the test loudly
                   instead of being counted as a loss. */
                results.add(future.get(30, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    private record Target(long showtimeId, long seatId) {
    }

    private Target someAvailableSeat() {
        return jdbc.sql("""
                        SELECT showtime_id, seat_id
                        FROM seat_availability
                        WHERE status = 'AVAILABLE'
                        LIMIT 1
                        """)
                .query((rs, rowNum) -> new Target(
                        rs.getLong("showtime_id"), rs.getLong("seat_id")))
                .single();
    }

    /**
     * Several available seats in the SAME showtime, ordered by seat id, so a
     * test can ask for them in ascending or descending order deliberately.
     * The subquery picks a showtime that has enough of them rather than
     * assuming the first one does.
     */
    private List<Target> availableSeatsInOneShowtime(int howMany) {
        return jdbc.sql("""
                        SELECT showtime_id, seat_id
                        FROM seat_availability
                        WHERE status = 'AVAILABLE'
                          AND showtime_id = (
                              SELECT showtime_id
                              FROM seat_availability
                              WHERE status = 'AVAILABLE'
                              GROUP BY showtime_id
                              HAVING count(*) >= :howMany
                              ORDER BY showtime_id
                              LIMIT 1)
                        ORDER BY seat_id
                        LIMIT :howMany
                        """)
                .param("howMany", howMany)
                .query((rs, rowNum) -> new Target(
                        rs.getLong("showtime_id"), rs.getLong("seat_id")))
                .list();
    }

    /** Live holds covering one seat. Joins the child, since the seat lives there now. */
    private int liveHolds(long showtimeId, long seatId) {
        return jdbc.sql("""
                        SELECT count(*)
                        FROM seat_hold h
                        JOIN hold_seat hs ON hs.hold_id = h.id
                        WHERE hs.showtime_id = :showtimeId
                          AND hs.seat_id     = :seatId
                          AND h.booked_at    IS NULL
                          AND h.released_at  IS NULL
                          AND h.expires_at   > now()
                        """)
                .param("showtimeId", showtimeId)
                .param("seatId", seatId)
                .query(Integer.class).single();
    }

    private int bookedSeats(long showtimeId, long seatId) {
        return jdbc.sql("""
                        SELECT count(*) FROM booking_seat
                        WHERE showtime_id = :showtimeId AND seat_id = :seatId
                        """)
                .param("showtimeId", showtimeId)
                .param("seatId", seatId)
                .query(Integer.class).single();
    }

    private int holdSeatRows(UUID holdId) {
        return jdbc.sql("SELECT count(*) FROM hold_seat WHERE hold_id = :holdId")
                .param("holdId", holdId)
                .query(Integer.class).single();
    }

    private static long count(List<String> outcomes, String outcome) {
        return outcomes.stream().filter(outcome::equals).count();
    }
}