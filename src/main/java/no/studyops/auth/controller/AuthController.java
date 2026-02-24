package no.studyops.auth.controller;

import jakarta.validation.Valid;
import no.studyops.auth.dto.AuthResponse;
import no.studyops.auth.dto.LoginRequest;
import no.studyops.auth.dto.RegisterRequest;
import no.studyops.auth.dto.TokenResponse;
import no.studyops.auth.service.AuthService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }
}