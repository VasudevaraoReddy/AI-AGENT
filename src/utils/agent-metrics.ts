export class AgentMetrics {
    private static instance: AgentMetrics;
    private metrics: {
        toolUsage: Map<string, number>;
        executionTimes: Map<string, number[]>;
        errorRates: Map<string, { errors: number; total: number }>;
    };

    private constructor() {
        this.metrics = {
            toolUsage: new Map(),
            executionTimes: new Map(),
            errorRates: new Map(),
        };
    }

    public static getInstance(): AgentMetrics {
        if (!AgentMetrics.instance) {
            AgentMetrics.instance = new AgentMetrics();
        }
        return AgentMetrics.instance;
    }

    recordToolExecution(toolName: string, executionTime: number, success: boolean) {
        // Update tool usage count
        const currentUsage = this.metrics.toolUsage.get(toolName) || 0;
        this.metrics.toolUsage.set(toolName, currentUsage + 1);

        // Update execution times
        const times = this.metrics.executionTimes.get(toolName) || [];
        times.push(executionTime);
        this.metrics.executionTimes.set(toolName, times);

        // Update error rates
        const errorStats = this.metrics.errorRates.get(toolName) || { errors: 0, total: 0 };
        errorStats.total += 1;
        if (!success) {
            errorStats.errors += 1;
        }
        this.metrics.errorRates.set(toolName, errorStats);
    }

    getMetrics() {
        const formattedMetrics = {
            toolUsage: Object.fromEntries(this.metrics.toolUsage),
            averageExecutionTimes: {} as Record<string, number>,
            errorRates: {} as Record<string, number>,
        };

        // Calculate average execution times
        this.metrics.executionTimes.forEach((times, tool) => {
            const average = times.reduce((a, b) => a + b, 0) / times.length;
            formattedMetrics.averageExecutionTimes[tool] = average;
        });

        // Calculate error rates
        this.metrics.errorRates.forEach((stats, tool) => {
            formattedMetrics.errorRates[tool] = stats.errors / stats.total;
        });

        return formattedMetrics;
    }

    resetMetrics() {
        this.metrics = {
            toolUsage: new Map(),
            executionTimes: new Map(),
            errorRates: new Map(),
        };
    }
} 