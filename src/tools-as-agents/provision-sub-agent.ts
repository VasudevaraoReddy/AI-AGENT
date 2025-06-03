import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import handleProvisionAgent from '../provision-agent/provision-agent';
import { AgentError } from '../utils/agent-error';
import { AgentMetrics } from '../utils/agent-metrics';

// Create a tool that wraps the provision agent
const provisionAgentTool = new DynamicStructuredTool({
  name: 'provision_agent_tool',
  description: 'Use this tool for handling cloud service provisioning requests. This includes getting service configurations and deploying services.',
  schema: z.object({
    message: z.string().describe('The user query about provisioning or deploying cloud services'),
    csp: z.string()
      .refine(val => ['aws', 'azure', 'gcp', 'oracle'].includes(val.toLowerCase()), {
        message: 'CSP must be one of: AWS, Azure, GCP, Oracle'
      })
      .describe('Cloud Service Provider (AWS, Azure, GCP, Oracle)'),
    userId: z.string().describe('User ID for the deployment')
  }),
  func: async ({ message, userId, csp }) => {
    const startTime = Date.now();
    const metrics = AgentMetrics.getInstance();
    let success = false;

    try {
      console.log('Provision agent tool input:', { message, userId, csp });

      // Call the provision agent with the standardized input format
      const result = await handleProvisionAgent({
        message,
        userId,
        csp
      });

      success = true;
      return JSON.stringify(result);
    } catch (error) {
      const agentError = error instanceof AgentError 
        ? error 
        : AgentError.fromError(error, 'provision_agent_tool');

      console.error('Error in provision agent tool:', agentError);
      return JSON.stringify({
        response: 'Failed to process the provision request',
        tool_response: {
          status: 'error',
          message: agentError.message,
          service: null,
          deployment: null
        }
      });
    } finally {
      const executionTime = Date.now() - startTime;
      metrics.recordToolExecution('provision_agent_tool', executionTime, success);
    }
  },
});

export { provisionAgentTool };