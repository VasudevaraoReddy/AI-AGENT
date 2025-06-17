import { DynamicStructuredTool, tool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { ChatOllama } from '@langchain/ollama';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import * as dotenv from 'dotenv'

dotenv.config()

// Create LLM instance for service determination
const llm = new ChatOllama({
  model: process.env.MODEL_NAME,
  baseUrl: process.env.MODEL_BASE_URL,
  format: 'json',
});

async function determineService(message: string): Promise<any> {
  const systemPrompt = `
    You are an AI Assistant that extracts cloud service names and providers from user input.

    TASK:
    Extract the specific cloud service name and provider being requested.

    RETURN FORMAT:
    {
        "service": "",  // The exact service name mentioned
        "provider": ""  // The exact provider mentioned (AWS, AZURE, GCP)
    }

    EXAMPLES:
    "I want to deploy AKS in azure" then return {"service": "AKS", "provider": "AZURE"}
    "I want to deploy Virtual Machine in Azure" then return {"service": "Virtual Machine", "provider": "AZURE"}
    "Create EC2 instance" then return {"service": "EC2", "provider": "AWS"}
    "Deploy Load Balancer in AZURE" then return {"service": "Load Balancer", "provider": "AZURE"}
  
    RULES:
    - Extract EXACT service name as mentioned (AKS, not "Azure Kubernetes Service")
    - Extract and normalize provider name (azure/Azure/AZURE -> AZURE)
    - Return null for service or provider if unclear
    - Don't hallucinate service names and providers
    - Only return valid JSON
    - ALWAYS wrap response in quotes to ensure valid JSON`;

  try {
    const result = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(message),
    ]);

    const content = String(result.content).trim();

    // Handle potential JSON formatting issues
    let parsedContent;
    try {
      // Try parsing the content directly
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      // If direct parsing fails, try cleaning the content
      const cleanedContent = content
        .replace(/```json\n?|\n?```/g, '') // Remove code blocks
        .replace(/^['"]|['"]$/g, '') // Remove surrounding quotes
        .trim();

      try {
        parsedContent = JSON.parse(cleanedContent);
      } catch (secondError) {
        console.error(
          'Failed to parse service determination response:',
          secondError,
        );
        return { service: null, provider: null };
      }
    }

    // Normalize provider name if present
    if (parsedContent.provider) {
      parsedContent.provider = parsedContent.provider.toUpperCase();
    }

    return parsedContent;
  } catch (error) {
    console.error('Error determining service:', error);
    return { service: null, provider: null };
  }
}

async function generateExampleValues(service: any, csp: string): Promise<any> {
  const promptText = `Generate example values and explanations for the following cloud service configuration fields.
    
    Service: ${service.name}
    Cloud Provider: ${csp.toUpperCase()}
    Fields: ${JSON.stringify(service.requiredFields)}
    
    Return JSON only:
    {
      "fields": [
        {
          "fieldId": "string",
          "exampleValue": "string",
          "explanation": "string explaining the example value and best practices"
        }
      ]
    }

    Guidelines:
    - Provide realistic, production-ready example values
    - Follow cloud provider best practices
    - Consider security and naming conventions
    - Values should be valid for the specified field types
    - Include brief explanation of why these values are good examples
    - Keep explanations concise but informative`;

  try {
    console.log(`Generating example values for ${service.title} on ${csp}`);
    const messagePayload = [
      new SystemMessage(promptText),
      new HumanMessage(promptText),
    ];
    const result = await llm.invoke(messagePayload);
    const responseText = String(result.content);
    console.log('Example values generation complete');

    try {
      const cleanedResponse = responseText
        .replace(/```json\n?|\n?```/g, '')
        .trim();
      const parsed = JSON.parse(cleanedResponse);
      return parsed;
    } catch (e) {
      console.error('Error parsing example values:', e);
      // Provide default empty fields if parsing fails
      return {
        fields: service.requiredFields.map((field) => ({
          fieldId: field.fieldId,
          exampleValue: '',
          explanation: 'Please provide a value appropriate for this field.',
        })),
      };
    }
  } catch (e) {
    console.error('Error generating example values:', e);
    // Provide default empty fields on error
    return {
      fields: service.requiredFields.map((field) => ({
        fieldId: field.fieldId,
        exampleValue: '',
        explanation: 'Please provide a value appropriate for this field.',
      })),
    };
  }
}

const serviceConfigTool = tool(
  async ({ csp, message }) => {
    console.log('In provision tool:', { csp, message });
    try {
      // Validate required parameters
      if (!message) {
        return JSON.stringify({
          response:
            'Please provide a message describing what you want to provision.',
          tool_response: {
            status: 'error',
            message: 'Missing required parameter: message',
            service: null,
          },
        });
      }

      // Determine the service and validate CSP
      const serviceInfo = await determineService(message);
      console.log('Service determination result:', serviceInfo);

      // Validate CSP matches
      if (serviceInfo.provider && serviceInfo.provider !== csp.toUpperCase()) {
        return JSON.stringify(
          {
            response: `There seems to be a mismatch in the cloud provider. You mentioned ${serviceInfo.provider} in your request, but the system is configured to use ${csp.toUpperCase()}. Please clarify which cloud provider you want to use.`,
            tool_response: {
              status: 'error',
              message: 'CSP mismatch',
              details: {
                requested_provider: serviceInfo.provider,
                configured_provider: csp.toUpperCase(),
                service: serviceInfo.service,
              },
            },
          },
          null,
          2,
        );
      }

      // Get service configuration with exact service name
      // const serviceConfig = await axios.get(
      //     `http://localhost:3001/services/filter?name=${encodeURIComponent(serviceInfo.service)}&cloud=${csp}`,
      // );

      const allServices = await axios.get(
        'http://10.95.108.11:4000/infra-provision-service/allInfraServices',
      );

      const filteredService = allServices.data?.filter((service: any) => {
        const cloudMatch =
          service?.cloudType.toLowerCase() === csp.toLowerCase();
        console.log('cMatch', cloudMatch);
        const nameMatch = service?.title
          .toLowerCase()
          ?.includes(serviceInfo?.service?.toLowerCase());
        console.log(nameMatch);
        return cloudMatch && nameMatch;
      });

      const serviceConfig = {
        data: [...filteredService],
      };

      console.log('Service configuration:', serviceConfig.data);

      if (!serviceConfig.data || serviceConfig.data.length === 0) {
        const response = {
          response: `The service ${serviceInfo.service} is not currently available for ${csp.toUpperCase()}. This service might be added in a future update. Please check back later or try a different service.`,
          tool_response: {
            status: 'service_not_found',
            message: 'Service not currently available',
            details: {
              requested_service: serviceInfo.service,
              provider: csp.toUpperCase(),
              reason: 'Service not yet supported',
              suggestion: 'This service might be added in a future update',
            },
          },
        };
        return JSON.stringify(response, null, 2);
      }

      // Generate and enhance service configuration
      const exampleValues = await generateExampleValues(
        serviceConfig.data[0],
        csp,
      );
      const enhancedService = {
        ...serviceConfig.data[0],
        requiredFields: serviceConfig.data[0].requiredFields.map((field) => ({
          ...field,
          exampleValue:
            exampleValues.fields.find((ef) => ef.fieldId === field.fieldId)
              ?.exampleValue || '',
          explanation:
            exampleValues.fields.find((ef) => ef.fieldId === field.fieldId)
              ?.explanation || '',
        })),
      };

      const response = {
        response: `I found the configuration for ${serviceInfo.service} on ${csp.toUpperCase()}. Let me help you provision it.`,
        tool_response: {
          status: 'success',
          message: `Found service configuration for ${serviceInfo.service}`,
          service: enhancedService,
          detected: {
            service: serviceInfo.service,
            csp: csp,
          },
        },
      };
      return JSON.stringify(response, null, 2);
    } catch (error) {
      console.error('Error processing provision request:', error);
      const response = {
        response: 'I encountered an error while processing your request.',
        tool_response: {
          status: 'error',
          message: 'Failed to process provision request: ' + error.message,
          service: null,
        },
      };
      return JSON.stringify(response, null, 2);
    }
  },
  {
    name: 'get_service_config',
    description:
      'Use this tool to get cloud service configurations based on user requests.',
    schema: z.object({
      csp: z
        .string()
        .describe('The cloud service provider (AWS, Azure, GCP, or Oracle)'),
      message: z
        .string()
        .describe(
          'The user message describing the service they want to provision',
        ),
    }),
  },
);

export default serviceConfigTool;
