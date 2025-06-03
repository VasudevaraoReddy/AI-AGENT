import { DynamicStructuredTool } from "langchain/tools";
import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentError } from '../utils/agent-error';
import { AgentMetrics } from '../utils/agent-metrics';
import { BufferMemory } from "langchain/memory";
import recommendationsAgentExecutor from "src/recommendations-agent/recommendations-agent";

// Create a memory instance for the recommendations agent
const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "chat_history",
    inputKey: "input",
    outputKey: "output"
});

// Create the recommendations agent
const llm = new ChatOllama({
    model: 'llama3.1',
    baseUrl: 'https://codeprism-ai.com',
    format: 'json',
});

async function runRecommendationsAgent(input: string) {
    const startTime = Date.now();
    const metrics = AgentMetrics.getInstance();
    let success = false;

    try {
        // Load chat history
        const chatHistory = await memory.loadMemoryVariables({});

        const result = await recommendationsAgentExecutor.invoke({
            input,
            chat_history: chatHistory.chat_history || []
        });

        console.log('Recommendations agent response:', result);
        
        // Handle different response formats
        let parsedOutput;
        try {
            // If the output is a string, try to parse it as JSON
            if (typeof result.output === 'string') {
                // Check if it's the "Agent stopped" message
                if (result.output.startsWith('Agent stopped')) {
                    throw new AgentError(
                        'Agent stopped before completing the response',
                        'AGENT_TIMEOUT',
                        'recommendations_agent_tool',
                        true
                    );
                }
                try {
                    parsedOutput = JSON.parse(result.output);
                } catch (parseError) {
                    // If it's not valid JSON, create a structured response
                    parsedOutput = {
                        response: result.output,
                        details: {
                            category: 'general',
                            requirements: [],
                            recommendations: [],
                            alternatives: []
                        }
                    };
                }
            } else {
                // If it's already an object, stringify and re-parse to ensure consistent format
                parsedOutput = JSON.parse(JSON.stringify(result.output));
            }
        } catch (parseError) {
            throw new AgentError(
                'Failed to parse agent response',
                'PARSE_ERROR',
                'recommendations_agent_tool',
                true,
                { originalError: parseError }
            );
        }

        // Validate the structure
        if (!parsedOutput.response) {
            parsedOutput = {
                response: typeof parsedOutput === 'string' ? parsedOutput : JSON.stringify(parsedOutput),
                details: {
                    category: 'general',
                    requirements: [],
                    recommendations: [],
                    alternatives: []
                }
            };
        }

        success = true;

        // Save the context
        await memory.saveContext(
            { input },
            { output: parsedOutput.response }
        );

        // Return the response maintaining the format
        return JSON.stringify({
            response: parsedOutput.response,
            details: {
                category: parsedOutput.details?.category || 'general',
                requirements: parsedOutput.details?.requirements || [],
                recommendations: parsedOutput.details?.recommendations || [],
                alternatives: parsedOutput.details?.alternatives || [],
                status: 'success',
                confidence_score: calculateConfidenceScore(parsedOutput.details || {})
            }
        });
    } catch (error) {
        const agentError = error instanceof AgentError 
            ? error 
            : AgentError.fromError(error, 'recommendations_agent_tool');

        console.error('Error in recommendations agent:', agentError);
        return JSON.stringify({
            response: "I encountered an error while generating recommendations. Could you please provide more details about your requirements?",
            details: {
                category: "error",
                requirements: [],
                recommendations: [],
                alternatives: [],
                status: "error",
                error: agentError.toJSON()
            }
        });
    } finally {
        const executionTime = Date.now() - startTime;
        metrics.recordToolExecution('recommendations_agent_tool', executionTime, success);
    }
}

function calculateConfidenceScore(details: any): number {
    let score = 0;
    
    // Calculate based on requirements coverage
    if (details.requirements?.length > 0) score += 0.2;
    
    // Calculate based on recommendations completeness
    if (details.recommendations?.length > 0) {
        score += 0.3;
        // Add points for detailed recommendations
        const recommendation = details.recommendations[0];
        if (recommendation.features?.length > 0) score += 0.1;
        if (recommendation.benefits?.length > 0) score += 0.1;
        if (recommendation.considerations?.length > 0) score += 0.1;
    }
    
    // Add points for alternatives
    if (details.alternatives?.length > 0) score += 0.2;

    return Math.min(1, score);
}

const recommendationsAgentTool = new DynamicStructuredTool({
    name: "recommendations_agent_tool",
    description: "Use this tool to get personalized recommendations for cloud services based on specific requirements. This includes infrastructure, platform, and application service recommendations across different cloud providers.",
    schema: z.object({
        input: z.string().describe("The user's requirements and context for cloud service recommendations"),
    }),
    func: async ({ input }) => {
        console.log('In recommendations agent tool');
        const result = await runRecommendationsAgent(input);
        return result;
    },
});

export { recommendationsAgentTool }; 