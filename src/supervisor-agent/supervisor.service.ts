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

export class SupervisorAgentService {
  private static instance: SupervisorAgentService;
  private readonly memory: BufferMemory;
  private readonly toolRegistry: ToolRegistry;
  private readonly metrics: AgentMetrics;
  private readonly conversationManager: ConversationManager;

  private constructor() {
    this.toolRegistry = ToolRegistry.getInstance();
    this.metrics = AgentMetrics.getInstance();
    this.conversationManager = ConversationManager.getInstance();
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

  private async detectCSP(llm: any, message: string): Promise<string | null> {
    try {
      const cspResult = await llm.invoke([
        new SystemMessage(`
  You are a cloud provider detector. Extract the cloud provider mentioned in the message.

    RULES:
    - Return one of AWS, AZURE, GCP, or NULL
    - Return NULL if no provider or multiple providers are clearly mentioned
    - Return only the provider name, uppercase, no quotes or extra text
    - If you are not sure about the provider, return NULL

    Examples:
    "Deploy in Azure" -> AZURE
    "Create an instance in AWS" -> AWS
    "Setup a VM on GCP" -> GCP
    "Create a VM" -> NULL
    "Deploy on AWS and Azure" -> NULL
    "I want a VM" -> NULL
  `),
        new HumanMessage(message),
      ]);

      const raw = String(cspResult?.content || '')
        .replace(/[`"'\\\n]/g, '') // remove noise
        .trim()
        .toUpperCase();

      const normalized = raw.split(/\s+/)[0]; // handle if LLM returns "AZURE Cloud" etc.

      return ['AWS', 'AZURE', 'GCP'].includes(normalized) ? normalized : null;
    } catch (error) {
      console.error('Error detecting CSP:', error);
      return null;
    }
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
        model: 'llama3.1',
        baseUrl: 'https://codeprism-ai.com',
      });

      // Get tool-specific prompt
      const systemPrompt = this.getToolSpecificPrompt(executedTool);

      const toolResponseStr = JSON.stringify(toolObservation, null, 2);

      const result = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(
          `Please analyze this response and generate an informative summary:\n${toolResponseStr}`,
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
6. Start directly with the key points`;

    switch (executedTool) {
      case 'recommendations_agent_tool':
        return `You are analyzing cloud infrastructure recommendations.

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

Format: Return only the response text, no JSON or special formatting.`;

      case 'provision_agent_tool':
        return `You are analyzing cloud resource provisioning results.

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

Format: Return only the response text, no JSON or special formatting.`;

      default:
        return `You are a cloud infrastructure supervisor that analyzes and summarizes tool responses.

${baseRules}

Additional Rules:
1. Include relevant numbers and statistics when available
2. Generate summary in points format
3. Focus on key outcomes and important details

Format: Return only the response text, no JSON or special formatting.`;
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
    extraPayload?: Record<string, any>
  ) {
    const startTime = Date.now();
    let success = false;

    try {
      const cleanLlm = new ChatOllama({
        model: 'llama3.1',
        baseUrl: 'https://codeprism-ai.com',
      });

      // Detect CSP from message
      const detectedCsp = await this.detectCSP(cleanLlm, message);
      console.log('Detected CSP:', detectedCsp);
      const effectiveCsp =
        providedCsp?.toUpperCase() || detectedCsp || 'general';

      //Enforce CSP mismatch check here (before invoking agent)
      if (
        providedCsp &&
        detectedCsp &&
        providedCsp.toUpperCase() !== detectedCsp
      ) {
        const errorMessage = `The requested CSP "${detectedCsp}" does not match the provided CSP "${providedCsp.toUpperCase()}". Unable to process the request.`;

        // Save this message to context and conversation log
        await this.saveContext(message, errorMessage, providedCsp, userId);
        await this.storeConversation(
          userId || 'anonymous',
          message,
          errorMessage,
          'none',
          { response: errorMessage },
          providedCsp.toUpperCase(),
          providedCsp,
        );

        return {
          response: errorMessage,
          delegated_to: 'none',
          tool_result: null,
          metadata: {
            csp: providedCsp.toUpperCase(),
            detected_csp: detectedCsp,
            original_csp: providedCsp,
            userId,
          },
        };
      }

      // Initialize LLM
      const llm = new ChatOllama({
        model: 'llama3.1',
        baseUrl: 'https://codeprism-ai.com',
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
        payload: extraPayload || {},
        chat_history: chatHistory.chat_history || [],
        agent_scratchpad: '',
        metadata: {
          original_csp: providedCsp,
          detected_csp: detectedCsp,
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
        executedTool,
        toolObservation,
        effectiveCsp,
        providedCsp,
      );

      return {
        response: outputResponse,
        supervisorResponse: supervisorResponse,
        delegated_to: executedTool,
        tool_result: toolObservation.tool_response || toolObservation,
        metadata: {
          csp: effectiveCsp,
          detected_csp: detectedCsp || undefined,
          original_csp: providedCsp,
          userId,
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
    executedTool: string,
    toolObservation: any,
    effectiveCsp: string,
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
          tool_result: toolObservation.tool_response || toolObservation,
          metadata: {
            csp: effectiveCsp,
            original_csp: originalCsp,
            userId,
          },
        },
        effectiveCsp,
      );
      console.log('Conversation stored successfully');
    } catch (error) {
      console.error('Failed to store conversation:', error);
      // Non-critical error, don't throw
    }
  }
}
