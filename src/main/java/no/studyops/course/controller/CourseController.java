package no.studyops.course.controller;

import jakarta.validation.Valid;
import no.studyops.course.dto.CourseResponse;
import no.studyops.course.dto.CreateCourseRequest;
import no.studyops.course.dto.UpdateCourseRequest;
import no.studyops.course.service.CourseService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public List<CourseResponse> list(@AuthenticationPrincipal Jwt jwt) {
        Long userId = resolveUserId(jwt);
        return courseService.list(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CourseResponse create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateCourseRequest request
    ) {
        Long userId = resolveUserId(jwt);
        return courseService.create(userId, request);
    }

    @PatchMapping("/{id}")
    public CourseResponse update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateCourseRequest request
    ) {
        Long userId = resolveUserId(jwt);
        return courseService.update(userId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") UUID id) {
        Long userId = resolveUserId(jwt);
        courseService.delete(userId, id);
    }

    private Long resolveUserId(Jwt jwt) {
    Object uid = jwt.getClaims().get("uid");
    if (uid == null) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "JWT missing uid claim");
    }
    if (uid instanceof Number n) return n.longValue();
    return Long.parseLong(uid.toString());
}
}