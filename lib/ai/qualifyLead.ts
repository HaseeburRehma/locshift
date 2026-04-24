import Anthropic from '@anthropic-ai/sdk';
import { Lead, QualificationResult } from '../types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

/**
 * Structured tool used to force Claude to return a well-typed
 * QualificationResult object. This is more reliable than prompting
 * for JSON and eliminates parsing edge cases.
 */
const QUALIFY_LEAD_TOOL: Anthropic.Tool = {
  name: 'qualify_lead',
  description:
    'Return the qualification result for a LokShift service lead. ' +
    'All fields are required.',
  input_schema: {
    type: 'object',
    properties: {
      score: {
        type: 'number',
        description: 'Qualification score from 0 (poor) to 100 (excellent).',
      },
      recommended_action: {
        type: 'string',
        enum: ['dispatch_now', 'schedule', 'follow_up', 'disqualify'],
      },
      qualification_reason: {
        type: 'string',
        description: 'Short explanation (1-2 sentences) for the score/action.',
      },
      ai_summary: {
        type: 'string',
        description: 'One-paragraph summary of the lead request.',
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
      },
      job_type: {
        type: 'string',
        description: 'Normalized job/trade type, e.g. "plumbing", "electrical".',
      },
      urgency: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
      },
      estimated_value: {
        type: 'number',
        description: 'Estimated job value in EUR. 0 if unknown.',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
      },
    },
    required: [
      'score',
      'recommended_action',
      'qualification_reason',
      'ai_summary',
      'confidence',
      'job_type',
      'urgency',
      'estimated_value',
      'priority',
    ],
  },
};

export async function qualifyLead(lead: Lead): Promise<QualificationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not defined');
  }

  const userPrompt = `
Analyze the following lead data and qualify it for LokShift, a platform connecting customers with service technicians (plumbers, electricians, etc.).

Lead Data:
- Name: ${lead.name}
- Service Type: ${lead.service_type}
- Urgency: ${lead.urgency}
- Description: ${lead.description}
- Budget: ${lead.budget || 'Not specified'}

Call the qualify_lead tool with your assessment.
`.trim();

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        'You are an expert lead qualification assistant for LokShift. ' +
        'You analyze service requests and produce a structured qualification ' +
        'via the provided tool. Be decisive and conservative with scores.',
      tools: [QUALIFY_LEAD_TOOL],
      tool_choice: { type: 'tool', name: 'qualify_lead' },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (!toolUse) {
      throw new Error('No tool_use block received from Claude');
    }

    return toolUse.input as QualificationResult;
  } catch (error) {
    console.error('[qualifyLead] Error qualifying lead with Claude:', error);
    // Fallback logic — keep the service resilient if the AI call fails.
    return {
      score: lead.urgency === 'high' ? 80 : 50,
      recommended_action: lead.urgency === 'high' ? 'dispatch_now' : 'schedule',
      qualification_reason: 'AI qualification failed. Using fallback based on urgency.',
      ai_summary: lead.description.substring(0, 100) + '...',
      confidence: 'low',
      job_type: lead.service_type,
      urgency: lead.urgency as any,
      estimated_value: 0,
      priority: lead.urgency === 'high' ? 'high' : 'medium',
    };
  }
}
