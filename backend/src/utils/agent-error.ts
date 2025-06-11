export class AgentError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly toolName?: string,
        public readonly recoverable: boolean = true,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'AgentError';
    }

    static fromError(error: Error, toolName?: string): AgentError {
        return new AgentError(
            error.message,
            'UNKNOWN_ERROR',
            toolName,
            true,
            { originalError: error }
        );
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            toolName: this.toolName,
            recoverable: this.recoverable,
            details: this.details,
        };
    }
} 