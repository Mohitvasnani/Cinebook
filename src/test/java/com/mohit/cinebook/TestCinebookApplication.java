package com.mohit.cinebook;

import org.springframework.boot.SpringApplication;

public class TestCinebookApplication {

	public static void main(String[] args) {
		SpringApplication.from(CinebookApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
