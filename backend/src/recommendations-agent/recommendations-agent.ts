import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BufferMemory } from 'langchain/memory';
import { AgentError } from '../utils/agent-error';
import { AgentMetrics } from '../utils/agent-metrics';
import recommendationsTool from './tools/recommendations.tool';

// Create a memory instance for the recommendations agent
const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: 'chat_history',
  inputKey: 'input',
  outputKey: 'output',
});

// Create the recommendations agent
const llm = new ChatOllama({
  model: 'llama3.1',
  baseUrl: 'https://codeprism-ai.com',
  format: 'json',
});

const RECOMMENDATIONS_AGENT_PROMPT = `
You are a cloud service recommendations assistant specialized in handling recommendations requests.

IMPORTANT RULES:
1. Your primary task is to understand the user's request and use the appropriate tool to handle it.
2. For any recommendations request:
   - Use recommendations_api_service tool to get recommendations
   - Pass the exact user message and CSP to the tool
   - Do not modify or rephrase the user's request

3. Tool Selection:
   - Always use recommendations_api_service tool
   - Let the tool handle service identification and matching

4. Input Handling:
   - Pass the user's exact message to tools
   - Do not try to extract or modify any information
   - Preserve the exact wording and intent

5. Response Guidelines:
   - Provide a clear, conversational response to the user
   - Include the status of the operation (success, error, or recommendations not found)
   - Include the recommendations
   - Keep responses informative but concise`;

const recommendationsAssistant = createToolCallingAgent({
  llm,
  tools: [recommendationsTool],
  prompt: ChatPromptTemplate.fromMessages([
    ['system', RECOMMENDATIONS_AGENT_PROMPT],
    ['human', '{input}'],
    ['human', 'CSP: {csp}'],
    ['human', 'User ID: {userId}'],
    ['placeholder', '{agent_scratchpad}'],
  ]),
});

const recommendationsAgentExecutor = new AgentExecutor({
  agent: recommendationsAssistant,
  tools: [recommendationsTool],
  maxIterations: 3,
  returnIntermediateSteps: true,
});

async function handleRecommendationsAgent(
  message: string,
  csp: string,
  userId: string,
) {
  console.log('Recommendations agent input:', message, csp, userId);

  try {
    const result = await recommendationsAgentExecutor.invoke({
      input: message,
      csp: csp,
      userId: userId,
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
      console.log('Parsed recommendations response:', parsedToolResponse);
      return parsedToolResponse;
    } catch (error) {
      console.error('Error parsing tool response:', error);
      return {
        response: 'Error processing recommendations',
        tool_response: {
          status: 'error',
          message: 'Failed to parse recommendations response',
          recommendations: [],
        },
      };
    }
  } catch (error) {
    console.error('Error in recommendations agent:', error);
    return {
      response: 'Failed to process the recommendations request',
      tool_response: {
        status: 'error',
        message: error.message,
        recommendations: null,
        detected: null,
      },
    };
  }
}

export default handleRecommendationsAgent;
