package com.marketforge.order.api.error;

import com.marketforge.order.service.exception.IllegalTransitionException;
import com.marketforge.order.service.exception.InsufficientInventoryException;
import com.marketforge.order.service.exception.NotFoundException;
import com.marketforge.order.service.exception.PaymentConflictException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Maps domain exceptions to the API.md error envelope. */
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(NotFoundException.class)
  public ResponseEntity<ErrorBody> notFound(NotFoundException ex, HttpServletRequest req) {
    return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), req);
  }

  @ExceptionHandler(IllegalTransitionException.class)
  public ResponseEntity<ErrorBody> illegalTransition(IllegalTransitionException ex,
      HttpServletRequest req) {
    return build(HttpStatus.UNPROCESSABLE_ENTITY, "ILLEGAL_TRANSITION", ex.getMessage(), req);
  }

  @ExceptionHandler(InsufficientInventoryException.class)
  public ResponseEntity<ErrorBody> insufficientInventory(InsufficientInventoryException ex,
      HttpServletRequest req) {
    return build(HttpStatus.CONFLICT, "INSUFFICIENT_INVENTORY", ex.getMessage(), req);
  }

  @ExceptionHandler(PaymentConflictException.class)
  public ResponseEntity<ErrorBody> paymentConflict(PaymentConflictException ex,
      HttpServletRequest req) {
    return build(HttpStatus.CONFLICT, "PAYMENT_CONFLICT", ex.getMessage(), req);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorBody> validation(MethodArgumentNotValidException ex,
      HttpServletRequest req) {
    String msg = ex.getBindingResult().getFieldErrors().isEmpty()
        ? "validation failed"
        : ex.getBindingResult().getFieldErrors().get(0).getDefaultMessage();
    return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", msg, req);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ErrorBody> badRequest(IllegalArgumentException ex,
      HttpServletRequest req) {
    return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", ex.getMessage(), req);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorBody> internal(Exception ex, HttpServletRequest req) {
    return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL", "internal server error", req);
  }

  private ResponseEntity<ErrorBody> build(HttpStatus status, String code, String message,
      HttpServletRequest req) {
    String requestId = req.getHeader("X-Request-Id");
    return ResponseEntity.status(status)
        .body(new ErrorBody(false, new ApiError(code, message, requestId)));
  }
}
