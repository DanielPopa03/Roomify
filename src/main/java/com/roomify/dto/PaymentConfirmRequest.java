package com.roomify.dto;

import lombok.Data;

@Data
public class PaymentConfirmRequest {
    private Long leaseId;
    private String paymentIntentId;
}
