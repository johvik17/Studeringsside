package no.studyops.session.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import no.studyops.session.entity.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    Optional<StudySession> findByIdAndUserId(Long id, Long userId);

    List<StudySession> findByUserIdAndStartTimeAfterOrderByStartTimeDesc(
        Long userId,
        Instant from
    );
    Optional<StudySession> findFirstByUserIdAndEndTimeIsNullOrderByStartTimeDesc(Long userId);
}