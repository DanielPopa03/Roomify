package com.roomify.model;

public enum PreferredTenantType {
    STUDENT("Student"),
    STUDENTS_COLIVING("Students (Coliving)"),
    PROFESSIONAL("Professional"),
    FAMILY("Family"),
    FAMILY_WITH_KIDS("Family with Kids"),
    COUPLE("Couple");

    private final String displayName;

    PreferredTenantType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static PreferredTenantType fromDisplayName(String text) {
        for (PreferredTenantType type : PreferredTenantType.values()) {
            // Check if it matches the display name ("Family with Kids")
            // OR the code name ("FAMILY_WITH_KIDS") just in case
            if (type.displayName.equalsIgnoreCase(text) || type.name().equalsIgnoreCase(text)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown tenant type received: " + text);
    }
}
