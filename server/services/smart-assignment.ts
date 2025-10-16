import { storage } from "../storage";
import { eq, and, sql } from "drizzle-orm";
import { users, teams, smartAssignmentSettings, agentPerformanceMetrics } from "@shared/schema";

interface AssignmentContext {
  clientLanguage?: string;
  teamId?: string;
  department?: 'sales' | 'retention';
}

interface AgentScore {
  agentId: string;
  score: number;
  breakdown: {
    workloadScore: number;
    languageScore: number;
    performanceScore: number;
    availabilityScore: number;
  };
}

export class SmartAssignmentService {
  /**
   * Check if smart assignment is enabled globally or for a specific team
   */
  async isEnabled(teamId?: string): Promise<boolean> {
    const db = storage.db;
    
    // Check team-specific setting first
    if (teamId) {
      const teamSettings = await db.select()
        .from(smartAssignmentSettings)
        .where(eq(smartAssignmentSettings.teamId, teamId))
        .limit(1);
      
      // If team-specific setting exists, honor it (even if disabled)
      if (teamSettings.length > 0) {
        return teamSettings[0].isEnabled;
      }
    }
    
    // Check global setting (teamId is null) only if no team-specific setting exists
    const globalSettings = await db.select()
      .from(smartAssignmentSettings)
      .where(sql`${smartAssignmentSettings.teamId} IS NULL`)
      .limit(1);
    
    if (globalSettings.length > 0) {
      return globalSettings[0].isEnabled;
    }
    
    // Default to disabled if no settings exist
    return false;
  }

  /**
   * Get assignment settings for a team or global
   */
  async getSettings(teamId?: string) {
    const db = storage.db;
    
    // Try team-specific settings first
    if (teamId) {
      const teamSettings = await db.select()
        .from(smartAssignmentSettings)
        .where(eq(smartAssignmentSettings.teamId, teamId))
        .limit(1);
      
      if (teamSettings.length > 0) {
        return teamSettings[0];
      }
    }
    
    // Fall back to global settings
    const globalSettings = await db.select()
      .from(smartAssignmentSettings)
      .where(sql`${smartAssignmentSettings.teamId} IS NULL`)
      .limit(1);
    
    if (globalSettings.length > 0) {
      return globalSettings[0];
    }
    
    // Default settings if none exist
    return {
      isEnabled: false,
      useWorkloadBalance: true,
      useLanguageMatch: true,
      usePerformanceHistory: true,
      useAvailability: true,
      useRoundRobin: true,
    };
  }

  /**
   * Find the best agent to assign a client to using smart scoring
   */
  async findBestAgent(context: AssignmentContext): Promise<string | null> {
    // Check if smart assignment is enabled
    const enabled = await this.isEnabled(context.teamId);
    if (!enabled) {
      return null;
    }

    const settings = await this.getSettings(context.teamId);
    const db = storage.db;

    // Get eligible agents from the team
    let agentQuery = db.select().from(users);
    
    if (context.teamId) {
      agentQuery = agentQuery.where(eq(users.teamId, context.teamId));
    }
    
    const agents = await agentQuery;
    
    if (agents.length === 0) {
      return null;
    }

    // Filter by availability if enabled
    let eligibleAgents = agents;
    if (settings.useAvailability) {
      eligibleAgents = eligibleAgents.filter(agent => agent.isAvailable);
    }

    if (eligibleAgents.length === 0) {
      return null;
    }

    // Calculate scores for each agent
    const scoredAgents: AgentScore[] = await Promise.all(
      eligibleAgents.map(async (agent) => {
        const breakdown = {
          workloadScore: 0,
          languageScore: 0,
          performanceScore: 0,
          availabilityScore: 0,
        };

        // 1. Workload Balance Score (0-40 points)
        if (settings.useWorkloadBalance) {
          const workloadRatio = agent.currentWorkload / agent.maxWorkload;
          breakdown.workloadScore = Math.max(0, 40 * (1 - workloadRatio));
        }

        // 2. Language Match Score (0-30 points)
        if (settings.useLanguageMatch && context.clientLanguage) {
          // Get agent's team language
          if (agent.teamId) {
            const agentTeams = await db.select()
              .from(teams)
              .where(eq(teams.id, agent.teamId))
              .limit(1);
            
            if (agentTeams.length > 0 && agentTeams[0].languageCode === context.clientLanguage) {
              breakdown.languageScore = 30;
            }
          }
        }

        // 3. Performance Score (0-20 points)
        if (settings.usePerformanceHistory && agent.performanceScore) {
          // Performance score is 0-100, normalize to 0-20
          breakdown.performanceScore = (parseFloat(agent.performanceScore) / 100) * 20;
        }

        // 4. Availability Score (0-10 points)
        if (settings.useAvailability && agent.isAvailable) {
          breakdown.availabilityScore = 10;
        }

        const totalScore = 
          breakdown.workloadScore + 
          breakdown.languageScore + 
          breakdown.performanceScore + 
          breakdown.availabilityScore;

        return {
          agentId: agent.id,
          score: totalScore,
          breakdown,
        };
      })
    );

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);

    // Round-robin: if multiple agents have similar scores (within 5 points), rotate
    if (settings.useRoundRobin && scoredAgents.length > 1) {
      const topScore = scoredAgents[0].score;
      const similarAgents = scoredAgents.filter(a => (topScore - a.score) <= 5);
      
      if (similarAgents.length > 1) {
        // Use a simple rotation based on timestamp
        const rotationIndex = Math.floor(Date.now() / 1000) % similarAgents.length;
        return similarAgents[rotationIndex].agentId;
      }
    }

    return scoredAgents[0].agentId;
  }

  /**
   * Update agent workload after assignment
   */
  async updateAgentWorkload(agentId: string, increment: number = 1): Promise<void> {
    const db = storage.db;
    const agent = await storage.getUser(agentId);
    
    if (agent) {
      await db.update(users)
        .set({ 
          currentWorkload: agent.currentWorkload + increment,
        })
        .where(eq(users.id, agentId));
    }
  }

  /**
   * Recalculate agent workload based on active clients
   */
  async recalculateAgentWorkload(agentId: string): Promise<void> {
    const db = storage.db;
    const clients = await storage.getClients();
    const activeClients = clients.filter(
      c => c.assignedAgentId === agentId && c.isActive
    );

    await db.update(users)
      .set({ currentWorkload: activeClients.length })
      .where(eq(users.id, agentId));
  }
}

export const smartAssignmentService = new SmartAssignmentService();
