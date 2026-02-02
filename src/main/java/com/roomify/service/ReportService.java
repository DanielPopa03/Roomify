package com.roomify.service;

import com.roomify.dto.CreateReportRequest; // Ensure you have this DTO import
import com.roomify.model.Report;
import com.roomify.model.User;
import com.roomify.repository.ReportRepository;
import com.roomify.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    @Transactional
    public Report createReport(String reporterId, CreateReportRequest req) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new IllegalArgumentException("Reporter not found"));
        User reportedUser = userRepository.findById(req.getReportedUserId())
                .orElseThrow(() -> new IllegalArgumentException("Reported user not found"));

        Report report = Report.builder()
                .reporter(reporter)
                .reportedUser(reportedUser)
                .type(req.getType())
                .reason(req.getReason())
                .description(req.getDescription())
                .chatId(req.getChatId())
                .messageId(req.getMessageId())
                .propertyId(req.getPropertyId())
                .contentSnapshot(req.getContentSnapshot())
                .status(Report.ReportStatus.PENDING)
                .build();

        return reportRepository.save(report);
    }

    public List<Report> getAllReports() {
        return reportRepository.findAll();
    }

    @Transactional
    public Report resolveReport(UUID reportId, String action) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));

        User reportedUser = report.getReportedUser();

        // Handle Actions
        switch (action) {
            case "BAN":
                // Assuming you added 'private Boolean isBanned = false;' to User.java
                reportedUser.setIsBanned(true);
                userRepository.save(reportedUser);
                break;
            case "PENALIZE":
                int currentScore = reportedUser.getSeriousnessScore() != null ? reportedUser.getSeriousnessScore() : 0;
                // Decrease score by 1 (or more)
                reportedUser.setSeriousnessScore(currentScore - 1);
                userRepository.save(reportedUser);
                break;
            case "NONE":
            default:
                // Just resolve without action
                break;
        }

        report.setStatus(Report.ReportStatus.RESOLVED);
        return reportRepository.save(report);
    }

    @Transactional
    public void deleteReport(UUID reportId) {
        reportRepository.deleteById(reportId);
    }

    @Transactional
    public Report dismissReport(UUID reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));

        // Just update status, no punishment logic
        report.setStatus(Report.ReportStatus.DISMISSED);
        return reportRepository.save(report);
    }
}