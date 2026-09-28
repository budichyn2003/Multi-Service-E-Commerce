package com.marketforge.order.api.error;

/** Standard error envelope. */
public record ErrorBody(boolean success, ApiError error) {}
