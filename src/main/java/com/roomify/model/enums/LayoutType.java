package com.roomify.model.enums;

public enum LayoutType {
    DECOMANDAT("Decomandat"),
    SEMIDECOMANDAT("Semidecomandat"),
    NEDECOMANDAT("Nedecomandat");

    private final String displayName;

    LayoutType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
