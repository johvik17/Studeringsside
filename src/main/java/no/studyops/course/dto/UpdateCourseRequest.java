package no.studyops.course.dto;

import jakarta.validation.constraints.Size;

public record UpdateCourseRequest(
        @Size(max = 120) String name,
        @Size(max = 40) String code,
        @Size(max = 32) String color
) {}