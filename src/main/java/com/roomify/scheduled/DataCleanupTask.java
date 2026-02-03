package com.roomify.scheduled;

import com.roomify.repository.PropertyViewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Scheduled tasks for data maintenance.
 */
@Component
public class DataCleanupTask {

    private static final Logger log = LoggerFactory.getLogger(DataCleanupTask.class);

    private static final int RETENTION_DAYS = 7;

    private final PropertyViewRepository propertyViewRepository;

    public DataCleanupTask(PropertyViewRepository propertyViewRepository) {
        this.propertyViewRepository = propertyViewRepository;
    }

    /**
     * Purge old PropertyView records daily at 3:00 AM.
     * Keeps the table size manageable for fast queries.
     */
    @Scheduled(cron = "0 0 3 * * *") // Every day at 03:00
    @Transactional
    public void purgeOldPropertyViews() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(RETENTION_DAYS);
        int deleted = propertyViewRepository.deleteOlderThan(cutoff);
        log.info("PropertyView cleanup: deleted {} records older than {}", deleted, cutoff);
    }
}
