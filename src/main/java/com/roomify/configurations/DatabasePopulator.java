package com.roomify.configurations;

import com.roomify.model.Role;
import com.roomify.repository.RoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabasePopulator {

    @Bean
    public CommandLineRunner initDatabase(RoleRepository roleRepository) {
        return args -> {

            if (!roleRepository.existsByName("ADMIN")) {
                roleRepository.save(new Role("ADMIN"));
            }

            if (!roleRepository.existsByName("USER")) {
                roleRepository.save(new Role("USER"));
            }

            if (!roleRepository.existsByName("LANDLORD")) {
                roleRepository.save(new Role("LANDLORD"));
            }

            System.out.println("Database populated with default roles.");
        };
    }
}
