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
  - Only return one of: AWS, AZURE, GCP
  - Return NULL if no provider is clearly mentioned
  - Return only the provider name, in uppercase, with no quotes or extra text
  
  Examples:
  "Deploy in Azure" -> AZURE  
  "Create an instance in AWS" -> AWS  
  "Setup a VM on GCP" -> GCP  
  "Create a VM" -> NULL
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

  public async processQuery(
    message: string,
    userId?: string,
    providedCsp?: string,
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
      const effectiveCsp =
        providedCsp?.toUpperCase() || detectedCsp || 'general';

      // ❌ Enforce CSP mismatch check here (before invoking agent)
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
            `User Query: {input}\nCloud Provider: {csp}\nUser ID: {userId}`,
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

      // Process the query
      const result = await agentExecutor.invoke({
        input: message,
        csp: effectiveCsp,
        userId: userId || 'anonymous',
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
      );

      success = true;

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

  private parseToolObservation(observation: any): any {
    try {
      return typeof observation === 'string'
        ? JSON.parse(observation)
        : observation;
    } catch (error) {
      console.error('Error parsing tool observation:', error);
      return {
        response: observation,
        tool_response: {
          status: 'success',
          message: 'Processed successfully but response was not in JSON format',
          service: null,
        },
      };
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
