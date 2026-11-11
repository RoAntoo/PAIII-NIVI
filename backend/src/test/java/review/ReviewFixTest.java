package review;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pa.proyecto.backend_integrator.core.input.DTO.UpdateTaskDTO;
import com.pa.proyecto.backend_integrator.core.model.Task;
import com.pa.proyecto.backend_integrator.core.output.ITaskRepository;
import com.pa.proyecto.backend_integrator.core.usecase.UpdateTaskUseCase;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Regression checks for omitted, cleared and replaced assignees. */
class ReviewFixTest {
    /** Deserializes each request and checks the persisted assignee and repository call. */
    @Test void preservesPresenceThroughDeserializationAndSave() throws Exception {
        for (String request : new String[]{"{}", "{\"assignee\":null}", "{\"assignee\":\"Luis\"}"}) {
            UpdateTaskDTO dto = new ObjectMapper().readValue(request, com.pa.proyecto.backend_integrator.adapter.web.UpdateTaskRequest.class).toCommand();
            Task task = new Task(); task.setAssignee("Ana");
            ITaskRepository repository = mock(ITaskRepository.class);
            when(repository.findById(1L)).thenReturn(Optional.of(task));
            when(repository.save(task)).thenReturn(task);
            Task saved = new UpdateTaskUseCase(repository).updateTask(1L,dto);
            assertEquals(request.equals("{}") ? "Ana" : request.contains("Luis") ? "Luis" : null, saved.getAssignee());
            assertEquals(!request.equals("{}"), dto.hasAssignee());
            verify(repository).save(task);
        }
    }
}
