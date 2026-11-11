package com.pa.proyecto.backend_integrator.core.input.DTO;


/** Partial task update; presence of assignee distinguishes omission from explicit null. */
public final class UpdateTaskDTO {
    private String title;
    private Integer estimateHours;
    private String assignee;
    private boolean assigneePresent;
    private com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus status;
    private com.pa.proyecto.backend_integrator.core.model.enums.TaskCategory category;

    public com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus status() { return status; }
    public void setStatus(com.pa.proyecto.backend_integrator.core.model.enums.TaskStatus status) { this.status = status; }
    public com.pa.proyecto.backend_integrator.core.model.enums.TaskCategory category() { return category; }
    public void setCategory(com.pa.proyecto.backend_integrator.core.model.enums.TaskCategory category) { this.category = category; }

    /** Creates an empty update for the caller's property-based deserialization. */
    public UpdateTaskDTO() {}

    /** Creates an update with an explicitly supplied assignee, including null. */
    public UpdateTaskDTO(String title, Integer estimateHours, String assignee) {
        this.title = title;
        this.estimateHours = estimateHours;
        setAssignee(assignee);
    }

    /** Returns the optional replacement title. */
    public String title() { return title; }

    /** Returns the optional replacement estimate. */
    public Integer estimateHours() { return estimateHours; }

    /** Returns the supplied assignee; consult hasAssignee to distinguish omission. */
    public String assignee() { return assignee; }

    /** Reports whether the request explicitly supplied assignee. */
    public boolean hasAssignee() { return assigneePresent; }

    /** Binds the optional title from input. */
    public void setTitle(String title) { this.title = title; }

    /** Binds the optional estimate from input. */
    public void setEstimateHours(Integer estimateHours) { this.estimateHours = estimateHours; }

    /** Records field presence even when the caller binds an explicit input null. */
    public void setAssignee(String assignee) {
        this.assignee = assignee;
        this.assigneePresent = true;
    }
}
