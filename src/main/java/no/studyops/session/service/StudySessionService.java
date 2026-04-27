package no.studyops.session.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Comparator;
import java.util.Map;

import no.studyops.course.repository.CourseRepository;
import no.studyops.session.dto.DailySummaryResponse;
import no.studyops.session.dto.SessionResponse;
import no.studyops.session.dto.StartSessionRequest;
import no.studyops.session.dto.TypeSummaryResponse;
import no.studyops.session.entity.StudySession;
import no.studyops.session.repository.StudySessionRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudySessionService {

    private final StudySessionRepository repo;
    private final CourseRepository courseRepository;

    public StudySessionService(StudySessionRepository repo, CourseRepository courseRepository) {
        this.repo = repo;
        this.courseRepository = courseRepository;
    }

    @Transactional
    public SessionResponse start(Long userId, StartSessionRequest req) {
        repo.findFirstByUserIdAndEndTimeIsNullOrderByStartTimeDesc(userId)
                .ifPresent(active -> { throw new IllegalStateException("You already have an active session"); });

        StudySession session = repo.save(new StudySession(userId, req.type(), Instant.now(), req.notes()));
        if (req.courseId() != null) {
            courseRepository.findByIdAndUserId(req.courseId(), userId)
                    .orElseThrow(() -> new IllegalArgumentException("Course not found"));
            session.setCourseId(req.courseId());
        }
        return toResponse(session);
    }

    @Transactional
    public SessionResponse stop(Long userId, Long sessionId) {
        StudySession session = repo.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        if (!session.isActive()) {
            throw new IllegalStateException("Session is already stopped");
        }

        Instant end = Instant.now();
    Duration d = Duration.between(session.getStartTime(), end);

    long minutes = d.toMinutes();
    if (minutes == 0 && d.getSeconds() > 0) {
        minutes = 1;
    }
        session.stop(end, (int) minutes);
        return toResponse(session);
    }

    @Transactional(readOnly = true)
    public SessionResponse active(Long userId) {
        StudySession session = repo.findFirstByUserIdAndEndTimeIsNullOrderByStartTimeDesc(userId)
                .orElseThrow(() -> new IllegalArgumentException("No active session"));
        return toResponse(session);
    }

    private static SessionResponse toResponse(StudySession s) {
        return new SessionResponse(
                s.getId(),
                s.getType(),
                s.getStartTime(),
                s.getEndTime(),
                s.getDurationMinutes(),
                s.getNotes(),
                s.getCourseId()
        );
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> list(Long userId, int days, int limit) {

    if (days <= 0 || days > 365) {
        throw new IllegalArgumentException("days must be between 1 and 365");
    }
    if (limit <= 0 || limit > 1000) {
        throw new IllegalArgumentException("limit must be between 1 and 1000");
    }

    ZoneId zone = ZoneId.of("Europe/Oslo");
    LocalDate today = LocalDate.now(zone);
    LocalDate startDate = today.minusDays(days - 1L);
    Instant from = startDate.atStartOfDay(zone).toInstant();

    return repo.findByUserIdAndStartTimeAfterOrderByStartTimeDesc(userId, from)
            .stream()
            .limit(limit)
            .map(StudySessionService::toResponse)
            .toList();
}

@Transactional(readOnly = true)
public List<DailySummaryResponse> dailySummary(Long userId, int days) {

    if (days <= 0 || days > 365) {
        throw new IllegalArgumentException("days must be between 1 and 365");
    }

    ZoneId zone = ZoneId.of("Europe/Oslo");

    LocalDate today = LocalDate.now(zone);
    LocalDate startDate = today.minusDays(days - 1L);

    
    Instant from = startDate.atStartOfDay(zone).toInstant();

    var sessions = repo.findByUserIdAndStartTimeAfterOrderByStartTimeDesc(userId, from)
            .stream()
            .filter(s -> s.getEndTime() != null)
            .toList();

    Map<LocalDate, Integer> minutesByDate = sessions.stream()
            .collect(Collectors.groupingBy(
                    s -> LocalDate.ofInstant(s.getStartTime(), zone),
                    Collectors.summingInt(s -> s.getDurationMinutes() == null ? 0 : s.getDurationMinutes())
            ));

    
    return startDate.datesUntil(today.plusDays(1))
            .map(d -> new DailySummaryResponse(d, minutesByDate.getOrDefault(d, 0)))
            .sorted(Comparator.comparing(DailySummaryResponse::date))
            .toList();
}
@Transactional(readOnly = true)
public List<TypeSummaryResponse> byTypeSummary(Long userId, int days) {

    if (days <= 0 || days > 365) {
        throw new IllegalArgumentException("days must be between 1 and 365");
    }

    ZoneId zone = ZoneId.of("Europe/Oslo");
    LocalDate today = LocalDate.now(zone);
    LocalDate startDate = today.minusDays(days - 1L);
    Instant from = startDate.atStartOfDay(zone).toInstant();

    var sessions = repo.findByUserIdAndStartTimeAfterOrderByStartTimeDesc(userId, from)
            .stream()
            .filter(s -> s.getEndTime() != null)
            .toList();

    Map<no.studyops.session.entity.SessionType, Integer> minutesByType = sessions.stream()
            .collect(Collectors.groupingBy(
                    s -> s.getType(),
                    Collectors.summingInt(s -> s.getDurationMinutes() == null ? 0 : s.getDurationMinutes())
            ));

    return minutesByType.entrySet().stream()
            .map(e -> new TypeSummaryResponse(e.getKey(), e.getValue()))
            .sorted(Comparator.comparingInt(TypeSummaryResponse::minutes).reversed())
            .toList();
}
}
