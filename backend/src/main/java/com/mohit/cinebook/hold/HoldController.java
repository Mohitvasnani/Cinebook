package com.mohit.cinebook.hold;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/holds")
public class HoldController {

    private final HoldService holds;

    HoldController(HoldService holds) {
        this.holds = holds;
    }

    @PostMapping
    public ResponseEntity<HoldResponse> create(@Valid @RequestBody CreateHoldRequest request) {
        HoldResponse hold = holds.claim(request.showtimeId(), request.seatId());
        return ResponseEntity
                .created(URI.create("/api/holds/" + hold.holdId()))
                .body(hold);
    }

    @GetMapping("/{holdId}")
    public HoldDetailResponse get(@PathVariable UUID holdId) {
        return holds.get(holdId);
    }

    @DeleteMapping("/{holdId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void release(@PathVariable UUID holdId) {
        holds.release(holdId);
    }
}