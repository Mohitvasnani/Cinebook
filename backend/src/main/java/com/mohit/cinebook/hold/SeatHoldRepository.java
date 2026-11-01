package com.mohit.cinebook.hold;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface SeatHoldRepository extends JpaRepository<SeatHold, UUID> {

    /**
     * Releases a hold only if it has not already ended, and reports how many
     * rows that touched.
     *
     * The check and the write are one statement, so they are atomic without a
     * lock and without the version. Two simultaneous releases produce one 1 and
     * one 0 rather than an optimistic-lock failure, which matters because
     * "already released" is not an error for a DELETE.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update SeatHold h
               set h.releasedAt = :now
             where h.id = :id
               and h.bookedAt is null
               and h.releasedAt is null
            """)
    int releaseIfActive(@Param("id") UUID id, @Param("now") Instant now);
}