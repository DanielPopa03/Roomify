package com.roomify.model.enums;

/**
 * Defines the type of chat message for conditional rendering in the frontend.
 */
public enum MessageType {
    TEXT, // Regular user-typed message
    SYSTEM, // Automated system notification (e.g., "Viewing Confirmed")
    ACTION_CARD // Interactive card with buttons (e.g., viewing proposal, rent proposal)
}
