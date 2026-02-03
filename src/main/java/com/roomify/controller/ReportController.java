package com.roomify.controller;

import com.roomify.dto.CreateReportRequest;
import com.roomify.model.Report;
import com.roomify.service.ReportService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    public ResponseEntity<Report> createReport(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody CreateReportRequest request) {
        String reporterId = jwt.getSubject();
        // Pass all fields including context
        Report report = reportService.createReport(
                reporterId,
                request
        );
        return ResponseEntity.ok(report);
    }

    @GetMapping
    public ResponseEntity<List<Report>> getAllReports() {
        return ResponseEntity.ok(reportService.getAllReports());
    }

    // UPDATED: Now accepts an action parameter
    @PutMapping("/{id}/resolve")
    public ResponseEntity<Report> resolveReport(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "NONE") String action // NONE, BAN, PENALIZE
    ) {
        return ResponseEntity.ok(reportService.resolveReport(id, action));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReport(@PathVariable UUID id) {
        reportService.deleteReport(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/dismiss")
    public ResponseEntity<Report> dismissReport(@PathVariable UUID id) {
        return ResponseEntity.ok(reportService.dismissReport(id));
    }
}