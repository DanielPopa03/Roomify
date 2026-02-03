package com.roomify;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // Enables @Scheduled tasks (e.g., PropertyView cleanup)
@EnableAsync // Enables @Async methods (e.g., async view logging)
public class RoomifyApplication {

	public static void main(String[] args) {
		SpringApplication.run(RoomifyApplication.class, args);
	}

}
