package com.roomify.config;

import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;
import java.net.ConnectException;

public class PostgresConnectionFailureAnalyzer extends AbstractFailureAnalyzer<Throwable> {

    @Override
    protected FailureAnalysis analyze(Throwable rootFailure, Throwable cause) {
        if (isConnectionRefused(cause)) {
            return new FailureAnalysis(
                    "\n\n**************************************************************\n" +
                            "       FATAL ERROR: POSTGRESQL CONNECTION FAILED\n" +
                            "**************************************************************\n" +
                            "The application could not connect to the PostgreSQL database.\n\n" +
                            "Possible reasons:\n" +
                            "1. PostgreSQL is not running.\n" +
                            "2. The database 'Roomify' does not exist.\n" +
                            "3. Incorrect credentials or port (default: 5432).\n\n" +
                            "Action:\n" +
                            "Please ensure PostgreSQL is installed and running on port 5432.\n" +
                            "**************************************************************\n",
                    "Start the local PostgreSQL server.",
                    cause);
        }
        return null;
    }

    private boolean isConnectionRefused(Throwable error) {
        // Recursively check for connection refused or PSQLException
        while (error != null) {
            String message = error.getMessage();
            if (error instanceof ConnectException ||
                    (message != null && message.contains("Connection to localhost:5432 refused"))) {
                return true;
            }
            error = error.getCause();
        }
        return false;
    }
}
