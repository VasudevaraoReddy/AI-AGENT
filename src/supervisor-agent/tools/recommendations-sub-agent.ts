import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentError } from '../../utils/agent-error';
import { AgentMetrics } from '../../utils/agent-metrics';
import { BufferMemory } from 'langchain/memory';
import handleRecommendationsAgent from '../../recommendations-agent/recommendations-agent';

const recommendationsAgentTool = new DynamicStructuredTool({
  name: 'recommendations_agent_tool',
  description:
    'Use this tool to get personalized recommendations for cloud services based on specific requirements. This includes infrastructure, platform, and application service recommendations across different cloud providers.',
  schema: z.object({
    message: z
      .string()
      .describe(
        'The user query about recommendations for a service or a resource in a cloud provider',
      ),
    csp: z
      .string()
      .refine(
        (val) => ['aws', 'azure', 'gcp', 'oracle'].includes(val.toLowerCase()),
        {
          message: 'CSP must be one of: AWS, Azure, GCP, Oracle',
        },
      )
      .describe('Cloud Service Provider (AWS, Azure, GCP, Oracle)'),
    userId: z.string().describe('User ID for the recommendations'),
  }),
  func: async ({ message, csp, userId }) => {
    const startTime = Date.now();
    const metrics = AgentMetrics.getInstance();
    let success = false;

    try {
      console.log('Recommendations agent tool input:', { message, userId, csp });

      // Call the provision agent with the standardized input format
      const result = await handleRecommendationsAgent(message, csp, userId);

      success = true;
      return JSON.stringify(result);
    } catch (error) {
      const agentError =
        error instanceof AgentError
          ? error
          : AgentError.fromError(error, 'recommendations_agent_tool');

      console.error('Error in recommendations agent tool:', agentError);
      return JSON.stringify({
        response: 'Failed to process the recommendations request',
        tool_response: {
          status: 'error',
          message: agentError.message,
          recommendations: null,
        },
      });
    } finally {
      const executionTime = Date.now() - startTime;
      metrics.recordToolExecution(
        'recommendations_agent_tool',
        executionTime,
        success,
      );
    }
  },
});

export { recommendationsAgentTool };
