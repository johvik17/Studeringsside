package no.studyops.auth.service;

public class EmailAlreadyInUseException extends RuntimeException {
    public EmailAlreadyInUseException() {
        super("Email is already in use");
    }
}
