import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import handleProvisionAgent from '../provision-agent/provision-agent';
import { AgentError } from '../utils/agent-error';
import { AgentMetrics } from '../utils/agent-metrics';

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
    userId: z.string().describe('User ID for the deployment'),
    
    // ✅ Optional payload
    payload: z.union([z.record(z.any()), z.string()]).optional()
      .describe('Optional payload for deployment. Can be an object or JSON string.')
  }),

  func: async ({ message, userId, csp, payload }) => {
    const startTime = Date.now();
    const metrics = AgentMetrics.getInstance();
    let success = false;

    try {
      console.log('Provision agent tool input:', { message, userId, csp, payload });

      let parsedPayload: Record<string, any> | undefined = undefined;

      if (typeof payload === 'string') {
        try {
          const temp = JSON.parse(payload);
          if (typeof temp === 'object' && Object.keys(temp).length > 0) {
            parsedPayload = temp;
          }
        } catch (err) {
          console.warn('Payload string is not valid JSON:', payload);
        }
      } else if (payload && typeof payload === 'object' && Object.keys(payload).length > 0) {
        parsedPayload = payload;
      }

      const result = await handleProvisionAgent({
        message,
        userId,
        csp,
        ...(parsedPayload ? { payload: parsedPayload } : {})
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
