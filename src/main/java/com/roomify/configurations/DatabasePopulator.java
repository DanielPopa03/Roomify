package com.roomify.configurations;

import com.roomify.model.*;
import com.roomify.model.enums.LayoutType;
import com.roomify.model.enums.PreferredTenantType;
import com.roomify.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Configuration
public class DatabasePopulator {

    @Bean
    public CommandLineRunner initDatabase(
            RoleRepository roleRepository,
            UserRepository userRepository,
            PropertyRepository propertyRepository) {
        return args -> {

            // Create default roles
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

            // Create test properties for danielpopa2003x@gmail.com
            createTestPropertiesForLandlord(userRepository, propertyRepository, roleRepository);
        };
    }

    private void createTestPropertiesForLandlord(
            UserRepository userRepository,
            PropertyRepository propertyRepository,
            RoleRepository roleRepository) {
        
        String targetEmail = "danielpopa2003x@gmail.com";
        Optional<User> landlordOpt = userRepository.findByEmail(targetEmail);
        
        if (landlordOpt.isEmpty()) {
            System.out.println("Landlord with email " + targetEmail + " not found. Skipping test property creation.");
            return;
        }

        User landlord = landlordOpt.get();
        
        // Check if landlord already has properties
//        if (propertyRepository.findByOwner_Id(landlord.getId(), org.springframework.data.domain.Pageable.unpaged()).hasContent()) {
//            System.out.println("Landlord already has properties. Skipping test property creation.");
//            return;
//        }

        // Bucharest coordinates and test property configurations
        double[][] bucharest_locations = {
            {44.4268, 26.1025}, // City Center
            {44.4107, 26.1305}, // Unirii
            {44.4539, 26.0971}, // Piata Romana
            {44.4355, 26.0643}, // Old Town
            {44.3989, 26.0606}, // Obor
            {44.4569, 26.1234}, // Herastrau
            {44.4206, 26.0892}, // Dorobanți
            {44.3844, 26.0858}, // Floreasca
        };

        String[] titles = {
            "Modern Apartment Downtown",
            "Cozy Studio in City Center",
            "Spacious Family Home",
            "Luxury Penthouse",
            "Contemporary Flat",
            "Charming Vintage Apartment",
            "Bright 2BR with Balcony",
            "Designer Loft"
        };

        int[] prices = {600, 750, 900, 1200, 1500, 800, 700, 1100};
        double[] surfaces = {45, 55, 85, 120, 150, 65, 75, 95};
        int[] rooms = {1, 1, 2, 3, 4, 2, 2, 2};
        LayoutType[] layoutTypes = {
            LayoutType.SEMIDECOMANDAT,
            LayoutType.DECOMANDAT,
            LayoutType.NEDECOMANDAT,
            LayoutType.DECOMANDAT,
            LayoutType.SEMIDECOMANDAT,
            LayoutType.NEDECOMANDAT,
            LayoutType.DECOMANDAT,
            LayoutType.SEMIDECOMANDAT
        };

        Boolean[] petFriendly = {true, false, true, true, false, true, false, true};
        Boolean[] smokerFriendly = {false, true, false, true, false, false, true, false};

        PreferredTenantType[][] preferredTenants = {
            {PreferredTenantType.STUDENT, PreferredTenantType.PROFESSIONAL},
            {PreferredTenantType.PROFESSIONAL},
            {PreferredTenantType.FAMILY, PreferredTenantType.COUPLE},
            {PreferredTenantType.FAMILY},
            {PreferredTenantType.PROFESSIONAL, PreferredTenantType.COUPLE},
            {PreferredTenantType.STUDENT},
            {PreferredTenantType.STUDENT, PreferredTenantType.PROFESSIONAL},
            {PreferredTenantType.PROFESSIONAL}
        };

        // Get all images from uploads folder
        List<Path> availableImages = getImagesFromUploadsFolder();
        if (availableImages.isEmpty()) {
            System.out.println("No images found in uploads folder. Creating properties without images.");
        }

        Random random = new Random();

        // Create 8 properties with different combinations
        for (int i = 0; i < bucharest_locations.length; i++) {
            try {
                Property property = new Property();
                property.setOwner(landlord);
                property.setTitle(titles[i]);
                property.setPrice(new BigDecimal(prices[i]));
                property.setSurface(surfaces[i]);
                property.setAddress("Bucharest, Romania");
                property.setDescription("A beautiful property located in the heart of Bucharest with excellent amenities.");
                property.setNumberOfRooms(rooms[i]);
                property.setHasExtraBathroom(i % 2 == 0);
                property.setLayoutType(layoutTypes[i]);
                property.setPetFriendly(petFriendly[i]);
                property.setSmokerFriendly(smokerFriendly[i]);
                
                // Set preferred tenants
                Set<PreferredTenantType> tenants = new HashSet<>(Arrays.asList(preferredTenants[i]));
                property.setPreferredTenants(tenants);
                
                // Set location
                property.setLatitude(bucharest_locations[i][0]);
                property.setLongitude(bucharest_locations[i][1]);

                Property savedProperty = propertyRepository.save(property);

                // Assign random images if available
                if (!availableImages.isEmpty()) {
                    List<PropertyImage> images = new ArrayList<>();
                    int imageCount = 1 + random.nextInt(Math.min(3, availableImages.size()));
                    Set<Integer> usedIndices = new HashSet<>();
                    
                    for (int j = 0; j < imageCount; j++) {
                        int randomIndex;
                        do {
                            randomIndex = random.nextInt(availableImages.size());
                        } while (usedIndices.contains(randomIndex) && usedIndices.size() < availableImages.size());
                        usedIndices.add(randomIndex);
                        
                        Path imagePath = availableImages.get(randomIndex);
                        PropertyImage propImage = new PropertyImage();
                        propImage.setProperty(savedProperty);
                        propImage.setUrl("/api/properties/images/" + imagePath.getFileName().toString());
                        propImage.setOrderIndex(j);
                        images.add(propImage);
                    }
                    savedProperty.setImages(images);
                    propertyRepository.save(savedProperty);
                }

                System.out.println("Created test property: " + property.getTitle() + " at " + 
                    bucharest_locations[i][0] + ", " + bucharest_locations[i][1]);
            } catch (Exception e) {
                System.err.println("Error creating test property: " + e.getMessage());
            }
        }

        System.out.println("Test properties created for landlord: " + targetEmail);
    }

    private List<Path> getImagesFromUploadsFolder() {
        try {
            Path uploadsPath = Paths.get("uploads");
            if (Files.exists(uploadsPath) && Files.isDirectory(uploadsPath)) {
                return Files.list(uploadsPath)
                        .filter(path -> {
                            String fileName = path.getFileName().toString().toLowerCase();
                            return fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || 
                                   fileName.endsWith(".png") || fileName.endsWith(".gif");
                        })
                        .collect(Collectors.toList());
            }
        } catch (IOException e) {
            System.err.println("Error reading images from uploads folder: " + e.getMessage());
        }
        return new ArrayList<>();
    }
}
