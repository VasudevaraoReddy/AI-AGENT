import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import serviceConfigTool from './tools/serciveConfig.tool';
import deployTool from './tools/deploy.tool';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PayloadHandler, StandardPayload } from '../utils/payload-handler';
import * as dotenv from 'dotenv'

dotenv.config()

// Create a type for the standardized input
interface StandardizedInput {
  message: string;
  csp: string;
  userId: string;
  payload?: any;
}

const PROVISION_AGENT_PROMPT = `
You are a cloud infrastructure provisioning assistant, specialized in handling deployment and provisioning requests.

=== OBJECTIVE ===
Understand the user's request and invoke the appropriate tool without rephrasing or modifying the input.

=== TOOL USAGE RULES ===
1. Use the **get_service_config** tool for:
   - All initial service configuration lookups
   - When no payload is provided
   - When user asks about service information
   - When payload is empty or undefined
2. Use the **deploy_service** tool ONLY when:
   - A payload is explicitly provided in the input
   - The payload contains actual configuration values
   - The payload is not empty or undefined
   - NEVER use deploy_service if payload is undefined, empty, or missing

=== INPUT HANDLING ===
- Always pass the **exact user message** and **CSP** to the tool
- Pass **payload** only when it's explicitly provided and not empty
- Do not extract, modify, or interpret any part of the user's message
- Let the tool handle all service identification and matching logic

=== TOOL SELECTION LOGIC ===
- ALWAYS use **get_service_config** when:
  * payload is not provided
  * payload is empty
  * payload is undefined
  * user is asking for information
- Use **deploy_service** ONLY when:
  * payload is explicitly provided
  * payload contains actual configuration values
  * payload is not empty
- For any deployment requests without payload, use get_service_config to return available configuration

=== RESPONSE GUIDELINES ===
- Respond in a clear and conversational tone
- Always include:
  - The status of the operation (e.g., success, error, service not found)
  - Relevant service configuration details if available
- If user asks to deploy without payload, respond with service configuration and request for deployment values
- Keep responses concise but informative
`;

// Create the provision agent
const llm = new ChatOllama({
  model: process.env.MODEL_NAME,
  baseUrl: process.env.MODEL_BASE_URL,
  format: 'json',
});

interface InvokeParams {
  input: string;
  csp: string;
  userId: string;
  agent_scratchpad: string;
  payload?: any;
}

// Wrapper function to handle the provision agent execution
async function handleProvisionAgent(input: StandardizedInput) {
  console.log('Provision agent input:', input);

  try {
    const payloadHandler = PayloadHandler.getInstance();
    let hasValidPayload = false;

    try {
      if (input.payload) {
        // Try to standardize the payload
        const standardizedPayload = payloadHandler.standardizePayload(
          input.payload,
        );
        hasValidPayload = Boolean(
          standardizedPayload &&
            standardizedPayload.template &&
            standardizedPayload.formData &&
            Object.keys(standardizedPayload.formData).length > 0,
        );
      }
    } catch (error) {
      console.error('Error validating payload:', error);
      hasValidPayload = false;
    }

    const tools = hasValidPayload ? [deployTool] : [serviceConfigTool];

    const provisionAssistant = createToolCallingAgent({
      llm,
      tools: tools,
      prompt: ChatPromptTemplate.fromMessages([
        ['system', PROVISION_AGENT_PROMPT],
        ['human', '{input}'],
        ['human', 'CSP: {csp}'],
        ['human', 'User ID: {userId}'],
        ['human', 'Payload: {payload}'],
        ['placeholder', '{agent_scratchpad}'],
      ]),
    });

    // Create the base parameters
    const invokeParams: InvokeParams = {
      input: input.message,
      csp: input.csp,
      userId: input.userId,
      agent_scratchpad: '',
      payload: input.payload
        ? typeof input.payload === 'string'
          ? input.payload
          : JSON.stringify(input.payload)
        : 'No payload provided',
    };

    // Create agent executor with appropriate tools based on payload
    const executor = new AgentExecutor({
      agent: provisionAssistant,
      tools: tools,
      maxIterations: 3,
      returnIntermediateSteps: true,
    });

    // Format the message properly
    const formattedMessage = `${input.message}\nCloud Provider: ${input.csp}\nUser ID: ${input.userId}`;
    const result = await executor.invoke({
      ...invokeParams,
      input: formattedMessage,
    });

    // Extract the tool response from intermediateSteps if available
    const toolResponse = result.intermediateSteps?.[0]?.observation;

    // Parse the tool response if it's a string
    let parsedToolResponse;
    try {
      parsedToolResponse =
        typeof toolResponse === 'string'
          ? JSON.parse(toolResponse)
          : toolResponse;
    } catch (error) {
      console.error('Error parsing tool response:', error);
      parsedToolResponse = {
        response: toolResponse,
        tool_response: {
          status: 'success',
          message: 'Processed successfully',
          service: null,
        },
      };
    }

    // Ensure the response follows the expected format
    return {
      response: parsedToolResponse.response || result.output,
      tool_response: parsedToolResponse.tool_response || {
        status: 'success',
        message: 'Request processed successfully',
        service: null,
      },
    };
  } catch (error) {
    console.error('Error in provision agent:', error);
    return {
      response: 'Failed to process the provision request',
      tool_response: {
        status: 'error',
        message: error.message,
        service: null,
        deployment: null,
      },
    };
  }
}

export default handleProvisionAgent;
