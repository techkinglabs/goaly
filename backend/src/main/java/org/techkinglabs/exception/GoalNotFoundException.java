package org.techkinglabs.exception;

public class GoalNotFoundException extends ResourceNotFoundException {
    public GoalNotFoundException(Long goalId) {
        super("Goal not found with id: " + goalId);
    }
}
