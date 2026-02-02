package com.roomify.service;

import com.roomify.dto.AdminDashboardDTO;
import com.roomify.model.User;
import com.roomify.model.Role;
import com.roomify.model.Report;
import com.roomify.repository.PropertyRepository;
import com.roomify.repository.ReportRepository;
import com.roomify.repository.RoleRepository;
import com.roomify.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final ReportRepository reportRepository;
    private final RoleRepository roleRepository;

    public AdminDashboardDTO getDashboardStats() {
        return AdminDashboardDTO.builder()
                .totalUsers(userRepository.count())
                .totalProperties(propertyRepository.count())
                .activeListings(propertyRepository.count()) // Simplified
                .pendingReports(reportRepository.findByStatus(Report.ReportStatus.PENDING).size())
                .newUsersToday(0)
                .newPropertiesToday(0)
                .build();
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public void updateUserRole(String userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));

        user.setRole(role);
        userRepository.save(user);
    }

    @Transactional
    public void toggleUserBan(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // FIX: Toggle the boolean status safely
        boolean currentStatus = Boolean.TRUE.equals(user.getIsBanned());
        user.setIsBanned(!currentStatus);

        userRepository.save(user);
    }

    @Transactional
    public void updateUserScore(String userId, Integer newScore) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Allow any integer score as requested
        user.setSeriousnessScore(newScore);

        userRepository.save(user);
    }
}