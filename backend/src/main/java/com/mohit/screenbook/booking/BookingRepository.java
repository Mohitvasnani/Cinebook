package com.mohit.screenbook.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Write side only. Reading a booking is a four-table join, so it goes through
 * BookingQuery rather than through here.
 */
public interface BookingRepository extends JpaRepository<Booking, UUID> {
}
