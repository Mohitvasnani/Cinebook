package com.mohit.screenbook.booking;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final IdempotentBookings bookings;

    BookingController(IdempotentBookings bookings) {
        this.bookings = bookings;
    }

    /**
     * Idempotency-Key is optional, so a request without one behaves as it
     * always did. With one, a retry returns the original booking rather than a
     * 409, which is what a client that lost its connection actually needs.
     */
    @PostMapping
    public ResponseEntity<BookingResponse> create(
            @Valid @RequestBody CreateBookingRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {

        BookingResponse booking = bookings.confirm(request.holdId(), idempotencyKey);
        return ResponseEntity
                .created(URI.create("/api/bookings/" + booking.bookingReference()))
                .body(booking);
    }

    @GetMapping("/{reference}")
    public BookingResponse get(@PathVariable String reference) {
        return bookings.find(reference);
    }
}