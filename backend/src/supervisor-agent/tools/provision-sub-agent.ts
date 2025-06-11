import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import handleProvisionAgent from '../../provision-agent/provision-agent';
import { AgentError } from '../../utils/agent-error';
import { AgentMetrics } from '../../utils/agent-metrics';
import { PayloadHandler, StandardPayload } from '../../utils/payload-handler';

const provisionAgentTool = new DynamicStructuredTool({
  name: 'provision_agent_tool',
  description:
    'Use this tool for handling cloud service provisioning requests. This includes getting service configurations and deploying services.',
  schema: z.object({
    message: z
      .string()
      .describe(
        'The user query about provisioning or deploying cloud services',
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
    userId: z.string().describe('User ID for the deployment'),
    payload: z
      .union([z.record(z.any()), z.string()])
      .optional()
      .describe(
        'Optional payload for deployment. Can be an object or JSON string.',
      ),
  }),

  func: async ({ message, userId, csp, payload }) => {
    const startTime = Date.now();
    const metrics = AgentMetrics.getInstance();
    const payloadHandler = PayloadHandler.getInstance();
    let success = false;

    try {
      console.log('Provision agent tool input:', {
        message,
        userId,
        csp,
        payload,
      });

      // Check if payload is empty or undefined
      const isEmptyPayload = !payload || 
        (typeof payload === 'object' && Object.keys(payload).length === 0) ||
        (typeof payload === 'string' && payload.trim() === '');

      if (isEmptyPayload) {
        console.log('Empty payload detected, using service config tool');
        const result = await handleProvisionAgent({
          message,
          userId,
          csp,
          payload: undefined, // Explicitly set to undefined to use service config tool
        });
        success = true;
        return JSON.stringify(result);
      }

      let standardizedPayload: StandardPayload | undefined = undefined;

      try {
        // If payload is a string, try to parse it first
        const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
        // Standardize the payload
        standardizedPayload = payloadHandler.standardizePayload(payloadObj);
        console.log('Standardized payload:', standardizedPayload);
      } catch (error) {
        console.error('Error standardizing payload:', error);
        // If standardization fails, try to clean and parse the string
        if (typeof payload === 'string') {
          try {
            const cleanedPayload = payload
              .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // fix keys
              .replace(/'/g, '"') // fix string quotes
              .replace(/,\s*([}\]])/g, '$1') // remove trailing commas
              .replace(/([{[])\s*,/g, '$1') // remove leading commas
              .replace(/,+/g, ',') // fix multiple commas
              .replace(/,\s*}/g, '}') // fix trailing commas in objects
              .replace(/,\s*]/g, ']') // fix trailing commas in arrays
              .trim();

            const parsedPayload = JSON.parse(cleanedPayload);
            standardizedPayload = payloadHandler.standardizePayload(parsedPayload);
            console.log('Cleaned and standardized payload:', standardizedPayload);
          } catch (cleanError) {
            console.error('Failed to clean and parse payload:', cleanError);
            // Instead of throwing error, use service config tool
            console.log('Using service config tool due to invalid payload');
            const result = await handleProvisionAgent({
              message,
              userId,
              csp,
              payload: undefined,
            });
            success = true;
            return JSON.stringify(result);
          }
        } else {
          // Instead of throwing error, use service config tool
          console.log('Using service config tool due to invalid payload');
          const result = await handleProvisionAgent({
            message,
            userId,
            csp,
            payload: undefined,
          });
          success = true;
          return JSON.stringify(result);
        }
      }

      const result = await handleProvisionAgent({
        message,
        userId,
        csp,
        payload: standardizedPayload,
      });

      success = true;
      return JSON.stringify(result);
    } catch (error) {
      const agentError =
        error instanceof AgentError
          ? error
          : AgentError.fromError(error, 'provision_agent_tool');

      console.error('Error in provision agent tool:', agentError);
      return JSON.stringify({
        response: 'Failed to process the provision request',
        tool_response: {
          status: 'error',
          message: agentError.message,
          service: null,
          deployment: null,
        },
      });
    } finally {
      const executionTime = Date.now() - startTime;
      metrics.recordToolExecution(
        'provision_agent_tool',
        executionTime,
        success,
      );
    }
  },
});

export { provisionAgentTool };