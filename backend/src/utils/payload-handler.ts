import { z } from 'zod';

// Define the standard payload structure
export const StandardPayloadSchema = z.object({
  template: z.string(),
  formData: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
});

export type StandardPayload = z.infer<typeof StandardPayloadSchema>;

export class PayloadHandler {
  private static instance: PayloadHandler;

  private constructor() {}

  public static getInstance(): PayloadHandler {
    if (!PayloadHandler.instance) {
      PayloadHandler.instance = new PayloadHandler();
    }
    return PayloadHandler.instance;
  }

  public standardizePayload(payload: any): StandardPayload | undefined {
    try {
      // If payload is a string, try to parse it
      if (typeof payload === 'string') {
        payload = this.parseJsonString(payload);
      }

      // If payload is null, undefined, or not an object, return undefined
      if (!payload || typeof payload !== 'object') {
        console.warn(
          'Empty or invalid payload received. Skipping standardization.',
        );
        return undefined;
      }

      // If essential fields are missing, return undefined instead of throwing
      if (!payload.template || !payload.formData) {
        console.warn(
          'Missing required fields (template, formData). Skipping standardization.',
        );
        return undefined;
      }

      // Validate and transform the payload
      const validatedPayload = StandardPayloadSchema.parse(payload);

      return {
        template: validatedPayload.template,
        formData: validatedPayload.formData,
        metadata: validatedPayload.metadata || {},
      };
    } catch (error) {
      console.error('Error standardizing payload:', error);
      throw new Error('Invalid payload format');
    }
  }

  private parseJsonString(jsonString: string): any {
    try {
      // Clean the string
      const cleanedString = this.cleanJsonString(jsonString);
      return JSON.parse(cleanedString);
    } catch (error) {
      console.error('Error parsing JSON string:', error);
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Cleans a JSON string by fixing common issues
   * @param jsonString The JSON string to clean
   * @returns The cleaned JSON string
   */
  private cleanJsonString(jsonString: string): string {
    return jsonString
      .replace(/\\"/g, '"') // Replace escaped quotes
      .replace(/^"|"$/g, '') // Remove surrounding quotes
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/([{[])\s*,/g, '$1') // Remove leading commas
      .replace(/,+/g, ',') // Replace multiple commas with single comma
      .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
      .replace(/,\s*]/g, ']') // Remove trailing commas before closing brackets
      .replace(/([{[])\s*([a-zA-Z0-9_]+)\s*:/g, '"$2":') // Add quotes to property names
      .replace(/:\s*'([^']*)'/g, ':"$1"') // Replace single quotes with double quotes
      .trim();
  }

  /**
   * Converts a payload to a string format
   * @param payload The payload to stringify
   * @returns The stringified payload
   */
  public stringifyPayload(payload: any): string {
    try {
      const standardizedPayload = this.standardizePayload(payload);
      return JSON.stringify(standardizedPayload, null, 2);
    } catch (error) {
      console.error('Error stringifying payload:', error);
      throw new Error('Failed to stringify payload');
    }
  }
}
