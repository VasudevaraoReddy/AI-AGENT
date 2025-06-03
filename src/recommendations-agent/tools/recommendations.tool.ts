import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentError } from '../../utils/agent-error';

const llm = new ChatOllama({
    model: 'llama3.1',
    baseUrl: 'https://codeprism-ai.com',
    format: 'json',
});

const recommendationsTool = new DynamicStructuredTool({
    name: 'recommendations_service',
    description: 'Get personalized recommendations for cloud services based on user requirements. IMPORTANT: Use the exact input provided by the user without modification.',
    schema: z.object({
        query: z.string().describe('The exact user query for cloud service recommendations - DO NOT modify this'),
    }),
    func: async ({ query }) => {
        try {
            console.log('In recommendations tool:', { query });

            // Generate recommendations
            const recommendationsPrompt = `You are a cloud service recommendations expert. Generate detailed recommendations based on the user's requirements.

            Rules:
            1. Analyze the requirements thoroughly
            2. Consider multiple cloud providers
            3. Provide specific service recommendations
            4. Include pricing and sizing details
            5. List key features and benefits
            6. Consider alternatives
            7. Return ONLY a JSON object
            8. DO NOT modify or rephrase the user's query

            Return this EXACT JSON format:
            {
              "response": "Detailed explanation of recommendations",
              "details": {
                "category": "Service category (e.g., Compute, Storage, Database)",
                "requirements": ["Requirement 1", "Requirement 2"],
                "recommendations": [
                  {
                    "service": "Service name",
                    "provider": "Cloud provider",
                    "tier": "Recommended tier/size",
                    "estimatedCost": "Estimated monthly cost",
                    "features": ["Feature 1", "Feature 2"],
                    "benefits": ["Benefit 1", "Benefit 2"],
                    "considerations": ["Consideration 1", "Consideration 2"]
                  }
                ],
                "alternatives": [
                  {
                    "service": "Alternative service",
                    "provider": "Cloud provider",
                    "reason": "Why this is a good alternative"
                  }
                ]
              }
            }`;

            const messagePayload = [
                new SystemMessage(recommendationsPrompt),
                new HumanMessage(query),
            ];

            const response = await llm.invoke(messagePayload);
            const responseContent = String(response.content).trim();

            // Parse and validate response
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseContent);
            } catch (parseError) {
                throw new AgentError(
                    'Failed to parse recommendations response',
                    'PARSE_ERROR',
                    'recommendations_tool',
                    true,
                    { originalError: parseError }
                );
            }

            // Validate response structure
            if (!parsedResponse.response || !parsedResponse.details) {
                throw new AgentError(
                    'Invalid response format from recommendations service',
                    'INVALID_RESPONSE_FORMAT',
                    'recommendations_tool',
                    true
                );
            }

            return JSON.stringify(parsedResponse);
        } catch (error) {
            const agentError = error instanceof AgentError 
                ? error 
                : AgentError.fromError(error, 'recommendations_tool');

            console.error('Error in recommendations tool:', agentError);
            return JSON.stringify({
                response: "I encountered an error while generating recommendations. Could you please provide more specific requirements?",
                details: {
                    category: "error",
                    requirements: [],
                    recommendations: [],
                    alternatives: [],
                    error: agentError.toJSON()
                }
            });
        }
    },
});

export default recommendationsTool;
