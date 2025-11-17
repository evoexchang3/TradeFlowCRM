import { db } from "../db";
import { users, clients, teams, auditLogs, callLogs, clientComments, transactions, accounts } from "@shared/schema";
import { eq, and, sql, gte, lte, desc, count, avg, sum, inArray } from "drizzle-orm";

export interface PerformanceMetrics {
  // Agent identification
  agentId: string;
  agentName: string;
  teamId?: string;
  teamName?: string;
  department?: string;
  
  // FTD metrics (for sales agents)
  totalClients: number;
  ftdCount: number;
  ftdConversionRate: number; // percentage
  totalFtdVolume: number; // sum of FTD amounts
  avgFtdAmount: number;
  
  // Deposit metrics (for retention agents) - only deposits made while agent had the client
  totalDeposits: number; // count of real deposits (excluding FTD)
  totalDepositVolume: number; // sum of real deposit amounts (excluding FTD)
  avgDepositAmount: number;
  depositRate: number; // deposits per client
  
  // Activity metrics
  totalCalls: number;
  totalCallDuration: number; // in seconds
  avgCallDuration: number;
  totalComments: number;
  totalLogins: number;
  
  // Time-based metrics
  avgResponseTime: number; // average time from client creation to first contact
  
  // Performance score (calculated)
  performanceScore: number;
}

export interface TeamMetrics {
  teamId: string;
  teamName: string;
  department?: string;
  languageCode?: string;
  
  totalAgents: number;
  totalClients: number;
  ftdCount: number;
  ftdConversionRate: number;
  totalFtdVolume: number;
  avgFtdAmount: number;
  
  totalCalls: number;
  avgCallDuration: number;
  totalComments: number;
  
  performanceScore: number;
}

export interface DepartmentMetrics {
  department: string;
  
  totalTeams: number;
  totalAgents: number;
  totalClients: number;
  ftdCount: number;
  ftdConversionRate: number;
  totalFtdVolume: number;
  
  totalCalls: number;
  totalComments: number;
  
  performanceScore: number;
}

export interface LanguageMetrics {
  languageCode: string;
  languageName: string;
  
  totalTeams: number;
  totalAgents: number;
  totalClients: number;
  ftdCount: number;
  ftdConversionRate: number;
  totalFtdVolume: number;
}

/**
 * Calculate performance metrics for a specific agent
 */
export async function calculateAgentMetrics(
  agentId: string,
  startDate?: Date,
  endDate?: Date
): Promise<PerformanceMetrics | null> {
  // Get agent details
  const agent = await db.query.users.findFirst({
    where: eq(users.id, agentId),
    with: {
      team: true,
    },
  });

  if (!agent) {
    return null;
  }

  // Build date filters
  const dateFilters = [];
  if (startDate) {
    dateFilters.push(gte(clients.createdAt, startDate));
  }
  if (endDate) {
    dateFilters.push(lte(clients.createdAt, endDate));
  }

  // Get client metrics
  const clientMetrics = await db
    .select({
      totalClients: count(clients.id),
      ftdCount: sum(sql<number>`CASE WHEN ${clients.hasFTD} = true THEN 1 ELSE 0 END`),
      totalFtdVolume: sum(clients.ftdAmount),
      avgFtdAmount: avg(clients.ftdAmount),
    })
    .from(clients)
    .where(and(
      eq(clients.assignedAgentId, agentId),
      ...dateFilters
    ));

  // Get call metrics
  const callMetrics = await db
    .select({
      totalCalls: count(callLogs.id),
      totalCallDuration: sum(callLogs.duration),
      avgCallDuration: avg(callLogs.duration),
    })
    .from(callLogs)
    .where(and(
      eq(callLogs.agentId, agentId),
      ...(startDate ? [gte(callLogs.createdAt, startDate)] : []),
      ...(endDate ? [lte(callLogs.createdAt, endDate)] : [])
    ));

  // Get comment count
  const commentMetrics = await db
    .select({
      totalComments: count(clientComments.id),
    })
    .from(clientComments)
    .where(and(
      eq(clientComments.userId, agentId),
      ...(startDate ? [gte(clientComments.createdAt, startDate)] : []),
      ...(endDate ? [lte(clientComments.createdAt, endDate)] : [])
    ));

  // Get login count
  const loginMetrics = await db
    .select({
      totalLogins: count(auditLogs.id),
    })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.userId, agentId),
      eq(auditLogs.action, 'login'),
      ...(startDate ? [gte(auditLogs.createdAt, startDate)] : []),
      ...(endDate ? [lte(auditLogs.createdAt, endDate)] : [])
    ));

  // Calculate response time (average time from client creation to first call)
  const responseTimeQuery = await db.execute(sql`
    SELECT AVG(EXTRACT(EPOCH FROM (cl.created_at - c.created_at))) as avg_response_time
    FROM call_logs cl
    INNER JOIN clients c ON cl.client_id = c.id
    WHERE cl.agent_id = ${agentId}
    AND cl.created_at = (
      SELECT MIN(created_at) 
      FROM call_logs 
      WHERE client_id = c.id AND agent_id = ${agentId}
    )
    ${startDate ? sql`AND c.created_at >= ${startDate}` : sql``}
    ${endDate ? sql`AND c.created_at <= ${endDate}` : sql``}
  `);

  const clientData = clientMetrics[0];
  const callData = callMetrics[0];
  const commentData = commentMetrics[0];
  const loginData = loginMetrics[0];
  const avgResponseTime = Number(responseTimeQuery.rows[0]?.avg_response_time || 0);

  const totalClients = Number(clientData?.totalClients || 0);
  const ftdCount = Number(clientData?.ftdCount || 0);
  const ftdConversionRate = totalClients > 0 ? (ftdCount / totalClients) * 100 : 0;

  // Calculate performance score (0-100 scale)
  // Formula: (FTD Rate * 40) + (Activity Score * 30) + (Response Time Score * 30)
  const ftdScore = Math.min(ftdConversionRate * 2, 40); // Max 40 points
  const activityScore = Math.min(
    ((Number(callData?.totalCalls || 0) / Math.max(totalClients, 1)) * 15) + 
    ((Number(commentData?.totalComments || 0) / Math.max(totalClients, 1)) * 15),
    30
  ); // Max 30 points
  const responseTimeScore = avgResponseTime > 0 
    ? Math.max(30 - (avgResponseTime / 3600), 0) // Deduct points for slow response (1 hour = 1 point)
    : 30; // Max 30 points if no data

  // For retention agents, calculate deposit metrics (excluding FTD)
  let totalDeposits = 0;
  let totalDepositVolume = 0;
  let avgDepositAmount = 0;
  let depositRate = 0;
  
  const isRetentionAgent = agent.team?.department === 'retention';
  
  if (isRetentionAgent) {
    // Get all clients assigned to this agent
    const agentClients = await db.query.clients.findMany({
      where: and(
        eq(clients.assignedAgentId, agentId),
        ...dateFilters
      ),
    });
    
    if (agentClients.length > 0) {
      const clientIds = agentClients.map(c => c.id);
      
      // Get all accounts for these clients
      const clientAccounts = await db.query.accounts.findMany({
        where: inArray(accounts.clientId, clientIds),
      });
      
      const accountIds = clientAccounts.map(a => a.id);
      
      if (accountIds.length > 0) {
        // For each client, we need to find when they were assigned to this agent
        // Then count only deposits made AFTER that assignment (and excluding FTD)
        const depositsByClient = await db.execute(sql`
          SELECT 
            c.id as client_id,
            c.created_at as client_created_at,
            c.ftd_date,
            COUNT(t.id) as deposit_count,
            COALESCE(SUM(t.amount), 0) as deposit_volume
          FROM clients c
          INNER JOIN accounts a ON a.client_id = c.id
          INNER JOIN transactions t ON t.account_id = a.id
          WHERE c.assigned_agent_id = ${agentId}
            AND t.type = 'deposit'
            AND t.fund_type = 'real'
            AND t.status = 'completed'
            AND c.id = ANY(${clientIds})
            ${accountIds.length > 0 ? sql`AND a.id = ANY(${accountIds})` : sql``}
            AND (
              c.ftd_date IS NULL 
              OR t.completed_at > c.ftd_date
            )
            ${startDate ? sql`AND c.created_at >= ${startDate}` : sql``}
            ${endDate ? sql`AND c.created_at <= ${endDate}` : sql``}
          GROUP BY c.id, c.created_at, c.ftd_date
        `);
        
        totalDeposits = depositsByClient.rows.reduce((sum: number, row: any) => 
          sum + Number(row.deposit_count || 0), 0
        );
        totalDepositVolume = depositsByClient.rows.reduce((sum: number, row: any) => 
          sum + Number(row.deposit_volume || 0), 0
        );
        avgDepositAmount = totalDeposits > 0 ? totalDepositVolume / totalDeposits : 0;
        depositRate = totalClients > 0 ? totalDeposits / totalClients : 0;
      }
    }
  }

  const performanceScore = Number((ftdScore + activityScore + responseTimeScore).toFixed(2));

  return {
    agentId: agent.id,
    agentName: agent.name,
    teamId: agent.teamId || undefined,
    teamName: agent.team?.name,
    department: agent.team?.department || undefined,
    
    totalClients,
    ftdCount,
    ftdConversionRate: Number(ftdConversionRate.toFixed(2)),
    totalFtdVolume: Number(clientData?.totalFtdVolume || 0),
    avgFtdAmount: Number(clientData?.avgFtdAmount || 0),
    
    totalDeposits,
    totalDepositVolume: Number(totalDepositVolume.toFixed(2)),
    avgDepositAmount: Number(avgDepositAmount.toFixed(2)),
    depositRate: Number(depositRate.toFixed(2)),
    
    totalCalls: Number(callData?.totalCalls || 0),
    totalCallDuration: Number(callData?.totalCallDuration || 0),
    avgCallDuration: Number(callData?.avgCallDuration || 0),
    totalComments: Number(commentData?.totalComments || 0),
    totalLogins: Number(loginData?.totalLogins || 0),
    
    avgResponseTime: Number(avgResponseTime),
    performanceScore,
  };
}

/**
 * Calculate performance metrics for a specific team
 */
export async function calculateTeamMetrics(
  teamId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TeamMetrics | null> {
  // Get team details
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!team) {
    return null;
  }

  // Get team agents
  const teamAgents = await db.query.users.findMany({
    where: eq(users.teamId, teamId),
  });

  const agentIds = teamAgents.map(a => a.id);

  if (agentIds.length === 0) {
    return {
      teamId: team.id,
      teamName: team.name,
      department: team.department || undefined,
      languageCode: team.languageCode || undefined,
      totalAgents: 0,
      totalClients: 0,
      ftdCount: 0,
      ftdConversionRate: 0,
      totalFtdVolume: 0,
      avgFtdAmount: 0,
      totalCalls: 0,
      avgCallDuration: 0,
      totalComments: 0,
      performanceScore: 0,
    };
  }

  // Build date filters
  const dateFilters = [];
  if (startDate) {
    dateFilters.push(gte(clients.createdAt, startDate));
  }
  if (endDate) {
    dateFilters.push(lte(clients.createdAt, endDate));
  }

  // Get aggregated client metrics for team
  const clientMetrics = await db
    .select({
      totalClients: count(clients.id),
      ftdCount: sum(sql<number>`CASE WHEN ${clients.hasFTD} = true THEN 1 ELSE 0 END`),
      totalFtdVolume: sum(clients.ftdAmount),
      avgFtdAmount: avg(clients.ftdAmount),
    })
    .from(clients)
    .where(and(
      eq(clients.teamId, teamId),
      ...dateFilters
    ));

  // Get aggregated call metrics
  const callMetrics = await db
    .select({
      totalCalls: count(callLogs.id),
      avgCallDuration: avg(callLogs.duration),
    })
    .from(callLogs)
    .where(and(
      sql`${callLogs.agentId} = ANY(${agentIds})`,
      ...(startDate ? [gte(callLogs.createdAt, startDate)] : []),
      ...(endDate ? [lte(callLogs.createdAt, endDate)] : [])
    ));

  // Get aggregated comment count
  const commentMetrics = await db
    .select({
      totalComments: count(clientComments.id),
    })
    .from(clientComments)
    .where(and(
      sql`${clientComments.userId} = ANY(${agentIds})`,
      ...(startDate ? [gte(clientComments.createdAt, startDate)] : []),
      ...(endDate ? [lte(clientComments.createdAt, endDate)] : [])
    ));

  const clientData = clientMetrics[0];
  const callData = callMetrics[0];
  const commentData = commentMetrics[0];

  const totalClients = Number(clientData?.totalClients || 0);
  const ftdCount = Number(clientData?.ftdCount || 0);
  const ftdConversionRate = totalClients > 0 ? (ftdCount / totalClients) * 100 : 0;

  // Calculate team performance score (average of agent scores)
  const agentMetricsPromises = agentIds.map(id => calculateAgentMetrics(id, startDate, endDate));
  const agentMetricsResults = await Promise.all(agentMetricsPromises);
  const validAgentMetrics = agentMetricsResults.filter(m => m !== null) as PerformanceMetrics[];
  const avgPerformanceScore = validAgentMetrics.length > 0
    ? validAgentMetrics.reduce((sum, m) => sum + m.performanceScore, 0) / validAgentMetrics.length
    : 0;

  return {
    teamId: team.id,
    teamName: team.name,
    department: team.department || undefined,
    languageCode: team.languageCode || undefined,
    
    totalAgents: agentIds.length,
    totalClients,
    ftdCount,
    ftdConversionRate: Number(ftdConversionRate.toFixed(2)),
    totalFtdVolume: Number(clientData?.totalFtdVolume || 0),
    avgFtdAmount: Number(clientData?.avgFtdAmount || 0),
    
    totalCalls: Number(callData?.totalCalls || 0),
    avgCallDuration: Number(callData?.avgCallDuration || 0),
    totalComments: Number(commentData?.totalComments || 0),
    
    performanceScore: Number(avgPerformanceScore.toFixed(2)),
  };
}

/**
 * Calculate performance metrics by department
 */
export async function calculateDepartmentMetrics(
  department: 'sales' | 'retention' | 'support',
  startDate?: Date,
  endDate?: Date
): Promise<DepartmentMetrics> {
  // Get all teams in department
  const departmentTeams = await db.query.teams.findMany({
    where: eq(teams.department, department),
  });

  const teamIds = departmentTeams.map(t => t.id);

  if (teamIds.length === 0) {
    return {
      department,
      totalTeams: 0,
      totalAgents: 0,
      totalClients: 0,
      ftdCount: 0,
      ftdConversionRate: 0,
      totalFtdVolume: 0,
      totalCalls: 0,
      totalComments: 0,
      performanceScore: 0,
    };
  }

  // Get all agents in department teams
  const departmentAgents = await db.query.users.findMany({
    where: sql`${users.teamId} = ANY(${teamIds})`,
  });

  const agentIds = departmentAgents.map(a => a.id);

  // Build date filters
  const dateFilters = [];
  if (startDate) {
    dateFilters.push(gte(clients.createdAt, startDate));
  }
  if (endDate) {
    dateFilters.push(lte(clients.createdAt, endDate));
  }

  // Get aggregated client metrics
  const clientMetrics = await db
    .select({
      totalClients: count(clients.id),
      ftdCount: sum(sql<number>`CASE WHEN ${clients.hasFTD} = true THEN 1 ELSE 0 END`),
      totalFtdVolume: sum(clients.ftdAmount),
    })
    .from(clients)
    .where(and(
      sql`${clients.teamId} = ANY(${teamIds})`,
      ...dateFilters
    ));

  // Get aggregated activity metrics
  const callMetrics = await db
    .select({
      totalCalls: count(callLogs.id),
    })
    .from(callLogs)
    .where(and(
      agentIds.length > 0 ? sql`${callLogs.agentId} = ANY(${agentIds})` : sql`1=0`,
      ...(startDate ? [gte(callLogs.createdAt, startDate)] : []),
      ...(endDate ? [lte(callLogs.createdAt, endDate)] : [])
    ));

  const commentMetrics = await db
    .select({
      totalComments: count(clientComments.id),
    })
    .from(clientComments)
    .where(and(
      agentIds.length > 0 ? sql`${clientComments.userId} = ANY(${agentIds})` : sql`1=0`,
      ...(startDate ? [gte(clientComments.createdAt, startDate)] : []),
      ...(endDate ? [lte(clientComments.createdAt, endDate)] : [])
    ));

  const clientData = clientMetrics[0];
  const callData = callMetrics[0];
  const commentData = commentMetrics[0];

  const totalClients = Number(clientData?.totalClients || 0);
  const ftdCount = Number(clientData?.ftdCount || 0);
  const ftdConversionRate = totalClients > 0 ? (ftdCount / totalClients) * 100 : 0;

  // Calculate department performance score (average of team scores)
  const teamMetricsPromises = teamIds.map(id => calculateTeamMetrics(id, startDate, endDate));
  const teamMetricsResults = await Promise.all(teamMetricsPromises);
  const validTeamMetrics = teamMetricsResults.filter(m => m !== null) as TeamMetrics[];
  const avgPerformanceScore = validTeamMetrics.length > 0
    ? validTeamMetrics.reduce((sum, m) => sum + m.performanceScore, 0) / validTeamMetrics.length
    : 0;

  return {
    department,
    totalTeams: teamIds.length,
    totalAgents: agentIds.length,
    totalClients,
    ftdCount,
    ftdConversionRate: Number(ftdConversionRate.toFixed(2)),
    totalFtdVolume: Number(clientData?.totalFtdVolume || 0),
    totalCalls: Number(callData?.totalCalls || 0),
    totalComments: Number(commentData?.totalComments || 0),
    performanceScore: Number(avgPerformanceScore.toFixed(2)),
  };
}

/**
 * Calculate performance metrics by language
 */
export async function calculateLanguageMetrics(
  languageCode: string,
  startDate?: Date,
  endDate?: Date
): Promise<LanguageMetrics> {
  // Get all teams with this language
  const languageTeams = await db.query.teams.findMany({
    where: eq(teams.languageCode, languageCode),
  });

  const teamIds = languageTeams.map(t => t.id);

  if (teamIds.length === 0) {
    return {
      languageCode,
      languageName: languageCode,
      totalTeams: 0,
      totalAgents: 0,
      totalClients: 0,
      ftdCount: 0,
      ftdConversionRate: 0,
      totalFtdVolume: 0,
    };
  }

  // Get all agents
  const languageAgents = await db.query.users.findMany({
    where: sql`${users.teamId} = ANY(${teamIds})`,
  });

  // Build date filters
  const dateFilters = [];
  if (startDate) {
    dateFilters.push(gte(clients.createdAt, startDate));
  }
  if (endDate) {
    dateFilters.push(lte(clients.createdAt, endDate));
  }

  // Get aggregated client metrics
  const clientMetrics = await db
    .select({
      totalClients: count(clients.id),
      ftdCount: sum(sql<number>`CASE WHEN ${clients.hasFTD} = true THEN 1 ELSE 0 END`),
      totalFtdVolume: sum(clients.ftdAmount),
    })
    .from(clients)
    .where(and(
      sql`${clients.teamId} = ANY(${teamIds})`,
      ...dateFilters
    ));

  const clientData = clientMetrics[0];
  const totalClients = Number(clientData?.totalClients || 0);
  const ftdCount = Number(clientData?.ftdCount || 0);
  const ftdConversionRate = totalClients > 0 ? (ftdCount / totalClients) * 100 : 0;

  return {
    languageCode,
    languageName: languageCode, // Could be enhanced with a language map
    totalTeams: teamIds.length,
    totalAgents: languageAgents.length,
    totalClients,
    ftdCount,
    ftdConversionRate: Number(ftdConversionRate.toFixed(2)),
    totalFtdVolume: Number(clientData?.totalFtdVolume || 0),
  };
}

export interface GlobalMetrics {
  totalDepartments: number;
  totalTeams: number;
  totalAgents: number;
  totalClients: number;
  ftdCount: number;
  ftdConversionRate: number;
  totalFtdVolume: number;
  
  totalCalls: number;
  totalComments: number;
  
  byDepartment: {
    sales: DepartmentMetrics;
    retention: DepartmentMetrics;
    support: DepartmentMetrics;
  };
  
  performanceScore: number;
}

/**
 * Calculate global platform-wide metrics
 */
export async function calculateGlobalMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<GlobalMetrics> {
  // Get all departments metrics
  const salesMetrics = await calculateDepartmentMetrics('sales', startDate, endDate);
  const retentionMetrics = await calculateDepartmentMetrics('retention', startDate, endDate);
  const supportMetrics = await calculateDepartmentMetrics('support', startDate, endDate);

  // Build date filters
  const dateFilters = [];
  if (startDate) {
    dateFilters.push(gte(clients.createdAt, startDate));
  }
  if (endDate) {
    dateFilters.push(lte(clients.createdAt, endDate));
  }

  // Get global aggregates
  const globalClientMetrics = await db
    .select({
      totalClients: count(clients.id),
      ftdCount: sum(sql<number>`CASE WHEN ${clients.hasFTD} = true THEN 1 ELSE 0 END`),
      totalFtdVolume: sum(clients.ftdAmount),
    })
    .from(clients)
    .where(dateFilters.length > 0 ? and(...dateFilters) : undefined);

  // Build call date filters
  const callDateFilters = [];
  if (startDate) callDateFilters.push(gte(callLogs.createdAt, startDate));
  if (endDate) callDateFilters.push(lte(callLogs.createdAt, endDate));

  const globalCallMetrics = await db
    .select({
      totalCalls: count(callLogs.id),
    })
    .from(callLogs)
    .where(callDateFilters.length > 0 ? and(...callDateFilters) : undefined);

  // Build comment date filters
  const commentDateFilters = [];
  if (startDate) commentDateFilters.push(gte(clientComments.createdAt, startDate));
  if (endDate) commentDateFilters.push(lte(clientComments.createdAt, endDate));

  const globalCommentMetrics = await db
    .select({
      totalComments: count(clientComments.id),
    })
    .from(clientComments)
    .where(commentDateFilters.length > 0 ? and(...commentDateFilters) : undefined);

  // Get all teams and agents counts
  const allTeams = await db.query.teams.findMany();
  const allAgents = await db.query.users.findMany({
    where: eq(users.isActive, true),
  });

  const clientData = globalClientMetrics[0];
  const callData = globalCallMetrics[0];
  const commentData = globalCommentMetrics[0];

  const totalClients = Number(clientData?.totalClients || 0);
  const ftdCount = Number(clientData?.ftdCount || 0);
  const ftdConversionRate = totalClients > 0 ? (ftdCount / totalClients) * 100 : 0;

  // Calculate average performance score across all departments
  const avgPerformanceScore = (
    salesMetrics.performanceScore +
    retentionMetrics.performanceScore +
    supportMetrics.performanceScore
  ) / 3;

  return {
    totalDepartments: 3, // sales, retention, support
    totalTeams: allTeams.length,
    totalAgents: allAgents.length,
    totalClients,
    ftdCount,
    ftdConversionRate: Number(ftdConversionRate.toFixed(2)),
    totalFtdVolume: Number(clientData?.totalFtdVolume || 0),
    
    totalCalls: Number(callData?.totalCalls || 0),
    totalComments: Number(commentData?.totalComments || 0),
    
    byDepartment: {
      sales: salesMetrics,
      retention: retentionMetrics,
      support: supportMetrics,
    },
    
    performanceScore: Number(avgPerformanceScore.toFixed(2)),
  };
}

/**
 * Get top performing agents across the platform
 */
export async function getTopPerformingAgents(
  limit: number = 10,
  startDate?: Date,
  endDate?: Date
): Promise<PerformanceMetrics[]> {
  const allAgents = await db.query.users.findMany({
    where: eq(users.isActive, true),
  });

  const metricsPromises = allAgents.map(agent => 
    calculateAgentMetrics(agent.id, startDate, endDate)
  );
  
  const metricsResults = await Promise.all(metricsPromises);
  const validMetrics = metricsResults.filter(m => m !== null) as PerformanceMetrics[];
  
  return validMetrics
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, limit);
}
