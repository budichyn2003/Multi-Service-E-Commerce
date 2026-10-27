package com.marketforge.order.service.exception;

public class PaymentConflictException extends RuntimeException {
  public PaymentConflictException(String message) {
    super(message);
  }
}
