package no.studyops.course.service;

import no.studyops.course.dto.CourseResponse;
import no.studyops.course.dto.CreateCourseRequest;
import no.studyops.course.dto.UpdateCourseRequest;
import no.studyops.course.entity.Course;
import no.studyops.course.repository.CourseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class CourseService {

    private final CourseRepository courseRepository;

    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    public List<CourseResponse> list(Long userId) {
        return courseRepository.findAllByUserIdOrderByNameAsc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public CourseResponse create(Long userId, CreateCourseRequest request) {
        if (courseRepository.existsByUserIdAndNameIgnoreCase(userId, request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Course name is already in use");
        }

        Course course = Course.builder()
                .userId(userId)
                .name(request.name().trim())
                .code(request.code() != null ? request.code().trim() : null)
                .color(request.color() != null ? request.color().trim() : null)
                .build();

        Course saved = courseRepository.save(course);
        return toResponse(saved);
    }

    public CourseResponse update(Long userId, UUID courseId, UpdateCourseRequest request) {
        Course course = courseRepository.findByIdAndUserId(courseId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found"));

        if (request.name() != null) {
            String newName = request.name().trim();
            if (!newName.equalsIgnoreCase(course.getName())
                    && courseRepository.existsByUserIdAndNameIgnoreCase(userId, newName)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Course name is already in use");
            }
            course.setName(newName);
        }
        if (request.code() != null) course.setCode(request.code().trim());
        if (request.color() != null) course.setColor(request.color().trim());

        Course saved = courseRepository.save(course);
        return toResponse(saved);
    }

    public void delete(Long userId, UUID courseId) {
        Course course = courseRepository.findByIdAndUserId(courseId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found"));
        courseRepository.delete(course);
    }

    private CourseResponse toResponse(Course c) {
        return new CourseResponse(c.getId(), c.getName(), c.getCode(), c.getColor(), c.getCreatedAt());
    }
}