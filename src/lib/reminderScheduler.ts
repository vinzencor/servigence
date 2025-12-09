// Global Email Reminder Scheduler
// Automatically checks for expiring services and documents at configured intervals
// Runs in the background regardless of which page the user is on
// Default interval: 1 hour (configurable)

import { serviceExpiryReminderService } from './serviceExpiryReminder';

interface SchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
}

interface SchedulerStatus {
  isRunning: boolean;
  lastRunTime: Date | null;
  nextRunTime: Date | null;
  lastRunResult: {
    success: boolean;
    totalChecked: number;
    remindersSent: number;
    errors: number;
    message: string;
  } | null;
  totalRuns: number;
}

class ReminderScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private config: SchedulerConfig = {
    enabled: true,
    intervalMinutes: 60 // Default: 1 hour
  };
  private status: SchedulerStatus = {
    isRunning: false,
    lastRunTime: null,
    nextRunTime: null,
    lastRunResult: null,
    totalRuns: 0
  };

  /**
   * Start the automated reminder scheduler
   * @param intervalMinutes - Interval in minutes between checks (default: 60 minutes / 1 hour)
   */
  start(intervalMinutes: number = 60): void {
    if (this.intervalId) {
      console.log('⚠️  Reminder scheduler is already running');
      return;
    }

    this.config.intervalMinutes = intervalMinutes;
    this.config.enabled = true;

    console.log(`🚀 Starting automated reminder scheduler (every ${intervalMinutes} minutes)`);

    // Run immediately on start
    this.runCheck();

    // Set up recurring interval
    const intervalMs = intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runCheck();
    }, intervalMs);

    // Calculate next run time
    this.status.nextRunTime = new Date(Date.now() + intervalMs);

    console.log(`✅ Reminder scheduler started successfully`);
    console.log(`⏰ Next check scheduled at: ${this.status.nextRunTime.toLocaleString()}`);
  }

  /**
   * Stop the automated reminder scheduler
   */
  stop(): void {
    if (!this.intervalId) {
      console.log('⚠️  Reminder scheduler is not running');
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.config.enabled = false;
    this.status.isRunning = false;
    this.status.nextRunTime = null;

    console.log('🛑 Reminder scheduler stopped');
  }

  /**
   * Run the reminder check
   */
  private async runCheck(): Promise<void> {
    if (this.status.isRunning) {
      console.log('⏭️  Skipping check - previous check still running');
      return;
    }

    this.status.isRunning = true;
    const startTime = new Date();

    console.log('\n' + '='.repeat(80));
    console.log(`🔔 AUTOMATED REMINDER CHECK #${this.status.totalRuns + 1}`);
    console.log(`⏰ Started at: ${startTime.toLocaleString()}`);
    console.log('='.repeat(80));

    try {
      const result = await serviceExpiryReminderService.checkAndSendReminders();
      
      this.status.lastRunResult = result;
      this.status.lastRunTime = startTime;
      this.status.totalRuns++;

      // Calculate next run time
      const intervalMs = this.config.intervalMinutes * 60 * 1000;
      this.status.nextRunTime = new Date(Date.now() + intervalMs);

      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;

      console.log('\n' + '-'.repeat(80));
      console.log('📊 CHECK RESULTS:');
      console.log(`   ✅ Success: ${result.success}`);
      console.log(`   📋 Total Checked: ${result.totalChecked}`);
      console.log(`   📧 Reminders Sent: ${result.remindersSent}`);
      console.log(`   ❌ Errors: ${result.errors}`);
      console.log(`   💬 Message: ${result.message}`);
      console.log(`   ⏱️  Duration: ${duration.toFixed(2)}s`);
      console.log(`   🔄 Total Runs: ${this.status.totalRuns}`);
      console.log(`   ⏰ Next Check: ${this.status.nextRunTime.toLocaleString()}`);
      console.log('-'.repeat(80) + '\n');

    } catch (error: any) {
      console.error('❌ Error in automated reminder check:', error);
      
      this.status.lastRunResult = {
        success: false,
        totalChecked: 0,
        remindersSent: 0,
        errors: 1,
        message: `Error: ${error.message}`
      };
      this.status.lastRunTime = startTime;
      this.status.totalRuns++;

      console.log('-'.repeat(80) + '\n');
    } finally {
      this.status.isRunning = false;
    }
  }

  /**
   * Get current scheduler status
   */
  getStatus(): SchedulerStatus {
    return { ...this.status };
  }

  /**
   * Get scheduler configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.intervalId !== null && this.config.enabled;
  }
}

// Export singleton instance
export const reminderScheduler = new ReminderScheduler();

