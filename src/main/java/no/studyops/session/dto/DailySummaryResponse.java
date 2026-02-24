package no.studyops.session.dto;

import java.time.LocalDate;

public record DailySummaryResponse(
        LocalDate date,
        int minutes
) {}