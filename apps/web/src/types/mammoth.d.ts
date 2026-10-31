declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }
  export const images: any;
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }, options?: any): Promise<MammothResult>;
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }, options?: any): Promise<MammothResult>;
}
