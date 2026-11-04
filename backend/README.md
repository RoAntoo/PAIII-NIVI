# Subject: Programación Avanzada I
### Ing. y Lic. en Sistemas

## Domain summary

### Goal
- Develop endpoints that allow the management of the Project and Task entities.
- A Project has many Tasks.
- Implement business logic as use cases (application services) and expose REST endpoints.

  - #### Stage 1 (Usecases, domain, unit tests): Due date 2025-11-11
  - #### Stage 2 (Implementation, endpoints, persistence, tests): Due date 2025-11-18
  - #### Final submission / handoff: Due by 2025-11-19


### Global evaluation rules (apply to all teams)

* Java 21+; Spring Boot recommended. Any database to persist.
* Project must compile with Maven/Gradle on any environment.
* All unit tests must pass.
* Each functionality implemented in its own feature branch originating from develop.
* Packages: lowercase, organized model->aspect, e.g., projects.model, projects.repository, projects.use cases.
* Use custom exceptions and ControllerAdvice to map them to HTTP codes.
* Use factory/creator methods for domain objects (e.g., Project.create(...), Task.create(...)).
* Controllers should be thin; business rules live in use case classes.
* Provide DTOs and mappers to decouple API model and domain model.
* Domain model (fields & enums)


    Project
    id: Long
    name: String
    startDate: LocalDate
    endDate: LocalDate
    status: ProjectStatus (PLANNED, ACTIVE, CLOSED)
    description: String (optional)

    Task
    id: Long
    project: Project
    title: String
    estimateHours: Integer
    assignee: String (nullable)
    status: TaskStatus (TODO, IN_PROGRESS, DONE)
    finishedAt: LocalDateTime (nullable)
    createdAt: LocalDateTime

### Testing guidance
Unit tests: use JUnit 5 + Mockito. Test only use case logic with mocked repositories.
For time-dependent fields (finishedAt, createdAt), inject a Clock or TimeProvider to fake time in tests.
For bulk/batch endpoints return structured result: { "successes": [{ "index": 0, "task": { ... } }], "failures": [{ "index": 1, "error": "Estimate must be > 0" }] }

### Suggested implementation hints / design patterns

Use Repository interfaces and inject concrete JPA or in-memory implementations.
Use DTOs + Mapper to decouple API and domain.
Use UseCase classes per functionality to follow Single Responsibility and to make testing easier.
Use factory/static factory methods for domain creation validations.
Keep controllers as adapters mapping HTTP to DTOs and calling use cases.
Keep business exceptions expressive so ControllerAdvice can map them to correct HTTP codes.

### Git & branch workflow

Branch develop holds integration-ready code.
Each feature/use case must be implemented in a feature branch off develop and PR’ed back.
PR must include test run results and instructions; merging requires green CI.


Deliverable checklist per team
Implemented endpoints for team’s assigned use cases
Unit tests for use case classes (cover happy path + 2–3 error cases each)
Factory methods for domain objects
Custom exceptions with ControllerAdvice mapping
Branch per use case & PR to develop with description and tests

### Core business rules / validations (apply across use cases)

- Project.name must be unique.
- Project.endDate >= Project.startDate and when creating endDate must be >= today.
- All required fields must be present.
- Task.title mandatory; estimateHours > 0.
- Task.status limited to TODO | IN_PROGRESS | DONE.
- Cannot add a Task to a Project with status CLOSED.
- Creating a Task with status DONE sets finishedAt = now.
- Changing Project status to CLOSED prevents new tasks from being created for that project.
- Use custom exceptions: ResourceNotFoundException, BusinessRuleViolationException, DuplicateResourceException, ValidationException.

* Validation errors -> 400 Bad Request
* Duplicate resource (e.g., project name) -> 409 Conflict
* Not found -> 404 Not Found
* Business rule violation (e.g., adding task to closed project) -> 409 Conflict
* Successful creates -> 201 Created (with Location header)
* Idempotent updates/changes -> 200 OK

### JSON examples (requests/responses)

Create Project (POST /projects)
Request:
```json
{
"id": null,
"name": "Website Redesign",
"startDate": "2025-10-01",
"endDate": "2025-12-01",
"status": "ACTIVE",
"description": "Migrate and redesign website"
}
```
Response: 201 Created, body -> ProjectResponse

Create Task (POST /projects/{projectId}/tasks)
Request:
```json
{
"id": null,
"title": "Create landing page",
"estimateHours": 12,
"assignee": "alice",
"status": "TODO"
}
```
Response: 201 Created, body -> TaskResponse

### Usecases list

Team 1 (Create, FindAll & Update)
#### Required use cases:
- CreateProject
- CreateTask (under a project) — must verify project exists and is not CLOSED
- FindAllProjects (filters: status, startDate≥, endDate≤)
- UpdateProject (name, dates, description) — enforce uniqueness on updated name
- UpdateTask (title, estimateHours, assignee)
#### Endpoints to implement:
- POST /projects
- POST /projects/{projectId}/tasks
- GET /projects?status=ACTIVE
- PUT /projects/{projectId}
- PUT /projects/{projectId}/tasks/{taskId}

