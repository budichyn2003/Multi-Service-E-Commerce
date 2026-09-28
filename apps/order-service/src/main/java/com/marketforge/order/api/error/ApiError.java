package com.marketforge.order.api.error;

/** Error payload per API.md conventions. */
public record ApiError(String code, String message, String requestId) {}
