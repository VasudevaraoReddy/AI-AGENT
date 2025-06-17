import { DynamicStructuredTool, tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentError } from '../../utils/agent-error';
import axios from 'axios';


const llm = new ChatOllama({
  model: process.env.MODEL_NAME,
  baseUrl: process.env.MODEL_BASE_URL,
  format: 'json',
});

// Helper function to determine the impacted field from user query
async function getImpactedField(query: string): Promise<string> {
  const llmResponse = await llm.invoke([
    new SystemMessage(
      `You are a helpful assistant that extracts the Azure service type from a user query.
        
        RULES:
        - Extract ONLY the service type or technology mentioned in the query
        - Return NULL if no service type is found
        - Return the response in lowercase
        - Return ONLY a JSON object in this format: {"service": "extracted_term"}
        
        Examples:
        "I need to see the recommendations for my SQL Server" -> {"service": "sql server"}
        "How can I improve my storage performance?" -> {"service": "storage"}
        "What's the best way to secure my database?" -> {"service": "database"}
        "I want to see the vm recommendations" -> {"service": "vm"}
        `,
    ),
    new HumanMessage(query),
  ]);

  const responseContent = String(llmResponse.content).trim();
  let parsedResponse = JSON.parse(responseContent);
  const extractedTerm = parsedResponse.service?.toLowerCase() || 'null';

  return extractedTerm;
}

const recommendationsTool = tool(
  async ({ message, csp }) => {
    try {
      console.log('In recommendations tool:', { message });

      // Determine the impacted field from the query
      const impactedField = await getImpactedField(message);
      console.log('Impacted field:', impactedField);

      // Call the recommendations API
      try {
        const response = await axios.get(
          `http://localhost:3001/recommendations/fields?impactedField=${impactedField}`,
        );
        const apiRecommendations = response.data;

        const formattedResponse = {
          response: '',
          tool_response: {
            status: '',
            message: '',
            recommendations: apiRecommendations.recommendations || [],
            uniqueImpactedFields: apiRecommendations.uniqueImpactedFields || [],
            detected: {
              service: impactedField,
              csp: csp,
            },
          },
        };

        if (apiRecommendations.recommendations.length === 0) {
          formattedResponse.response = `No recommendations found for your ${impactedField}. Here are the available impacted fields: ${apiRecommendations.uniqueImpactedFields}`;
          formattedResponse.tool_response.status = 'no_recommendations';
          formattedResponse.tool_response.message = `No recommendations found for your ${impactedField}`;
          return JSON.stringify(formattedResponse);
        } else {
          formattedResponse.response = `Here are the recommendations for your ${impactedField}`;
          formattedResponse.tool_response.status = 'success';
          formattedResponse.tool_response.message = `Successfully retrieved recommendations for ${impactedField}`;
          return JSON.stringify(formattedResponse);
        }
      } catch (apiError) {
        console.error('Failed to fetch recommendations from API:', apiError);
        const errorResponse = {
          response: 'Failed to fetch recommendations',
          tool_response: {
            status: 'error',
            message: apiError.message,
            recommendations: [],
            detected: {
              service: impactedField,
              csp: csp,
            },
          },
        };
        return JSON.stringify(errorResponse);
      }
    } catch (error) {
      const agentError =
        error instanceof AgentError
          ? error
          : AgentError.fromError(error, 'recommendations_tool');

      console.error('Error in recommendations tool:', agentError);
      return JSON.stringify({
        response: 'Error fetching recommendations',
        details: {
          category: 'error',
          recommendations: [],
        },
        apiResponse: {
          uniqueImpactedFields: [],
          recommendations: [],
          error: agentError.toJSON(),
        },
      });
    }
  },
  {
    name: 'recommendations_api_service',
    description: `Get Azure Advisor recommendations for cloud services based on user requirements.`,
    schema: z.object({
      message: z
        .string()
        .describe('The exact user query for cloud service recommendations'),
      csp: z
        .string()
        .describe('The cloud service provider (AWS, Azure, GCP, Oracle)'),
    }),
  },
);

export default recommendationsTool;
