import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class DeployTool {
  async deployService({
    serviceName,
    csp,
    userId,
    formData,
    template,
  }: {
    serviceName: string;
    csp: string;
    userId: string;
    formData: any;
    template?: string;
  }) {
    try {
      console.log('Initiating deployment:', { serviceName, csp, userId });

      // Generate a unique deployment ID
      const deploymentId = uuidv4();

      // Prepare the deployment request
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

      // Call your deployment API (replace with your actual API endpoint)
    //   const response = await axios.post(
    //     'http://localhost:3001/deployments/create',
    //     deploymentRequest,
    //   );

      return {
        success: true,
        deploymentId,
        message: `Successfully initiated deployment of ${serviceName}`,
        details: {
          status: 'in_progress',
          provider: csp,
          service: serviceName,
          configuration: formData,
          deploymentId,
        //   ...response.data,
        },
      };
    } catch (error) {
      console.error('Deployment error:', error);
      return {
        success: false,
        message: `Failed to deploy ${serviceName}: ${error.message}`,
        details: {
          status: 'error',
          error: error.message,
          provider: csp,
          service: serviceName,
        },
      };
    }
  }
}

const deployTool = new DynamicStructuredTool({
  name: 'deploy_service',
  description: 'Initiates the deployment of a cloud service with the provided configuration.',
  schema: z.object({
    serviceName: z.string().describe('The name of the service to deploy'),
    csp: z.string().describe('The cloud service provider (AWS, Azure, GCP, or Oracle)'),
    userId: z.string().describe('The ID of the user initiating the deployment'),
    formData: z.any().describe('The form data containing service configuration parameters'),
    template: z.string().optional().describe('Optional infrastructure as code template'),
  }),
  func: async ({ serviceName, csp, userId, formData, template }) => {
    const deployTool = new DeployTool();
    const result = await deployTool.deployService({
      serviceName,
      csp,
      userId,
      formData,
      template,
    });

    return JSON.stringify({
      response: result.success
        ? `Deployment of ${serviceName} has been initiated successfully.`
        : `Failed to deploy ${serviceName}: ${result.message}`,
      tool_response: {
        status: result.success ? 'success' : 'error',
        message: result.message,
        details: result.details,
      },
    });
  },
});

export default deployTool; 