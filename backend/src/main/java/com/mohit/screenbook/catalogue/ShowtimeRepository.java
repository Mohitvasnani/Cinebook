package com.mohit.screenbook.catalogue;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Only used by the booking path, to read the price at the moment of booking.
 * The showtimes list does not go through here, because it is a join that
 * matches no entity.
 */
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {
}
