import { Lead, Technician, MatchResult } from '../types';

export async function matchTechnician(
  lead: Lead, 
  technicians: Technician[],
  workload: Record<string, number> = {}
): Promise<MatchResult[]> {
  const matches: MatchResult[] = technicians.map(tech => {
    let score = 0;
    let reason = '';
    
    // 1. Skill Match
    const skillMatch = tech.skills?.some(skill => 
      lead.service_type.toLowerCase().includes(skill.toLowerCase()) ||
      lead.description.toLowerCase().includes(skill.toLowerCase())
    ) || false;
    
    if (skillMatch) {
      score += 40;
      reason += 'Matches required skills. ';
    }
    
    // 2. Area Match
    const areaMatch = tech.service_area?.some(area => 
      lead.city?.toLowerCase().includes(area.toLowerCase()) ||
      lead.postcode?.startsWith(area)
    ) || false;
    
    if (areaMatch) {
      score += 40;
      reason += 'Located in service area. ';
    }
    
    // 3. Availability
    if (tech.is_available) {
      score += 20;
    } else {
      score -= 20;
      reason += 'Technician currently unavailable. ';
    }
    
    // 4. Workload penalty
    const count = workload[tech.id] || 0;
    const workloadScore = Math.max(0, 10 - count * 2); 
    score += workloadScore;
    if (count > 0) reason += `Current jobs: ${count}. `;

    return {
      technician_id: tech.id,
      technician_name: tech.name,
      score: Math.max(0, Math.min(100, score)),
      reason: reason || 'Basic match.',
      areaMatch,
      skillMatch,
      workloadScore
    };
  });

  // Return sorted matches
  return matches.sort((a, b) => b.score - a.score);
}
