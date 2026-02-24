package no.studyops.session.entity;

import java.time.Instant;
import jakarta.persistence.*;

@Entity
@Table(name = "study_sessions")
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SessionType type;

    @Column(name="start_time", nullable = false)
    private Instant startTime;

    @Column(name="end_time")
    private Instant endTime;

    @Column(name="duration_minutes")
    private Integer durationMinutes;

    @Column
    private String notes;

    protected StudySession() {}

    public StudySession(Long userId, SessionType type, Instant startTime, String notes) {
        this.userId = userId;
        this.type = type;
        this.startTime = startTime;
        this.notes = notes;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public SessionType getType() { return type; }
    public Instant getStartTime() { return startTime; }
    public Instant getEndTime() { return endTime; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public String getNotes() { return notes; }

    public boolean isActive() { return endTime == null; }

    public void stop(Instant endTime, int durationMinutes) {
        this.endTime = endTime;
        this.durationMinutes = durationMinutes;
    }
}