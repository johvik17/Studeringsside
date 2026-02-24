package no.studyops.session.dto;

import jakarta.validation.constraints.NotNull;
import no.studyops.session.entity.SessionType;

public record StartSessionRequest(
        @NotNull SessionType type,
        String notes
) {}