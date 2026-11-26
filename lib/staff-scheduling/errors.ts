/**
 * Staff Scheduling - Error Classes
 * Centralized error handling for staff scheduling operations
 */

export class StaffSchedulingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StaffSchedulingError';
  }
}

export const StaffSchedulingErrorCode = {
  // Employee errors
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  EMPLOYEE_ALREADY_EXISTS: 'EMPLOYEE_ALREADY_EXISTS',
  EMPLOYEE_INACTIVE: 'EMPLOYEE_INACTIVE',
  INVALID_EMPLOYEE_DATA: 'INVALID_EMPLOYEE_DATA',

  // Shift errors
  SHIFT_NOT_FOUND: 'SHIFT_NOT_FOUND',
  SHIFT_ALREADY_PUBLISHED: 'SHIFT_ALREADY_PUBLISHED',
  SHIFT_OVERLAP: 'SHIFT_OVERLAP',
  SHIFT_PAST_CANNOT_MODIFY: 'SHIFT_PAST_CANNOT_MODIFY',
  INVALID_SHIFT_TIMES: 'INVALID_SHIFT_TIMES',
  SHIFT_CONFLICT: 'SHIFT_CONFLICT',

  // Attendance errors
  ATTENDANCE_NOT_FOUND: 'ATTENDANCE_NOT_FOUND',
  ALREADY_CLOCKED_IN: 'ALREADY_CLOCKED_IN',
  NOT_CLOCKED_IN: 'NOT_CLOCKED_IN',
  INVALID_CLOCK_TIME: 'INVALID_CLOCK_TIME',
  CLOCK_OUT_BEFORE_CLOCK_IN: 'CLOCK_OUT_BEFORE_CLOCK_IN',
  ATTENDANCE_ALREADY_CORRECTED: 'ATTENDANCE_ALREADY_CORRECTED',

  // Wage errors
  WAGE_RATE_NOT_FOUND: 'WAGE_RATE_NOT_FOUND',
  INVALID_WAGE_RATE: 'INVALID_WAGE_RATE',
  CALCULATION_ERROR: 'CALCULATION_ERROR',

  // General errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type StaffSchedulingErrorCodeType =
  (typeof StaffSchedulingErrorCode)[keyof typeof StaffSchedulingErrorCode];

// Helper function to create errors
export function createError(
  code: StaffSchedulingErrorCodeType,
  message: string,
  details?: Record<string, unknown>
): StaffSchedulingError {
  return new StaffSchedulingError(message, code, details);
}