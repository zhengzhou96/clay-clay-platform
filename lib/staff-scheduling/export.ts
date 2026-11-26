/**
 * Staff Scheduling - CSV Export
 * Handles CSV export for monthly wages
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  StaffSchedulingErrorCode,
  createError,
} from './errors';
import { WageService } from './wages';

// ============================================================================
// TYPES
// ============================================================================

export interface ExportMonthlyWagesCSVOptions {
  year: number;
  month: number; // 1-12
  includeHeaders?: boolean;
  dateFormat?: 'ISO' | 'SG' | 'US'; // Default: SG (DD/MM/YYYY)
}

export interface CSVExportResult {
  csv: string;
  filename: string;
  recordCount: number;
  totalWageCents: number;
}

export interface EmployeeCSVRow {
  employee_code: string;
  employee_name: string;
  date: string;
  shift_id: string | null;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number;
  duration_hours: string; // Formatted as "H:MM"
  hourly_rate_cents: number;
  hourly_rate_sgd: string; // Formatted as "X.XX"
  wage_cents: number;
  wage_sgd: string; // Formatted as "X.XX"
  wage_rate_effective_date: string;
  is_corrected: boolean;
  correction_reason: string | null;
}

export interface SummaryCSVRow {
  employee_code: string;
  employee_name: string;
  total_shifts: number;
  total_minutes: number;
  total_hours: string; // Formatted as "H:MM"
  total_wage_cents: number;
  total_wage_sgd: string; // Formatted as "X.XX"
  average_hourly_rate_cents: number;
  average_hourly_rate_sgd: string; // Formatted as "X.XX"
}

// ============================================================================
// EXPORT SERVICE CLASS
// ============================================================================

export class ExportService {
  private supabase: SupabaseClient;
  private wageService: WageService;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.wageService = new WageService(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Format cents as SGD string (e.g., 3300 -> "33.00")
   */
  private formatSGD(cents: number): string {
    const dollars = cents / 100;
    return dollars.toFixed(2);
  }

  /**
   * Format minutes as "H:MM" string
   */
  private formatHoursMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Format date based on locale
   */
  private formatDate(dateStr: string, format: 'ISO' | 'SG' | 'US'): string {
    const date = new Date(dateStr + 'T00:00:00+08:00');
    if (isNaN(date.getTime())) return dateStr;

    switch (format) {
      case 'ISO':
        return date.toISOString().split('T')[0];
      case 'SG': // DD/MM/YYYY
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      case 'US': // MM/DD/YYYY
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
      default:
        return dateStr;
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: string | null, format: 'ISO' | 'SG' | 'US'): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;

    switch (format) {
      case 'ISO':
        return date.toISOString();
      case 'SG': // DD/MM/YYYY HH:mm
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      case 'US': // MM/DD/YYYY HH:mm
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      default:
        return timestamp;
    }
  }

  /**
   * Escape CSV field (handle commas, quotes, newlines)
   */
  private escapeCSVField(field: string | number | null | undefined): string {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Convert array of objects to CSV string
   */
  private objectsToCSV<T>(
    objects: T[],
    headers: (keyof T)[],
    includeHeaders: boolean = true
  ): string {
    const rows: string[] = [];

    if (includeHeaders) {
      rows.push(headers.map(h => this.escapeCSVField(String(h))).join(','));
    }

    for (const obj of objects) {
      rows.push(headers.map(h => this.escapeCSVField(String(obj[h] ?? ''))).join(','));
    }

    return rows.join('\n');
  }

  // ============================================================================
  // EXPORT METHODS
  // ============================================================================

  /**
   * Export monthly wages as CSV for all employees
   * Includes detailed rows per attendance + summary rows per employee
   */
  async exportMonthlyWagesCSV(
    options: ExportMonthlyWagesCSVOptions
  ): Promise<CSVExportResult> {
    const { year, month, includeHeaders = true, dateFormat = 'SG' } = options;

    if (month < 1 || month > 12) {
      throw createError(
        StaffSchedulingErrorCode.VALIDATION_ERROR,
        'Invalid month (must be 1-12)',
        { month }
      );
    }

    // Get all monthly wage summaries
    const summaries = await this.wageService.getAllMonthlyWagesSummary(year, month);

    // Build detailed rows
    const detailedRows: EmployeeCSVRow[] = [];
    const summaryRows: SummaryCSVRow[] = [];
    let totalWageCents = 0;
    let recordCount = 0;

    for (const summary of summaries) {
      if (summary.totalWageCents === 0 && summary.attendanceRecords.length === 0) {
        // Still include employee with zero wages
        summaryRows.push({
          employee_code: summary.employeeCode,
          employee_name: summary.employeeName,
          total_shifts: 0,
          total_minutes: 0,
          total_hours: '0:00',
          total_wage_cents: 0,
          total_wage_sgd: '0.00',
          average_hourly_rate_cents: 0,
          average_hourly_rate_sgd: '0.00',
        });
        continue;
      }

      // Add detailed rows for each attendance record
      for (const detail of summary.attendanceRecords) {
        detailedRows.push({
          employee_code: summary.employeeCode,
          employee_name: summary.employeeName,
          date: this.formatDate(detail.date, dateFormat),
          shift_id: detail.shiftId,
          clock_in: this.formatTimestamp(detail.clockInTz, dateFormat),
          clock_out: this.formatTimestamp(detail.clockOutTz, dateFormat),
          duration_minutes: detail.durationMinutes,
          duration_hours: this.formatHoursMinutes(detail.durationMinutes),
          hourly_rate_cents: detail.hourlyRateCents,
          hourly_rate_sgd: this.formatSGD(detail.hourlyRateCents),
          wage_cents: detail.wageCents,
          wage_sgd: this.formatSGD(detail.wageCents),
          wage_rate_effective_date: this.formatDate(detail.wageRateEffectiveDate, dateFormat),
          is_corrected: detail.isCorrected,
          correction_reason: detail.isCorrected ? 'Corrected' : '',
        });
        totalWageCents += detail.wageCents;
        recordCount++;
      }

      // Add summary row for employee
      summaryRows.push({
        employee_code: summary.employeeCode,
        employee_name: summary.employeeName,
        total_shifts: summary.totalShifts,
        total_minutes: summary.totalMinutes,
        total_hours: this.formatHoursMinutes(summary.totalMinutes),
        total_wage_cents: summary.totalWageCents,
        total_wage_sgd: this.formatSGD(summary.totalWageCents),
        average_hourly_rate_cents: summary.averageHourlyRateCents,
        average_hourly_rate_sgd: this.formatSGD(summary.averageHourlyRateCents),
      });
    }

    // Build CSV with two sections: Details and Summary
    const detailedHeaders: (keyof EmployeeCSVRow)[] = [
      'employee_code',
      'employee_name',
      'date',
      'shift_id',
      'clock_in',
      'clock_out',
      'duration_minutes',
      'duration_hours',
      'hourly_rate_cents',
      'hourly_rate_sgd',
      'wage_cents',
      'wage_sgd',
      'wage_rate_effective_date',
      'is_corrected',
      'correction_reason',
    ];

    const summaryHeaders: (keyof SummaryCSVRow)[] = [
      'employee_code',
      'employee_name',
      'total_shifts',
      'total_minutes',
      'total_hours',
      'total_wage_cents',
      'total_wage_sgd',
      'average_hourly_rate_cents',
      'average_hourly_rate_sgd',
    ];

    const csvParts: string[] = [];

    // Section 1: Detailed Attendance Records
    csvParts.push('=== DETAILED ATTENDANCE RECORDS ===');
    csvParts.push(this.objectsToCSV(detailedRows, detailedHeaders, includeHeaders));

    // Section 2: Employee Summary
    csvParts.push('');
    csvParts.push('=== EMPLOYEE MONTHLY SUMMARY ===');
    csvParts.push(this.objectsToCSV(summaryRows, summaryHeaders, includeHeaders));

    // Section 3: Grand Total
    csvParts.push('');
    csvParts.push('=== GRAND TOTAL ===');
    const grandTotalRows = [{
      metric: 'Total Employees (with wages)',
      value: summaryRows.filter(r => r.total_wage_cents > 0).length,
    }, {
      metric: 'Total Shifts',
      value: summaryRows.reduce((sum, r) => sum + r.total_shifts, 0),
    }, {
      metric: 'Total Hours',
      value: this.formatHoursMinutes(summaryRows.reduce((sum, r) => sum + r.total_minutes, 0)),
    }, {
      metric: 'Total Wage (Cents)',
      value: totalWageCents,
    }, {
      metric: 'Total Wage (SGD)',
      value: this.formatSGD(totalWageCents),
    }];

    const grandTotalHeaders = ['metric', 'value'];
    csvParts.push(this.objectsToCSV(grandTotalRows, grandTotalHeaders as any, includeHeaders));

    const csv = csvParts.join('\n');
    const filename = `monthly-wages-${year}-${String(month).padStart(2, '0')}.csv`;

    return {
      csv,
      filename,
      recordCount,
      totalWageCents,
    };
  }

  /**
   * Export monthly wages as CSV for a specific employee
   */
  async exportEmployeeMonthlyWagesCSV(
    employeeId: string,
    options: ExportMonthlyWagesCSVOptions
  ): Promise<CSVExportResult> {
    const { year, month, includeHeaders = true, dateFormat = 'SG' } = options;

    if (month < 1 || month > 12) {
      throw createError(
        StaffSchedulingErrorCode.VALIDATION_ERROR,
        'Invalid month (must be 1-12)',
        { month }
      );
    }

    // Get employee details
    const { data: employee, error: empError } = await this.supabase
      .from('employees')
      .select('id, employee_code, first_name, last_name')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      throw createError(
        StaffSchedulingErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found',
        { employeeId }
      );
    }

    // Get monthly summary
    const summary = await this.wageService.getMonthlyWagesSummary({
      employeeId,
      year,
      month,
    });

    // Build detailed rows
    const detailedRows: EmployeeCSVRow[] = [];
    let totalWageCents = 0;
    let recordCount = 0;

    for (const detail of summary.attendanceRecords) {
      detailedRows.push({
        employee_code: summary.employeeCode,
        employee_name: summary.employeeName,
        date: this.formatDate(detail.date, dateFormat),
        shift_id: detail.shiftId,
        clock_in: this.formatTimestamp(detail.clockInTz, dateFormat),
        clock_out: this.formatTimestamp(detail.clockOutTz, dateFormat),
        duration_minutes: detail.durationMinutes,
        duration_hours: this.formatHoursMinutes(detail.durationMinutes),
        hourly_rate_cents: detail.hourlyRateCents,
        hourly_rate_sgd: this.formatSGD(detail.hourlyRateCents),
        wage_cents: detail.wageCents,
        wage_sgd: this.formatSGD(detail.wageCents),
        wage_rate_effective_date: this.formatDate(detail.wageRateEffectiveDate, dateFormat),
        is_corrected: detail.isCorrected,
        correction_reason: detail.isCorrected ? 'Corrected' : '',
      });
      totalWageCents += detail.wageCents;
      recordCount++;
    }

    const detailedHeaders: (keyof EmployeeCSVRow)[] = [
      'employee_code',
      'employee_name',
      'date',
      'shift_id',
      'clock_in',
      'clock_out',
      'duration_minutes',
      'duration_hours',
      'hourly_rate_cents',
      'hourly_rate_sgd',
      'wage_cents',
      'wage_sgd',
      'wage_rate_effective_date',
      'is_corrected',
      'correction_reason',
    ];

    const csvParts: string[] = [];
    csvParts.push(`=== ${summary.employeeName} (${summary.employeeCode}) - ${year}-${String(month).padStart(2, '0')} ===`);
    csvParts.push(this.objectsToCSV(detailedRows, detailedHeaders, includeHeaders));

    // Summary row
    csvParts.push('');
    csvParts.push('=== SUMMARY ===');
    const summaryRow = {
      total_shifts: summary.totalShifts,
      total_minutes: summary.totalMinutes,
      total_hours: this.formatHoursMinutes(summary.totalMinutes),
      total_wage_cents: summary.totalWageCents,
      total_wage_sgd: this.formatSGD(summary.totalWageCents),
      average_hourly_rate_cents: summary.averageHourlyRateCents,
      average_hourly_rate_sgd: this.formatSGD(summary.averageHourlyRateCents),
    };
    const summaryHeaders = Object.keys(summaryRow) as (keyof typeof summaryRow)[];
    csvParts.push(this.objectsToCSV([summaryRow], summaryHeaders, includeHeaders));

    const csv = csvParts.join('\n');
    const filename = `${employee.employee_code}-wages-${year}-${String(month).padStart(2, '0')}.csv`;

    return {
      csv,
      filename,
      recordCount,
      totalWageCents,
    };
  }

  /**
   * Save CSV to file (for server-side usage)
   */
  async saveCSVToFile(
    csv: string,
    filepath: string
  ): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, csv, 'utf-8');
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createExportService(
  supabaseUrl: string,
  supabaseKey: string
): ExportService {
  return new ExportService(supabaseUrl, supabaseKey);
}