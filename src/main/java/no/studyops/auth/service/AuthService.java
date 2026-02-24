package no.studyops.auth.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;


import no.studyops.auth.dto.AuthResponse;
import no.studyops.auth.dto.LoginRequest;
import no.studyops.auth.dto.RegisterRequest;
import no.studyops.auth.dto.TokenResponse;
import no.studyops.user.entity.User;
import no.studyops.user.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final String issuer;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder,
            @org.springframework.beans.factory.annotation.Value("${app.security.jwt.issuer:studyops}") String issuer
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.issuer = issuer;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already in use");
        }

        String passwordHash = passwordEncoder.encode(req.password());
        User user = userRepository.save(new User(email, passwordHash));
        return new AuthResponse(user.getId(), user.getEmail());
    }

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        Instant now = Instant.now();
        long expiresIn = 60 * 60; 
        Instant exp = now.plus(expiresIn, ChronoUnit.SECONDS);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(exp)
                .subject(user.getEmail())            
                .claim("uid", user.getId())          
                .claim("email", user.getEmail())
                .build();

        var header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new TokenResponse(token, "Bearer", expiresIn);
    }
}