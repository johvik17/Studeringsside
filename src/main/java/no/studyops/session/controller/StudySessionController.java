package no.studyops.session.controller;

import jakarta.validation.Valid;
import java.util.List;

import no.studyops.session.dto.DailySummaryResponse;
import no.studyops.session.dto.SessionResponse;
import no.studyops.session.dto.StartSessionRequest;
import no.studyops.session.dto.TypeSummaryResponse;
import no.studyops.session.service.StudySessionService;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessions")
public class StudySessionController {

    private final StudySessionService service;

    public StudySessionController(StudySessionService service) {
        this.service = service;
    }

    @PostMapping("/start")
    public SessionResponse start(@AuthenticationPrincipal Jwt jwt,
                                 @Valid @RequestBody StartSessionRequest req) {
        Long userId = jwt.getClaim("uid");
        return service.start(userId, req);
    }

    @PostMapping("/{id}/stop")
    public SessionResponse stop(@AuthenticationPrincipal Jwt jwt,
                                @PathVariable Long id) {
        Long userId = jwt.getClaim("uid");
        return service.stop(userId, id);
    }

    @GetMapping("/active")
    public SessionResponse active(@AuthenticationPrincipal Jwt jwt) {
        Long userId = jwt.getClaim("uid");
        return service.active(userId);
    }

    // Dashboard: list
    @GetMapping
    public List<SessionResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "200") int limit
    ) {
        Long userId = jwt.getClaim("uid");
        return service.list(userId, days, limit);
    }

    // Dashboard: daily
    @GetMapping("/summary/daily")
    public List<DailySummaryResponse> dailySummary(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "7") int days
    ) {
        Long userId = jwt.getClaim("uid");
        return service.dailySummary(userId, days);
    }

    // Dashboard: by type
    @GetMapping("/summary/by-type")
    public List<TypeSummaryResponse> byTypeSummary(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "7") int days
    ) {
        Long userId = jwt.getClaim("uid");
        return service.byTypeSummary(userId, days);
    }

}