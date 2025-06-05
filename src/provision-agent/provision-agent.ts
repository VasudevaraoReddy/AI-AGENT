import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import provisionTool from './tools/provision.tool';
import deployTool from './tools/deploy.tool';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// Create a type for the standardized input
interface StandardizedInput {
  message: string;
  csp: string;
  userId: string;
}

const PROVISION_AGENT_PROMPT = `You are a cloud infrastructure provisioning assistant specialized in handling deployment and provisioning requests.

IMPORTANT RULES:
1. Your primary task is to understand the user's request and use the appropriate tool to handle it.
2. For any provisioning or deployment request:
   - Use get_service_config tool to find the service configuration
   - Pass the exact user message and CSP to the tool
   - Do not modify or rephrase the user's request

3. Tool Selection:
   - Always use get_service_config for initial service lookup
   - Let the tool handle service identification and matching

4. Input Handling:
   - Pass the user's exact message to tools
   - Do not try to extract or modify any information
   - Preserve the exact wording and intent

5. Response Guidelines:
   - Provide a clear, conversational response to the user
   - Include the status of the operation (success, error, or service not found)
   - Include any relevant service configuration details
   - Keep responses informative but concise`;

// Create the provision agent
const llm = new ChatOllama({
  baseUrl: 'https://codeprism-ai.com',
  model: 'llama3.1',
  format: 'json',
});

const provisionAssistant = createToolCallingAgent({
  llm,
  tools: [provisionTool, deployTool],
  prompt: ChatPromptTemplate.fromMessages([
    ["system", PROVISION_AGENT_PROMPT],
    ["human", "{input}"],
    ["human", "CSP: {csp}"],
    ["human", "User ID: {userId}"],
    ["placeholder", "{agent_scratchpad}"]
  ])
});

const provisionAgentExecutor = new AgentExecutor({
  agent: provisionAssistant,
  tools: [provisionTool, deployTool],
  maxIterations: 3,
  returnIntermediateSteps: true
});

// Wrapper function to handle the provision agent execution
async function handleProvisionAgent(input: StandardizedInput) {
  console.log('Provision agent input:', input);

  try {
    const result = await provisionAgentExecutor.invoke({
      input: input.message,
      csp: input.csp,
      userId: input.userId,
      agent_scratchpad: ""
    });

    // Extract the tool response from intermediateSteps if available
    const toolResponse = result.intermediateSteps?.[0]?.observation;
    
    // Parse the tool response if it's a string
    let parsedToolResponse;
    try {
      parsedToolResponse = typeof toolResponse === 'string' 
        ? JSON.parse(toolResponse)
        : toolResponse;
    } catch (error) {
      console.error('Error parsing tool response:', error);
      parsedToolResponse = {
        response: toolResponse,
        tool_response: {
          status: 'success',
          message: 'Processed successfully',
          service: null
        }
      };
    }

    // Ensure the response follows the expected format
    return {
      response: parsedToolResponse.response || result.output,
      tool_response: parsedToolResponse.tool_response || {
        status: 'success',
        message: 'Request processed successfully',
        service: null
      }
    };
  } catch (error) {
    console.error('Error in provision agent:', error);
    return {
      response: 'Failed to process the provision request',
      tool_response: {
        status: 'error',
        message: error.message,
        service: null,
        deployment: null
      }
    };
  }
}

export default handleProvisionAgent;
