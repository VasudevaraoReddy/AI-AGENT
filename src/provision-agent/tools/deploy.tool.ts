import { tool } from '@langchain/core/tools';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { PayloadHandler, StandardPayload } from '../../utils/payload-handler';

const deployTool = tool(
  async ({ serviceName, payload, csp, userId }) => {
    const payloadHandler = PayloadHandler.getInstance();

    // If no payload is provided or it's the default message
    if (!payload || payload === "No payload provided") {
      return JSON.stringify({
        response: `Cannot deploy without configuration data. Please provide the required configuration values.`,
        tool_response: {
          status: 'error',
          message: 'Missing configuration data',
          details: {
            status: 'error',
            error: 'Configuration data is required for deployment',
            provider: csp,
            service: serviceName,
          },
        },
      });
    }

    // Parse and standardize the payload
    let standardizedPayload: StandardPayload;
    try {
      // If payload is a string, try to parse it first
      const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
      standardizedPayload = payloadHandler.standardizePayload(payloadObj);
    } catch (error) {
      console.error('Payload parsing error:', error);
      return JSON.stringify({
        response: `Invalid payload format. Please provide a valid configuration object.`,
        tool_response: {
          status: 'error',
          message: 'Invalid payload format',
          details: {
            status: 'error',
            error: 'Payload must be a valid JSON object',
            provider: csp,
            service: serviceName,
          },
        },
      });
    }

    const formData = standardizedPayload.formData;
    const template = standardizedPayload.template;
    
    // Basic input validation
    if (!formData || Object.keys(formData).length === 0) {
      return JSON.stringify({
        response: `Cannot deploy without configuration data. Please provide the required configuration values.`,
        tool_response: {
          status: 'error',
          message: 'Missing or empty configuration data',
          details: {
            status: 'error',
            error: 'Configuration data is required for deployment',
            provider: csp,
            service: serviceName,
          },
        },
      });
    }

    try {
      console.log('Initiating deployment:', { serviceName, csp, userId, formData });

      const deploymentId = uuidv4();
      const deploymentRequest = {
        deploymentId,
        userId,
        service: {
          name: serviceName,
          provider: csp.toLowerCase(),
          configuration: formData,
        },
        template: template || null,
        timestamp: new Date().toISOString(),
      };

      // Optional: call actual deployment API
      // const response = await axios.post('http://localhost:3001/deployments/create', deploymentRequest);

      return JSON.stringify({
        response: `Deployment of ${serviceName} has been initiated successfully.`,
        tool_response: {
          status: 'success',
          message: `Successfully initiated deployment of ${serviceName}`,
          details: {
            status: 'in_progress',
            provider: csp,
            service: serviceName,
            configuration: formData,
            deploymentId,
            // ...response.data,
          },
        },
      });
    } catch (error: any) {
      console.error('Deployment error:', error);
      return JSON.stringify({
        response: `Failed to deploy ${serviceName}: ${error.message}`,
        tool_response: {
          status: 'error',
          message: error.message,
          details: {
            status: 'error',
            error: error.message,
            provider: csp,
            service: serviceName,
          },
        },
      });
    }
  },
  {
    name: 'deploy_service',
    description: 'Deploy a cloud service using the given configuration. Requires serviceName, csp, userId, and payload with formData.',
    schema: z.object({
      serviceName: z.string().describe('The name of the service to deploy'),
      userId: z.string().describe('The user ID for the deployment'),
      csp: z.string().describe('The cloud service provider (AWS, Azure, GCP, or Oracle)'),
      payload: z.any().describe('Configuration data for the deployment (can be string or object)')
    }),
  }
);

export default deployTool;
