package com.roomify.repository;

import com.roomify.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {
    List<Report> findByStatus(Report.ReportStatus status);

    List<Report> findByReportedUser_Id(String userId);
}