package com.roomify.service;

import com.roomify.model.Preferences;
import com.roomify.model.User;
import com.roomify.repository.PreferencesRepository;
import com.roomify.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PreferencesService {

    @Autowired
    private PreferencesRepository preferencesRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Save or update preferences for a user
     */
    public Preferences savePreferences(String userId, Preferences preferences) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found: " + userId);
        }

        User user = userOpt.get();
        
        // Check if preferences already exist for this user
        Optional<Preferences> existingPrefs = preferencesRepository.findByUser(user);
        
        if (existingPrefs.isPresent()) {
            // Update existing preferences
            Preferences prefs = existingPrefs.get();
            prefs.setMinPrice(preferences.getMinPrice());
            prefs.setMaxPrice(preferences.getMaxPrice());
            prefs.setMinSurface(preferences.getMinSurface());
            prefs.setMaxSurface(preferences.getMaxSurface());
            prefs.setMinRooms(preferences.getMinRooms());
            prefs.setMaxRooms(preferences.getMaxRooms());
            prefs.setLayoutTypes(preferences.getLayoutTypes());
            prefs.setSmokerFriendly(preferences.getSmokerFriendly());
            prefs.setPetFriendly(preferences.getPetFriendly());
            prefs.setPreferredTenants(preferences.getPreferredTenants());
            prefs.setSearchLatitude(preferences.getSearchLatitude());
            prefs.setSearchLongitude(preferences.getSearchLongitude());
            prefs.setSearchRadiusKm(preferences.getSearchRadiusKm());
            return preferencesRepository.save(prefs);
        } else {
            // Create new preferences
            preferences.setUser(user);
            return preferencesRepository.save(preferences);
        }
    }

    /**
     * Get preferences for a user
     */
    public Optional<Preferences> getPreferences(String userId) {
        return preferencesRepository.findByUserId(userId);
    }

    /**
     * Delete preferences for a user
     */
    public void deletePreferences(String userId) {
        preferencesRepository.deleteByUserId(userId);
    }

    /**
     * Check if a property matches user preferences
     */
    public boolean propertyMatchesPreferences(Double propertyPrice, Double propertySurface,
                                              Integer propertyRooms, String layoutType,
                                              Boolean propertyPetFriendly, Boolean propertySmokerFriendly,
                                              Double propertyLatitude, Double propertyLongitude,
                                              Preferences preferences) {
        
        if (preferences == null) {
            return true; // No preferences set, show all properties
        }

        // Check price range
        if (preferences.getMinPrice() != null && propertyPrice < preferences.getMinPrice().doubleValue()) {
            return false;
        }
        if (preferences.getMaxPrice() != null && propertyPrice > preferences.getMaxPrice().doubleValue()) {
            return false;
        }

        // Check surface area
        if (preferences.getMinSurface() != null && propertySurface < preferences.getMinSurface()) {
            return false;
        }
        if (preferences.getMaxSurface() != null && propertySurface > preferences.getMaxSurface()) {
            return false;
        }

        // Check number of rooms
        if (preferences.getMinRooms() != null && propertyRooms < preferences.getMinRooms()) {
            return false;
        }
        if (preferences.getMaxRooms() != null && propertyRooms > preferences.getMaxRooms()) {
            return false;
        }

        // Check layout type (if preferences specify layout types)
        if (!preferences.getLayoutTypes().isEmpty() && layoutType != null) {
            boolean layoutMatches = preferences.getLayoutTypes().stream()
                    .anyMatch(lt -> lt.name().equals(layoutType));
            if (!layoutMatches) {
                return false;
            }
        }

        // Check pet friendly
        if (preferences.getPetFriendly() != null && preferences.getPetFriendly() && !propertySmokerFriendly) {
            return false;
        }

        // Check smoker friendly
        if (preferences.getSmokerFriendly() != null && preferences.getSmokerFriendly() && !propertySmokerFriendly) {
            return false;
        }

        // Check location and radius
        if (preferences.getSearchLatitude() != null && preferences.getSearchLongitude() != null 
                && preferences.getSearchRadiusKm() != null) {
            double distance = calculateDistance(
                    preferences.getSearchLatitude(),
                    preferences.getSearchLongitude(),
                    propertyLatitude,
                    propertyLongitude
            );
            if (distance > preferences.getSearchRadiusKm()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculate distance between two coordinates using Haversine formula (in km)
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int EARTH_RADIUS = 6371; // Radius in km

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.asin(Math.sqrt(a));
        return EARTH_RADIUS * c;
    }
}
