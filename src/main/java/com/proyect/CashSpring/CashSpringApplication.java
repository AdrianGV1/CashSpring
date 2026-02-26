package com.proyect.CashSpring;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CashSpringApplication {

	public static void main(String[] args) {
		SpringApplication.run(CashSpringApplication.class, args);
	}

}
