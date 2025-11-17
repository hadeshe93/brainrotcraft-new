import { parse } from 'partial-json';

export function parseJSON(content: string): Record<string, any> | any[] | null {
  const functions = [parseJSONByPartial, parseJSONByClearingCodeBlocks];
  for (const func of functions) {
    const result = func(content);
    if (result) {
      return result;
    }
  }
  return null;
}

function parseJSONByPartial(content: string): Record<string, any> | any[] | null {
  try {
    return parse(content);
  } catch (error) {
    console.error('Failed to parse JSON by partial:', content);
  }
  return null;
}

function parseJSONByClearingCodeBlocks(content: string): Record<string, string> | any[] | null {
  try {
    // Remove markdown code blocks if present
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleanContent);

    // Validate that it's an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Invalid JSON structure');
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse JSON by clearing code blocks:', content);
  }
  return null;
}
