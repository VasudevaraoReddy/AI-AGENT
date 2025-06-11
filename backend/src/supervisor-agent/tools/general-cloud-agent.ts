import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentError } from '../../utils/agent-error';
import { AgentMetrics } from '../../utils/agent-metrics';
import { BufferMemory } from 'langchain/memory';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

// === System prompt ===
const GENERAL_CLOUD_SYSTEM_PROMPT = `
You are a knowledgeable cloud computing assistant specialized in answering ONLY cloud-related questions.

EXPERTISE AREAS:
1. Cloud Computing Concepts:
   - Cloud service models (IaaS, PaaS, SaaS)
   - Cloud deployment models (Public, Private, Hybrid)
   - Cloud architecture and design patterns

2. Cloud Providers:
   - AWS, Azure, GCP, Oracle Cloud
   - Their common services and features
   - Service comparisons and best practices

3. Cloud Technologies:
   - Containerization and orchestration
   - Serverless computing
   - Microservices architecture
   - Cloud storage solutions
   - Cloud networking

4. Cloud Best Practices:
   - Security and compliance
   - Cost optimization
   - Performance optimization
   - High availability and disaster recovery
   - Cloud migration strategies

STRICT SCOPE ENFORCEMENT:
- You MUST ONLY answer questions related to cloud computing
- For ANY non-cloud topics, respond with: {{ "error": "I am a cloud computing specialist. I can only assist with questions about cloud computing, cloud providers, and cloud technologies. Please ask me about cloud-related topics." }}
- DO NOT provide any information about non-cloud topics
- IMMEDIATELY identify and reject non-cloud queries

RESPONSE FORMAT:
For valid cloud queries, ALWAYS return a JSON object with this structure:
{{
  "response": "Your detailed, informative response to the cloud-related query",
  "details": {{
    "topic": "The specific cloud topic being addressed (e.g., 'security', 'architecture', 'comparison')",
    "providers": ["Relevant cloud providers if applicable"],
    "references": ["Any relevant best practices or documentation references"],
    "recommendations": ["Specific recommendations if applicable"]
  }}
}}

IMPORTANT RULES:
1. STRICTLY enforce the cloud-only scope
2. For non-cloud queries, return ONLY the error message
3. For cloud queries:
   - Provide accurate, up-to-date information
   - Include specific examples when relevant
   - Reference cloud provider documentation
   - Explain concepts clearly and professionally
`;

// === Memory instance ===
const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: 'chat_history',
  inputKey: 'input',
  outputKey: 'output',
});

// === LLM ===
const llm = new ChatOllama({
  model: 'llama3.1',
  baseUrl: 'https://codeprism-ai.com',
  format: 'json',
});

// === Agent and executor ===
const generalCloudAssistant = createToolCallingAgent({
  llm,
  tools: [],
  prompt: ChatPromptTemplate.fromMessages([
    ['system', GENERAL_CLOUD_SYSTEM_PROMPT],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]),
});

const generalCloudExecutor = new AgentExecutor({
  agent: generalCloudAssistant,
  tools: [],
  maxIterations: 1,
  memory: memory,
});

// === Main Tool ===
const generalCloudAgentTool = new DynamicStructuredTool({
  name: 'general_cloud_agent_tool',
  description:
    'Use this tool for general cloud computing questions and information.',
  schema: z.object({
    message: z.string().describe('The user query about cloud computing'),
    csp: z
      .string()
      .transform((val) => val || 'general')
      .pipe(
        z
          .string()
          .refine(
            (val) =>
              ['aws', 'azure', 'gcp', 'oracle', 'general'].includes(
                val.toLowerCase(),
              ),
            {
              message:
                'CSP must be one of: AWS, Azure, GCP, Oracle, or empty for general queries',
            },
          ),
      )
      .describe('Cloud Service Provider (AWS, Azure, GCP, Oracle)'),
    userId: z
      .string()
      .transform((val) => val || 'anonymous')
      .describe('User ID for the request'),
  }),
  func: async ({ message, userId, csp }) => {
    const startTime = Date.now();
    const metrics = AgentMetrics.getInstance();
    let success = false;

    try {
      console.log('General cloud agent tool input:', { message, userId, csp });

      // === Greeting detection ===
      const trimmed = message.trim().toLowerCase();
      const isGreeting =
        /^(hi|hello|hey|good (morning|afternoon|evening)|can you help|what do you do)/i.test(
          trimmed,
        );

      if (isGreeting) {
        const hour = new Date().getHours();
        const greeting =
          hour < 12
            ? 'Good morning'
            : hour < 18
              ? 'Good afternoon'
              : 'Good evening';

        success = true;
        return JSON.stringify({
          response: `${greeting}! I’m your cloud computing assistant. I specialize in cloud topics like AWS, Azure, GCP, architecture, storage, and best practices. How can I help you today?`,
          tool_response: {
            status: 'introduction',
            details: {
              topic: 'introduction',
              csp,
              userId,
              suggestions: [
                'Ask about cloud services like virtual machines, storage, or networking',
                'Ask for comparisons between AWS, Azure, and GCP',
                'Ask about cloud cost optimization or migration strategies',
              ],
            },
          },
        });
      }

      // === Normal cloud query ===
      const chatHistory = await memory.loadMemoryVariables({});

      const result = await generalCloudExecutor.invoke({
        input: message,
        chat_history: chatHistory.chat_history || [],
        metadata: { userId, csp },
      });

      console.log('General cloud agent response:', result);

      let parsedOutput;
      try {
        parsedOutput =
          typeof result.output === 'string'
            ? JSON.parse(result.output)
            : result.output;
      } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        throw new AgentError(
          'Failed to parse LLM response',
          'INVALID_RESPONSE_FORMAT',
          'general_cloud_agent_tool',
          true,
        );
      }

      if (
        parsedOutput.error ||
        parsedOutput.details?.topic === 'out_of_scope'
      ) {
        success = true;
        return JSON.stringify({
          response:
            parsedOutput.error ||
            'I am a cloud computing specialist. Please ask me about cloud computing, cloud providers, or cloud technologies.',
          tool_response: {
            status: 'out_of_scope',
            message: 'Query is not related to cloud computing',
            details: {
              topic: 'non_cloud',
              csp,
              userId,
              suggestions: [
                'Ask about cloud services like EC2, Azure VMs, GCP storage',
                'Ask about cloud security, performance, or migration',
                'Ask for cloud provider comparisons or best practices',
              ],
            },
          },
        });
      }

      success = true;

      await memory.saveContext(
        {
          input: message,
          metadata: { userId, csp },
        },
        { output: parsedOutput.response },
      );

      return JSON.stringify({
        response: parsedOutput.response,
        tool_response: {
          status: 'success',
          details: {
            ...parsedOutput.details,
            csp,
            userId,
          },
          references: parsedOutput.references || [],
        },
      });
    } catch (error) {
      const agentError =
        error instanceof AgentError
          ? error
          : AgentError.fromError(error, 'general_cloud_agent_tool');

      console.error('Error in general cloud agent tool:', agentError);
      return JSON.stringify({
        response: 'Failed to process the general cloud request',
        tool_response: {
          status: 'error',
          message: agentError.message,
          details: {
            error: agentError.message,
            csp,
            userId,
          },
        },
      });
    } finally {
      const executionTime = Date.now() - startTime;
      metrics.recordToolExecution(
        'general_cloud_agent_tool',
        executionTime,
        success,
      );
    }
  },
});

export { generalCloudAgentTool };
