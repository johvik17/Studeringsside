package no.studyops.course.repository;

import no.studyops.course.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {

    List<Course> findAllByUserIdOrderByNameAsc(Long userId);

    Optional<Course> findByIdAndUserId(UUID id, Long userId);

    boolean existsByUserIdAndNameIgnoreCase(Long userId, String name);
}