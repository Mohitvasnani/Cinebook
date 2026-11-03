package com.mohit.screenbook.catalogue;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "showtime")
public class Showtime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "film_id", nullable = false)
    private Long filmId;

    @Column(name = "screen_id", nullable = false)
    private Long screenId;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "price_minor", nullable = false)
    private int priceMinor;

    @Column(nullable = false)
    private String currency;

    protected Showtime() {
    }

    public Long getId() { return id; }
    public Long getFilmId() { return filmId; }
    public Long getScreenId() { return screenId; }
    public Instant getStartsAt() { return startsAt; }
    public int getPriceMinor() { return priceMinor; }
    public String getCurrency() { return currency; }
}