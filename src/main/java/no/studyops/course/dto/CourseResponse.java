package no.studyops.course.dto;

import java.time.Instant;
import java.util.UUID;

public record CourseResponse(
        UUID id,
        String name,
        String code,
        String color,
        Instant createdAt
) {}