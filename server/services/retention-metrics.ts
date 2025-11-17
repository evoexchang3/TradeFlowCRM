import { db } from "../db";
import { clients, accounts, transactions, auditLogs, teams, users } from "@shared/schema";
import { sql, inArray, eq, and } from "drizzle-orm";

/**
 * Calculate retention deposit metrics (STD - Subsequent Time Deposits)
 * Excludes FTD and only counts deposits made AFTER the client was assigned to the agent
 */
export async function calculateRetentionDeposits(
  agentId: string,
  clientIds: string[],
  accountIds: string[],
  startDate?: Date,
  endDate?: Date
) {
  if (clientIds.length === 0 || accountIds.length === 0) {
    return {
      totalDeposits: 0,
      totalDepositVolume: 0,
      avgDepositAmount: 0,
      depositRate: 0,
    };
  }

  // For each client, we need to find when they were assigned to this agent
  // Then count only deposits made AFTER that assignment (and excluding FTD)
  // We use audit logs to track assignment dates
  const depositsByClient = await db.execute(sql`
    WITH client_assignments AS (
      SELECT 
        c.id as client_id,
        COALESCE(
          (
            SELECT al.created_at 
            FROM audit_logs al 
            WHERE al.action = 'client_transferred' 
              AND al.target_id = c.id 
              AND (al.details->>'newAgentId')::text = ${agentId}
            ORDER BY al.created_at DESC 
            LIMIT 1
          ),
          c.created_at
        ) as assignment_date
      FROM clients c
      WHERE c.assigned_agent_id = ${agentId}
        AND c.id IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)})
    )
    SELECT 
      c.id as client_id,
      c.created_at as client_created_at,
      c.ftd_date,
      ca.assignment_date,
      COUNT(t.id) as deposit_count,
      COALESCE(SUM(t.amount), 0) as deposit_volume
    FROM clients c
    INNER JOIN client_assignments ca ON ca.client_id = c.id
    INNER JOIN accounts a ON a.client_id = c.id
    INNER JOIN transactions t ON t.account_id = a.id
    WHERE c.assigned_agent_id = ${agentId}
      AND t.type = 'deposit'
      AND t.fund_type = 'real'
      AND t.status = 'completed'
      AND a.id IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})
      AND t.completed_at >= ca.assignment_date
      AND (
        c.ftd_date IS NULL 
        OR t.completed_at > c.ftd_date
      )
      ${startDate ? sql`AND c.created_at >= ${startDate}` : sql``}
      ${endDate ? sql`AND c.created_at <= ${endDate}` : sql``}
    GROUP BY c.id, c.created_at, c.ftd_date, ca.assignment_date
  `);

  const totalDeposits = depositsByClient.rows.reduce((sum: number, row: any) => 
    sum + Number(row.deposit_count || 0), 0
  );
  const totalDepositVolume = depositsByClient.rows.reduce((sum: number, row: any) => 
    sum + Number(row.deposit_volume || 0), 0
  );
  const avgDepositAmount = totalDeposits > 0 ? totalDepositVolume / totalDeposits : 0;
  const depositRate = clientIds.length > 0 ? totalDeposits / clientIds.length : 0;

  return {
    totalDeposits,
    totalDepositVolume: Number(totalDepositVolume.toFixed(2)),
    avgDepositAmount: Number(avgDepositAmount.toFixed(2)),
    depositRate: Number(depositRate.toFixed(2)),
  };
}

/**
 * Count "FTDs Received" - clients who were FIRST assigned to retention department
 * (not reassignments within retention)
 */
export async function countFtdsReceivedByRetention(
  retentionClientIds: string[]
): Promise<number> {
  if (retentionClientIds.length === 0) return 0;

  // Find all audit logs where a client was transferred TO retention department
  // Filter for retention FIRST, then get the earliest transfer per client
  const ftdsReceivedQuery = await db.execute(sql`
    WITH retention_transfers AS (
      -- Get all transfers where the NEW team is in retention
      SELECT 
        al.target_id as client_id,
        al.created_at,
        al.details->>'previousAgentId' as prev_agent_id,
        al.details->>'newAgentId' as new_agent_id,
        al.details->>'previousTeamId' as prev_team_id,
        al.details->>'newTeamId' as new_team_id,
        ROW_NUMBER() OVER (PARTITION BY al.target_id ORDER BY al.created_at ASC) as rn
      FROM audit_logs al
      INNER JOIN users new_user ON new_user.id = (al.details->>'newAgentId')::text
      INNER JOIN teams new_team ON new_team.id = COALESCE((al.details->>'newTeamId')::text, new_user.team_id)
      WHERE al.action = 'client_transferred'
        AND al.target_id IN (${sql.join(retentionClientIds.map(id => sql`${id}`), sql`, `)})
        AND new_team.department = 'retention'
    ),
    first_retention_transfer AS (
      -- Get only the FIRST transfer to retention for each client
      SELECT *
      FROM retention_transfers
      WHERE rn = 1
    )
    SELECT COUNT(*) as ftd_received_count
    FROM first_retention_transfer frt
    LEFT JOIN users prev_user ON prev_user.id = frt.prev_agent_id
    LEFT JOIN teams prev_team ON prev_team.id = COALESCE(frt.prev_team_id, prev_user.team_id)
    WHERE 
      -- The previous team/agent was NOT in retention (or was null/unassigned)
      prev_team.department IS NULL OR prev_team.department != 'retention'
  `);

  return Number(ftdsReceivedQuery.rows[0]?.ftd_received_count || 0);
}

/**
 * Aggregate retention metrics for multiple agents (used for team totals)
 */
export async function aggregateRetentionMetrics(
  agentIds: string[],
  startDate?: Date,
  endDate?: Date
) {
  if (agentIds.length === 0) {
    return {
      totalClients: 0,
      totalRealFTDs: 0,
      totalDemoFTDs: 0,
      totalStdValue: 0,
      ftdsReceived: 0,
    };
  }

  // Get all retention clients for these agents
  const retentionClients = await db.query.clients.findMany({
    where: and(
      eq(clients.hasFTD, true),
      inArray(clients.assignedAgentId, agentIds)
    ),
  });

  const clientIds = retentionClients.map(c => c.id);
  
  // Count FTDs by fund type
  const totalRealFTDs = retentionClients.filter(c => c.ftdFundType === 'real').length;
  const totalDemoFTDs = retentionClients.filter(c => c.ftdFundType === 'demo').length;

  // Calculate STD total across all agents
  let totalStdValue = 0;
  
  if (clientIds.length > 0) {
    // Get all accounts for these clients
    const clientAccounts = await db.query.accounts.findMany({
      where: inArray(accounts.clientId, clientIds),
    });
    
    const accountIds = clientAccounts.map(a => a.id);

    // Calculate deposits for each agent and sum them up
    for (const agentId of agentIds) {
      const agentClientIds = retentionClients
        .filter(c => c.assignedAgentId === agentId)
        .map(c => c.id);
      
      if (agentClientIds.length > 0) {
        const depositMetrics = await calculateRetentionDeposits(
          agentId,
          agentClientIds,
          accountIds,
          startDate,
          endDate
        );
        totalStdValue += depositMetrics.totalDepositVolume;
      }
    }
  }

  // Count FTDs received (first assignment to retention)
  const ftdsReceived = await countFtdsReceivedByRetention(clientIds);

  return {
    totalClients: retentionClients.length,
    totalRealFTDs,
    totalDemoFTDs,
    totalStdValue: Number(totalStdValue.toFixed(2)),
    ftdsReceived,
  };
}
