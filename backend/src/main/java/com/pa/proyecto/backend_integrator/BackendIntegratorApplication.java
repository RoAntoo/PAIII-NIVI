package com.pa.proyecto.backend_integrator;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories
public class BackendIntegratorApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendIntegratorApplication.class, args);
	}

}
