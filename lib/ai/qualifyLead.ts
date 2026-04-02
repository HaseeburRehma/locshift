import OpenAI from 'openai';
import { Lead, QualificationResult } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function qualifyLead(lead: Lead): Promise<QualificationResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not defined');
  }

  const prompt = `
    You are an expert lead qualification assistant for LokShift, a platform connecting customers with service technicians (plumbers, electricians, etc.).
    
    Analyze the following lead data and provide a qualification score (0-100), a recommended action, a brief reason for the qualification, and a summary of the request.
    
    Lead Data:
    - Name: ${lead.name}
    - Service Type: ${lead.service_type}
    - Urgency: ${lead.urgency}
    - Description: ${lead.description}
    - Budget: ${lead.budget || 'Not specified'}
    
    Return the response in valid JSON format with the following structure:
    {
      "score": number,
      "recommended_action": "dispatch_now" | "schedule" | "follow_up" | "disqualify",
      "qualification_reason": "string",
      "ai_summary": "string",
      "confidence": "high" | "medium" | "low",
      "job_type": "string",
      "urgency": "low" | "medium" | "high" | "urgent",
      "estimated_value": number,
      "priority": "low" | "medium" | "high" | "urgent"
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a professional lead analyzer.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const result = JSON.parse(content) as QualificationResult;
    return result;
  } catch (error) {
    console.error('Error qualifying lead with AI:', error);
    // Fallback logic
    return {
      score: lead.urgency === 'high' ? 80 : 50,
      recommended_action: lead.urgency === 'high' ? 'dispatch_now' : 'schedule',
      qualification_reason: 'AI qualification failed. Using fallback based on urgency.',
      ai_summary: lead.description.substring(0, 100) + '...',
      confidence: 'low',
      job_type: lead.service_type,
      urgency: lead.urgency as any,
      estimated_value: 0,
      priority: lead.urgency === 'high' ? 'high' : 'medium'
    };
  }
}
