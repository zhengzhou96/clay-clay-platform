#!/usr/bin/env node
/**
 * Clay Clay - Hold Cleanup Cron
 * Runs periodically to clean up expired booking holds
 * 
 * Usage: node scripts/cleanup-holds.js
 * 
 * Recommended: Run every 5 minutes via cron or scheduled function
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanupExpiredHolds(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting hold cleanup...`);

  try {
    // Call the database function to clean up expired holds
    const { data, error } = await supabase.rpc('cleanup_expired_holds');

    if (error) {
      console.error('Error cleaning up holds:', error);
      process.exit(1);
    }

    const cleanedCount = typeof data === 'number' ? data : 0;
    console.log(`[${new Date().toISOString()}] Cleaned up ${cleanedCount} expired hold(s)`);

    // Log statistics about remaining active holds
    const { count: activeHoldsCount } = await supabase
      .from('booking_holds')
      .select('*', { count: 'exact', head: true })
      .eq('claimed_booking_id', null)
      .gt('expires_at', new Date().toISOString());

    console.log(`[${new Date().toISOString()}] Active unclaimed holds: ${activeHoldsCount ?? 0}`);

  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupExpiredHolds();
