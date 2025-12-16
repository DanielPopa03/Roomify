package com.roomify.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

@Service
public class GeocodingService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // STRICTLY required by Nominatim terms of use
    private static final String USER_AGENT = "RoomifyApp/1.0 (contact@example.com)";

    public static class LocationResult {
        public String address;
        public Double latitude;
        public Double longitude;
    }

    public LocationResult resolveLocation(String address, Double lat, Double lon) {
        LocationResult result = new LocationResult();
        result.address = address;
        result.latitude = lat;
        result.longitude = lon;

        // Case 1: Have Address, missing Coords -> Geocode
        if ((address != null && !address.isBlank()) && (lat == null || lon == null)) {
            try {
                String url = "https://nominatim.openstreetmap.org/search?format=json&q=" + address.replace(" ", "+");
                JsonNode root = callApi(url);
                if (root.isArray() && !root.isEmpty()) {
                    JsonNode bestMatch = root.get(0);
                    result.latitude = bestMatch.get("lat").asDouble();
                    result.longitude = bestMatch.get("lon").asDouble();
                    // Optional: Update address to the standardized version returned by API
                    // result.address = bestMatch.get("display_name").asText();
                }
            } catch (Exception e) {
                System.err.println("Geocoding failed: " + e.getMessage());
            }
        }
        // Case 2: Have Coords, missing Address -> Reverse Geocode
        else if ((lat != null && lon != null) && (address == null || address.isBlank())) {
            try {
                String url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lon;
                JsonNode root = callApi(url);
                if (root.has("display_name")) {
                    result.address = root.get("display_name").asText();
                }
            } catch (Exception e) {
                System.err.println("Reverse geocoding failed: " + e.getMessage());
            }
        }

        return result;
    }

    private JsonNode callApi(String url) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.USER_AGENT, USER_AGENT);
        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        return objectMapper.readTree(response.getBody());
    }
}