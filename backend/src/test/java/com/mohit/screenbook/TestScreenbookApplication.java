package com.mohit.screenbook;

import org.springframework.boot.SpringApplication;

public class TestScreenbookApplication {

	public static void main(String[] args) {
		SpringApplication.from(ScreenbookApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
