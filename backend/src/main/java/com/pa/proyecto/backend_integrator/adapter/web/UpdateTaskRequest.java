package com.pa.proyecto.backend_integrator.adapter.web;

import com.fasterxml.jackson.annotation.JsonSetter;

/** Partial task update; presence of assignee distinguishes omission from explicit null. */
public final class UpdateTaskRequest {
    private String title;
    private Integer estimateHours;
    private String assignee;
    private boolean assigneePresent;

    /** Creates an empty update for Jackson's property-based deserialization. */
    public UpdateTaskRequest() {}

    /** Creates an update with an explicitly supplied assignee, including null. */
    public UpdateTaskRequest(String title, Integer estimateHours, String assignee) {
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

    /** Binds the optional title from JSON. */
    @JsonSetter("title")
    public void setTitle(String title) { this.title = title; }

    /** Binds the optional estimate from JSON. */
    @JsonSetter("estimateHours")
    public void setEstimateHours(Integer estimateHours) { this.estimateHours = estimateHours; }

    /** Records field presence even when Jackson binds an explicit JSON null. */
    @JsonSetter("assignee")
    public void setAssignee(String assignee) {
        this.assignee = assignee;
        this.assigneePresent = true;
    }
    public com.pa.proyecto.backend_integrator.core.input.DTO.UpdateTaskDTO toCommand() {
        var command = new com.pa.proyecto.backend_integrator.core.input.DTO.UpdateTaskDTO();
        command.setTitle(title); command.setEstimateHours(estimateHours);
        if (assigneePresent) command.setAssignee(assignee);
        return command;
    }
}
