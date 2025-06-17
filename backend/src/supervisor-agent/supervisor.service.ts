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
        toolObservation,
      );

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
          1. Keep the tone professional but conversational
          2. Be specific about the results
          3. If there are issues or errors, explain them clearly
          4. Do not include any words like "Here is the tool response" in your summary
          5. Do not include phrases like "Here's a summary" or "Tool response shows"
          6. Start directly with the key points
          7. Never describe the JSON structure. Only summarize real content.
          8. Do not include any words like "Here is the tool response" in your summary.
          9. Loop over the recommendations and summarize them in a concise manner.
          `;

    switch (executedTool) {
      case 'recommendations_agent_tool':
        return `
        You are analyzing cloud infrastructure recommendations.

        Your task is to summarize real security or performance recommendations extracted from a cloud provider scan.


        ${baseRules}

        For Recommendations:
        1. Start with the total number of recommendations found
        2. Group recommendations by:
          - Category (Security, Performance, Cost, etc.)
          - Impact level (High, Medium, Low)
        3. For each recommendation, highlight:
          - The specific issue
          - The affected resource
          - The suggested solution
                4. If no recommendations found:
                  - Clearly state no recommendations for the specific service
                  - List the services that were analyzed
                5. Always use the exact service name from detected.service
                6. Format in bullet points for easy reading
        4. Never describe the JSON structure. Only summarize real content.
        5. Do not include any words like "Here is the tool response" in your summary.

        recommendations: {toolObservation}
        Format: Return only the response text, no JSON or special formatting.`;

      case 'provision_agent_tool':
        return `
        You are analyzing cloud resource provisioning results.

        ${baseRules}

        For Provisioning:
        1. Start with the provisioning status (success/failure)
        2. Include:
          - Resource type and name
          - Configuration details
          - Any important settings or parameters
        3. For successful provisions:
          - List the key configurations applied
          - Any next steps or recommendations
        4. For failures:
          - Clear explanation of what went wrong
          - Suggested remediation steps
        5. Format in bullet points for easy reading

        Format: Return only the response text, no JSON or special formatting.
        `;

      default:
        return `
        You are a cloud infrastructure supervisor that analyzes and summarizes tool responses.

        ${baseRules}

        Additional Rules:
        1. Include relevant numbers and statistics when available
        2. Generate summary in points format
        3. Focus on key outcomes and important details

        Format: Return only the response text, no JSON or special formatting.
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

      // Handle the result
      const executedTool =
        result.intermediateSteps?.[0]?.action?.tool || 'unknown';
      let toolObservation = this.parseToolObservation(
        result.intermediateSteps[0].observation,
        message, // Pass the user message to help with service detection
      );

      success = true;

      // Generate supervisor response using LLM
      const supervisorResponse = await this.generateSupervisorResponse(
        toolObservation,
        executedTool,
      );

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
