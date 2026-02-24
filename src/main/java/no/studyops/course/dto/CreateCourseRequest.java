package no.studyops.course.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCourseRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 40) String code,
        @Size(max = 32) String color
) {}