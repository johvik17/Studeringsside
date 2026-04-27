package no.studyops.session.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import no.studyops.session.entity.SessionType;

public record StartSessionRequest(
        @NotNull SessionType type,
        String notes,
        UUID courseId
) {}
