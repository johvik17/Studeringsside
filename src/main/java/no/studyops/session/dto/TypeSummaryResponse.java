package no.studyops.session.dto;

import no.studyops.session.entity.SessionType;

public record TypeSummaryResponse(
        SessionType type,
        int minutes
) {}