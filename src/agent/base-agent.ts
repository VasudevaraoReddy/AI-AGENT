
import { ChatOllama } from '@langchain/ollama';
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';

interface CreateAgentOptions {
  tools: any[];
  promptMessages: [string, string][];
  model?: string;
  baseUrl?: string;
  format?: string;
  maxIterations?: number;
}

/**
 * Creates a standardized agent executor and a run function
 */
export function createBaseAgentExecutor({
  tools,
  promptMessages,
  model = 'llama3.1',
  baseUrl = 'https://codeprism-ai.com',
  format = 'json',
  maxIterations = 3,
}: CreateAgentOptions) {
  const llm = new ChatOllama({ model, baseUrl, format });

  const prompt = ChatPromptTemplate.fromMessages(promptMessages);

  const agent = createToolCallingAgent({
    llm,
    tools,
    prompt,
  });

  const executor = new AgentExecutor({
    agent,
    tools,
    maxIterations,
    returnIntermediateSteps: true,
  });

  const runAgent = async (input: Record<string, any>) => {
    try {
      const result = await executor.invoke({
        ...input,
        agent_scratchpad: "",
      });

      const output = result.output;
      console.log('Agent output:', output);
      if (typeof output === 'string') {
        try {
          return JSON.parse(output);
        } catch {
          return {
            response: output,
            tool_response: {
              status: 'success',
              message: 'Processed, but not JSON',
              service: null,
            },
          };
        }
      }

      return output;
    } catch (err: any) {
      console.error('Agent execution failed:', err);
      return {
        response: 'Agent execution failed',
        tool_response: {
          status: 'error',
          message: err.message,
          service: null,
        },
      };
    }
  };

  return {
    runAgent,
    executor, // Optional: expose the raw executor if needed
  };
}
