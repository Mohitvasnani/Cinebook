package com.mohit.cinebook;

import com.mohit.cinebook.booking.BookingService;
import com.mohit.cinebook.common.HoldAlreadyConvertedException;
import com.mohit.cinebook.common.SeatUnavailableException;
import com.mohit.cinebook.hold.HoldResponse;
import com.mohit.cinebook.hold.HoldService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Deliberately NOT annotated @Transactional. A transaction on the test would
 * wrap everything, the service calls would join it instead of opening their
 * own, every thread would share one connection, and there would be no
 * concurrency left to test. The rollback at the end would then hide the fact
 * that nothing was proved.
 *
 * So these tests leave rows behind. That is fine: the container is thrown away
 * when the run ends.
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
                holds.claim(target.showtimeId(), target.seatId());
                return "WON";
            } catch (SeatUnavailableException e) {
                return "LOST";
            }
        });

        assertEquals(1, count(outcomes, "WON"),
                "exactly one claim should win");
        assertEquals(CONTENDERS - 1, count(outcomes, "LOST"),
                "every other claim should be told the seat is unavailable");
        assertEquals(1, liveHolds(target),
                "the database should contain exactly one live hold for that seat");
    }

    @Test
    @DisplayName("two simultaneous confirmations of one hold produce exactly one booking")
    void confirmRace() throws Exception {
        Target target = someAvailableSeat();
        HoldResponse hold = holds.claim(target.showtimeId(), target.seatId());
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
        assertEquals(1, bookingsFor(target),
                "the database should contain exactly one booking for that seat");
    }

    /**
     * Runs the same task on n threads released at the same instant.
     *
     * The barrier is the whole point. Without it the threads start whenever the
     * pool gets round to them, which can be far enough apart that they never
     * overlap, and then the test passes without having tested anything.
     */
    private <T> List<T> runTogether(int n, Callable<T> task) throws Exception {
        CyclicBarrier startLine = new CyclicBarrier(n);
        ExecutorService pool = Executors.newFixedThreadPool(n);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                futures.add(pool.submit(() -> {
                    startLine.await(10, TimeUnit.SECONDS);
                    return task.call();
                }));
            }
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) {
                /* get() rethrows anything the task threw other than the two we
                   catch above, so an unexpected failure fails the test loudly
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

    private int liveHolds(Target target) {
        return jdbc.sql("""
                        SELECT count(*) FROM seat_hold
                        WHERE showtime_id = :showtimeId
                          AND seat_id     = :seatId
                          AND booked_at   IS NULL
                          AND released_at IS NULL
                          AND expires_at  > now()
                        """)
                .param("showtimeId", target.showtimeId())
                .param("seatId", target.seatId())
                .query(Integer.class).single();
    }

    private int bookingsFor(Target target) {
        return jdbc.sql("""
                        SELECT count(*) FROM booking
                        WHERE showtime_id = :showtimeId AND seat_id = :seatId
                        """)
                .param("showtimeId", target.showtimeId())
                .param("seatId", target.seatId())
                .query(Integer.class).single();
    }

    private static long count(List<String> outcomes, String outcome) {
        return outcomes.stream().filter(outcome::equals).count();
    }
}