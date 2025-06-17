import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BufferMemory } from 'langchain/memory';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentError } from '../utils/agent-error';
import { AgentMetrics } from '../utils/agent-metrics';
import { ConversationManager } from '../utils/conversation-store';
import { ToolRegistry } from '../utils/tool-registry';
import { SUPERVISOR_SYSTEM_PROMPT } from './supervisor.prompt';
import { PayloadHandler, StandardPayload } from '../utils/payload-handler';

export class SupervisorAgentService {
  private static instance: SupervisorAgentService;
  private readonly memory: BufferMemory;
  private readonly toolRegistry: ToolRegistry;
  private readonly metrics: AgentMetrics;
  private readonly conversationManager: ConversationManager;
  private readonly payloadHandler: PayloadHandler;

  private constructor() {
    this.toolRegistry = ToolRegistry.getInstance();
    this.metrics = AgentMetrics.getInstance();
    this.conversationManager = ConversationManager.getInstance();
    this.payloadHandler = PayloadHandler.getInstance();
    this.memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'chat_history',
      inputKey: 'input',
      outputKey: 'output',
    });
  }

  public static getInstance(): SupervisorAgentService {
    if (!SupervisorAgentService.instance) {
      SupervisorAgentService.instance = new SupervisorAgentService();
    }
    return SupervisorAgentService.instance;
  }

  private async generateSupervisorResponse(
    toolObservation: any,
    executedTool: string,
  ): Promise<string> {
    try {
      // Skip LLM processing for general cloud agent responses
      if (executedTool === 'general_cloud_agent_tool') {
        return toolObservation.response;
      }

      const llm = new ChatOllama({
        model: process.env.MODEL_NAME,
        baseUrl: process.env.MODEL_BASE_URL,
      });

      // Get tool-specific prompt
      const systemPrompt = this.getToolSpecificPrompt(executedTool);
      const formattedSystemPrompt = systemPrompt.replace(
        '{toolObservation}',
        JSON.stringify(toolObservation),
      );
      console.log(formattedSystemPrompt);

      const result = await llm.invoke([
        new SystemMessage(formattedSystemPrompt),
        new HumanMessage(
          `Please analyze this response and generate an informative summary`,
        ),
      ]);

      const supervisorResponse = String(result.content || '').trim();

      // Fallback to original response if LLM fails to generate a meaningful one
      if (!supervisorResponse || supervisorResponse.length < 10) {
        console.warn(
          'LLM generated an empty or too short response, using fallback',
        );
        return toolObservation.response || 'Request processed successfully';
      }

      return supervisorResponse;
    } catch (error) {
      console.error('Error generating supervisor response:', error);
      return toolObservation.response || 'Request processed successfully';
    }
  }

  private getToolSpecificPrompt(executedTool: string): string {
    const baseRules = `
RULES:
1. Keep the tone professional and informative.
2. Only summarize what is present in the toolObservation. Do not infer or guess missing details.
3. If information like resource name or configuration is missing, clearly state it as "Not provided".
4. Never assume the use of EC2 or any other specific service unless explicitly mentioned in the toolObservation.
5. Do not describe JSON structure. Only analyze and summarize real content.
6. No phrases like "Here is", "Tool response shows", or "Here's a summary".
7. Output should be clear, factual, and to the point, using bullet points.
8. Start directly with analysis. Do not add introductory or closing statements.
9. If an error or unsupported service is detected, summarize the exact error and message.

Tool Observation: {toolObservation}
`;

    switch (executedTool) {
      case 'recommendations_agent_tool':
        return `
You are analyzing cloud infrastructure recommendations provided by a tool scan.

Your task is to summarize **only the actual recommendations** mentioned in the toolObservation.

${baseRules}

For Recommendations:
1. If no recommendations exist, explicitly state "No recommendations found."
2. If recommendations exist:
   - Start with the total count.
   - Group by category and impact (if available).
   - For each item, extract:
     - Issue
     - Affected service/resource
     - Suggested fix or guidance
   - Always use exact service names from the data.

Format: Return only the response text. No JSON or extra formatting.
`;

      case 'provision_agent_tool':
        return `
You are analyzing a cloud resource provisioning result.

Summarize **only the real information** present in the toolObservation.

${baseRules}

For Provisioning:
1. Start with provisioning status: Success or Failure.
2. If failed, summarize:
   - Reason for failure
   - Suggested remediation (if available)
3. If successful, extract:
   - Resource name/type (if provided)
   - Key configuration details (only if present)
   - Any recommended next steps
4. If any data is missing, state "Not provided".

Format: Use clear bullet points. Only return the response text.
`;

      default:
        return `
You are summarizing the result of a cloud infrastructure tool.

Summarize **only what's explicitly in the toolObservation**.

${baseRules}

For General Summaries:
1. List key facts, stats, or outcomes that are explicitly stated.
2. If the tool failed or returned an error, summarize the exact failure reason.
3. Do not invent or interpret missing values.
4. Use bullet points. Be direct and factual.

Format: Return only the response text.
`;
    }
  }

  private parseToolObservation(observation: any, userMessage: string): any {
    console.log('Observation:', observation);
    try {
      // If observation is a string, try to parse it
      if (typeof observation === 'string') {
        try {
          observation = JSON.parse(observation);
        } catch (e) {
          console.error('Error parsing observation:', e);
          return {
            response: observation,
            tool_response: {
              status: 'success',
              message: 'Processed successfully',
            },
          };
        }
      }

      // If observation is from provision agent
      if (observation.tool_response?.status) {
        return {
          response: observation.response || 'Request processed successfully',
          tool_response: observation.tool_response,
        };
      }

      // Default format for other cases
      return {
        response: observation.response || observation.toString(),
        tool_response: {
          status: 'success',
          message: 'Processed successfully',
          ...observation, // Include any additional data from the observation
        },
      };
    } catch (error) {
      console.error('Error in parseToolObservation:', error);
      return {
        response: 'Error processing the response',
        tool_response: {
          status: 'error',
          message: error.message,
        },
      };
    }
  }

  public async processQuery(
    message: string,
    userId?: string,
    providedCsp?: string,
    chatId?: string,
    extraPayload?: StandardPayload,
  ) {
    const startTime = Date.now();
    let success = false;
    const chatTitle =
      extraPayload?.metadata?.chatTitle ||
      `Chat ${new Date().toLocaleString()}`;

    if (!chatId) {
      throw new Error('chatId is required');
    }

    try {
      const effectiveCsp = providedCsp?.toUpperCase() || 'general';

      // Initialize LLM
      const llm = new ChatOllama({
        model: process.env.MODEL_NAME,
        baseUrl: process.env.MODEL_BASE_URL,
        format: 'json',
      }).bindTools(this.toolRegistry.getAvailableTools());

      // Create agent with tools
      const agent = createToolCallingAgent({
        llm: llm.withConfig({ format: 'json' }),
        tools: this.toolRegistry.getAvailableTools(),
        prompt: ChatPromptTemplate.fromMessages([
          ['system', SUPERVISOR_SYSTEM_PROMPT],
          ['placeholder', '{chat_history}'],
          [
            'human',
            `User Query: {input}\nCloud Provider: {csp}\nUser ID: {userId}\nPayload: {payload}`,
          ],
          ['placeholder', '{agent_scratchpad}'],
        ]),
      });

      const agentExecutor = new AgentExecutor({
        agent,
        tools: this.toolRegistry.getAvailableTools(),
        memory: this.memory,
        maxIterations: 3,
        returnIntermediateSteps: true,
      });

      const chatHistory = await this.memory.loadMemoryVariables({});

      console.log('Extra payload:', extraPayload);
      // Process the query
      const result = await agentExecutor.invoke({
        input: message,
        csp: effectiveCsp,
        userId: userId || 'anonymous',
        payload: extraPayload
          ? this.payloadHandler.stringifyPayload(extraPayload)
          : '{}',
        chat_history: chatHistory.chat_history || [],
        agent_scratchpad: '',
        metadata: {
          original_csp: providedCsp,
          original_userId: userId,
        },
      });

      const firstStep = result.intermediateSteps?.[0];
      const executedTool = firstStep?.action?.tool || 'unknown';
      const toolObservation = this.parseToolObservation(
        firstStep?.observation ?? result.output ?? 'No tool output',
        message,
      );

      success = true;

      // Generate supervisor response using LLM
      // const supervisorResponse = await this.generateSupervisorResponse(
      //   toolObservation,
      //   executedTool,
      // );

      const supervisorResponse = '';

      // Save conversation context
      const outputResponse = toolObservation.response || result.output;
      await this.saveContext(message, outputResponse, effectiveCsp, userId);

      // Store conversation
      await this.storeConversation(
        userId || 'anonymous',
        message,
        outputResponse,
        supervisorResponse,
        executedTool,
        toolObservation,
        effectiveCsp,
        chatId,
        chatTitle,
        providedCsp,
      );

      return {
        response: outputResponse,
        supervisorResponse: supervisorResponse,
        delegated_to: executedTool,
        tool_result: toolObservation.tool_response || toolObservation,
        metadata: {
          csp: effectiveCsp,
          original_csp: providedCsp,
          userId,
          chatId,
          chatTitle,
        },
      };
    } catch (error) {
      console.error('Error in supervisor agent:', error);
      const agentError =
        error instanceof AgentError
          ? error
          : AgentError.fromError(error, 'supervisor_agent');

      success = false;
      throw agentError;
    } finally {
      const executionTime = Date.now() - startTime;
      this.metrics.recordToolExecution(
        'supervisor_agent',
        executionTime,
        success,
      );
    }
  }

  private async saveContext(
    message: string,
    response: string,
    csp: string,
    userId?: string,
  ) {
    await this.memory.saveContext(
      {
        input: message,
        metadata: {
          csp,
          userId,
        },
      },
      { output: response },
    );
  }

  private async storeConversation(
    userId: string,
    message: string,
    response: string,
    supervisorResponse: string,
    executedTool: string,
    toolObservation: any,
    effectiveCsp: string,
    chatId: string,
    chatTitle: string,
    originalCsp?: string,
  ) {
    try {
      console.log('Storing conversation...');
      await this.conversationManager.addMessage(
        userId,
        message,
        {
          response,
          delegated_to: executedTool,
          supervisorResponse,
          tool_result: toolObservation.tool_response || toolObservation,
          metadata: {
            csp: effectiveCsp,
            original_csp: originalCsp,
            userId,
          },
        },
        effectiveCsp,
        chatId,
        chatTitle,
      );
      console.log('Conversation stored successfully');
    } catch (error) {
      console.error('Failed to store conversation:', error);
      // Non-critical error, don't throw
    }
  }
}
