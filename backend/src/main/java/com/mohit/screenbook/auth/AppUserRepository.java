package com.mohit.screenbook.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    /** Callers normalise to lowercase first; the column is guaranteed lowercase. */
    Optional<AppUser> findByEmail(String email);
}