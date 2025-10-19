import { storage } from '../storage';
import { robotTradeGenerator } from './robot-trade-generator';
import type { TradingRobot } from '@shared/schema';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

export class RobotExecutor {
  private executionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize all active robots with their scheduled execution times
   */
  async initialize(): Promise<void> {
    console.log('[ROBOT EXECUTOR] Initializing robot execution schedules');
    
    const robots = await storage.getRobots();
    const activeRobots = robots.filter(r => r.status === 'active');

    for (const robot of activeRobots) {
      await this.scheduleRobot(robot);
    }

    console.log(`[ROBOT EXECUTOR] Initialized ${activeRobots.length} active robots`);
  }

  /**
   * Schedule a single robot to run at its configured execution time
   */
  async scheduleRobot(robot: TradingRobot): Promise<void> {
    // Clear existing schedule if any
    if (this.executionTimeouts.has(robot.id)) {
      clearTimeout(this.executionTimeouts.get(robot.id)!);
    }

    const nextRunTime = await this.getNextRunTime(robot.executionTime || '05:00');
    const msUntilRun = nextRunTime.getTime() - Date.now();

    console.log(`[ROBOT EXECUTOR] Scheduling robot ${robot.name} to run at ${nextRunTime.toLocaleString()}`);

    const timeout = setTimeout(async () => {
      await this.executeRobot(robot.id);
      
      // Reschedule for next execution
      const updatedRobot = await storage.getRobot(robot.id);
      if (updatedRobot && updatedRobot.status === 'active') {
        await this.scheduleRobot(updatedRobot);
      }
    }, msUntilRun);

    this.executionTimeouts.set(robot.id, timeout);
  }

  /**
   * Calculate next run time based on configured execution time
   * Returns next occurrence of the time (today or tomorrow) in the platform's configured timezone
   */
  private async getNextRunTime(executionTime: string): Promise<Date> {
    // Get platform timezone from system settings (default to UTC)
    const timezoneSetting = await storage.getSystemSetting('timezone');
    const timezone = timezoneSetting?.value || 'UTC';

    const [hours, minutes] = executionTime.split(':').map(Number);
    
    // Get current time in the configured timezone
    const nowUtc = new Date();
    const nowInTimezone = utcToZonedTime(nowUtc, timezone);
    
    // Construct datetime string in the configured timezone (YYYY-MM-DD HH:MM:SS format)
    const year = nowInTimezone.getFullYear();
    const month = String(nowInTimezone.getMonth() + 1).padStart(2, '0');
    const day = String(nowInTimezone.getDate()).padStart(2, '0');
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    
    // Create datetime string for today at execution time in configured timezone
    let dateTimeStr = `${year}-${month}-${day} ${hoursStr}:${minutesStr}:00`;
    let nextRunUtc = zonedTimeToUtc(dateTimeStr, timezone);

    // If time has already passed, schedule for tomorrow
    if (nextRunUtc.getTime() <= nowUtc.getTime()) {
      const tomorrow = nowInTimezone.getDate() + 1;
      const tomorrowDate = new Date(nowInTimezone);
      tomorrowDate.setDate(tomorrow);
      
      const tomorrowYear = tomorrowDate.getFullYear();
      const tomorrowMonth = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
      const tomorrowDay = String(tomorrowDate.getDate()).padStart(2, '0');
      
      dateTimeStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay} ${hoursStr}:${minutesStr}:00`;
      nextRunUtc = zonedTimeToUtc(dateTimeStr, timezone);
    }

    return nextRunUtc;
  }

  /**
   * Manually execute a robot immediately (for testing or manual triggers)
   */
  async executeRobotNow(robotId: string): Promise<{ success: boolean; message: string; stats?: any }> {
    return await this.executeRobot(robotId);
  }

  /**
   * Execute a robot: generate historical trades for all assigned clients
   */
  private async executeRobot(robotId: string): Promise<{ success: boolean; message: string; stats?: any }> {
    console.log(`[ROBOT EXECUTOR] Starting execution for robot ${robotId}`);

    try {
      // 1. Get robot details
      const robot = await storage.getRobot(robotId);
      if (!robot) {
        const message = `Robot ${robotId} not found`;
        console.error(`[ROBOT EXECUTOR] ${message}`);
        return { success: false, message };
      }

      if (robot.status !== 'active') {
        const message = `Robot ${robot.name} is not active (status: ${robot.status})`;
        console.log(`[ROBOT EXECUTOR] ${message}`);
        return { success: false, message };
      }

      // 2. Get all assigned clients
      const assignments = await storage.getRobotAssignments(robotId);
      const activeAssignments = assignments.filter(a => a.isActive);

      if (activeAssignments.length === 0) {
        const message = `Robot ${robot.name} has no active client assignments`;
        console.log(`[ROBOT EXECUTOR] ${message}`);
        return { success: true, message, stats: { clientsProcessed: 0, tradesGenerated: 0 } };
      }

      console.log(`[ROBOT EXECUTOR] Processing ${activeAssignments.length} clients for robot ${robot.name}`);

      // 3. Process each assigned client
      const stats = {
        clientsProcessed: 0,
        clientsSkipped: 0,
        tradesGenerated: 0,
        totalProfit: 0,
        errors: [] as string[],
      };

      for (const assignment of activeAssignments) {
        try {
          const account = await storage.getAccount(assignment.accountId);
          if (!account) {
            stats.clientsSkipped++;
            stats.errors.push(`Account ${assignment.accountId} not found`);
            continue;
          }

          // Generate trades for this client
          console.log(`[ROBOT EXECUTOR] Generating trades for account ${account.accountNumber}`);
          const trades = await robotTradeGenerator.generateTradesForClient(robot, account);

          if (trades.length === 0) {
            stats.clientsSkipped++;
            console.log(`[ROBOT EXECUTOR] No trades generated for account ${account.accountNumber} (likely insufficient balance)`);
            continue;
          }

          // Save trades to database
          await robotTradeGenerator.saveTradesForAccount(account.id, robotId, trades);

          // Update stats
          stats.clientsProcessed++;
          stats.tradesGenerated += trades.length;
          const clientProfit = trades.reduce((sum, t) => sum + parseFloat(t.realizedPnl), 0);
          stats.totalProfit += clientProfit;

          console.log(`[ROBOT EXECUTOR] Generated ${trades.length} trades for account ${account.accountNumber}, profit: $${clientProfit.toFixed(2)}`);

        } catch (error: any) {
          stats.clientsSkipped++;
          stats.errors.push(`Account ${assignment.accountId}: ${error.message}`);
          console.error(`[ROBOT EXECUTOR] Error processing account ${assignment.accountId}:`, error);
        }
      }

      // 4. Update robot's last run time
      await storage.updateRobot(robotId, {
        lastRunAt: new Date(),
      });

      // 5. Create audit log
      await storage.createAuditLog({
        action: 'robot_executed',
        targetType: 'trading_robot',
        targetId: robotId,
        details: {
          robotName: robot.name,
          clientsProcessed: stats.clientsProcessed,
          clientsSkipped: stats.clientsSkipped,
          tradesGenerated: stats.tradesGenerated,
          totalProfit: stats.totalProfit.toFixed(2),
          errors: stats.errors.length > 0 ? stats.errors : undefined,
        },
      });

      const message = `Robot ${robot.name} executed successfully: ${stats.clientsProcessed} clients processed, ${stats.tradesGenerated} trades generated, total profit: $${stats.totalProfit.toFixed(2)}`;
      console.log(`[ROBOT EXECUTOR] ${message}`);

      return { success: true, message, stats };

    } catch (error: any) {
      const message = `Robot execution failed: ${error.message}`;
      console.error(`[ROBOT EXECUTOR] ${message}`, error);

      // Log error to audit logs
      await storage.createAuditLog({
        action: 'robot_execution_failed',
        targetType: 'trading_robot',
        targetId: robotId,
        details: {
          error: error.message,
          stack: error.stack,
        },
      });

      return { success: false, message };
    }
  }

  /**
   * Unschedule a robot (when paused or deleted)
   */
  unscheduleRobot(robotId: string): void {
    if (this.executionTimeouts.has(robotId)) {
      clearTimeout(this.executionTimeouts.get(robotId)!);
      this.executionTimeouts.delete(robotId);
      console.log(`[ROBOT EXECUTOR] Unscheduled robot ${robotId}`);
    }
  }

  /**
   * Reschedule a robot when its configuration changes
   */
  async rescheduleRobot(robotId: string): Promise<void> {
    const robot = await storage.getRobot(robotId);
    if (robot && robot.status === 'active') {
      this.scheduleRobot(robot);
    } else {
      this.unscheduleRobot(robotId);
    }
  }

  /**
   * Get execution status for all robots
   */
  getRobotStatuses(): Array<{ robotId: string; scheduled: boolean; nextRun?: Date }> {
    const statuses: Array<{ robotId: string; scheduled: boolean; nextRun?: Date }> = [];
    
    this.executionTimeouts.forEach((timeout, robotId) => {
      statuses.push({
        robotId,
        scheduled: true,
        // Note: we can't easily get the exact next run time from a setTimeout
        // This would require storing it separately
      });
    });

    return statuses;
  }
}

export const robotExecutor = new RobotExecutor();
