package com.mohit.screenbook.hold;

/**
 * One seat on a hold, as the API reports it. Field names are the JSON keys, so
 * this file and docs/api-contract.md have to agree.
 */
public record HeldSeatView(
        long seatId,
        String rowLabel,
        int seatNumber,
        String tier,
        int priceMinor
) {
}