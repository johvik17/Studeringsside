package no.studyops.session.dto;

import java.time.Instant;
import java.util.UUID;
import no.studyops.session.entity.SessionType;

public record SessionResponse(
        Long id,
        SessionType type,
        Instant startTime,
        Instant endTime,
        Integer durationMinutes,
        String notes,
        UUID courseId
) {}
