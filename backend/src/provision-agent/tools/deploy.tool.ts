// src/tools/deploy-tool.ts

import { tool } from '@langchain/core/tools';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { PayloadHandler, StandardPayload } from '../../utils/payload-handler';
import {
  updateJsonInDevOps,
  getTerraformVariables,
} from '../service_calls/AzureDevopsService';

const deployTool = tool(
  async ({ serviceName, payload, csp, userId }) => {
    const payloadHandler = PayloadHandler.getInstance();

    // Handle empty or missing payload
    if (!payload || payload === 'No payload provided') {
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

    let standardizedPayload: StandardPayload | undefined;

    try {
      const payloadObj =
        typeof payload === 'string' ? JSON.parse(payload) : payload;
      standardizedPayload = payloadHandler.standardizePayload(payloadObj);

      if (!standardizedPayload) {
        return JSON.stringify({
          response: `Invalid payload: missing 'template' or 'formData'.`,
          tool_response: {
            status: 'error',
            message: 'Invalid payload format',
            details: {
              status: 'error',
              error: 'Payload must include both "template" and "formData".',
              provider: csp,
              service: serviceName,
            },
          },
        });
      }
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

    const { formData, template } = standardizedPayload;

    if (!formData || Object.keys(formData).length === 0) {
      return JSON.stringify({
        response: `Cannot deploy without configuration data.`,
        tool_response: {
          status: 'error',
          message: 'Empty configuration data',
          details: {
            status: 'error',
            error: 'Form data is required for deployment',
            provider: csp,
            service: serviceName,
          },
        },
      });
    }

    try {
      const deploymentId = uuidv4();
      const tfVariables: any = await getTerraformVariables();
      if (tfVariables?.length > 0) {
        let modifiedData = Object.keys(formData).map((key) => ({
          variableName: key,
          newValue: formData[key],
        }));
        const newUpdatedFormValues = {};

        modifiedData.forEach(({ variableName, newValue }) => {
          const tfVar = tfVariables.find((obj) =>
            Object.prototype.hasOwnProperty.call(obj, variableName),
          );
          if (tfVar) {
            newUpdatedFormValues[tfVar[variableName]] = newValue;
          } else {
            newUpdatedFormValues[variableName] = newValue;
          }
        });

        const response = await updateJsonInDevOps(
          template,
          newUpdatedFormValues,
          userId,
          'AGENT',
          'Destroy',
        );

        return JSON.stringify({
          response: `Platform has initiated infrastructure provisioning for ${serviceName}`,
          tool_response: {
            status: 'success',
            message: `Successfully initiated infrastructure provisioning for ${serviceName}`,
            details: {
              status: 'in_progress',
              provider: csp,
              service: serviceName,
              configuration: {
                originalData: formData,
                modifiedData,
              },
              deploymentId,
              response,
            },
          },
        });
      }
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
    description:
      'Deploy a cloud service using the given configuration. Requires serviceName, csp, userId, and payload with formData.',
    schema: z.object({
      serviceName: z.string().describe('The name of the service to deploy'),
      userId: z.string().describe('The user ID for the deployment'),
      csp: z
        .string()
        .describe('The cloud service provider (AWS, Azure, GCP, or Oracle)'),
      payload: z
        .any()
        .describe('Configuration data for deployment (string or object)'),
    }),
  },
);

export default deployTool;
