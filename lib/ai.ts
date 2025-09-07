import { GoogleGenAI } from '@google/genai';

type ImagePart = { mime: string; bytes?: Buffer; url?: string };

export async function generateTryOn(args: {
  selfie: ImagePart;
  reference: ImagePart;
  prompt: string;
  apiKeyOverride?: string | null;
}): Promise<{ imageBase64: string; modelId: string }> {
  const apiKey = (args.apiKeyOverride && args.apiKeyOverride.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  const modelId = process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash-image-preview';

  const ai = new GoogleGenAI({ apiKey });

  // Build input parts like the imagegen example: two images + prompt text.
  const selfiePart = args.selfie.bytes
    ? { inlineData: { mimeType: args.selfie.mime, data: args.selfie.bytes.toString('base64') } }
    : { fileData: { mimeType: args.selfie.mime, fileUri: args.selfie.url! } };
  const refPart = args.reference.bytes
    ? { inlineData: { mimeType: args.reference.mime, data: args.reference.bytes.toString('base64') } }
    : { fileData: { mimeType: args.reference.mime, fileUri: args.reference.url! } };

  const contents = [
    {
      role: 'user',
      parts: [ refPart as any, selfiePart as any, { text: args.prompt }],
    },
  ];

  // Match example config: request a single PNG image response.
  const config = {
    responseModalities: ['IMAGE' as const],
    generationConfig: {
      responseMimeType: 'image/png',
    },
  };

  // Use non-streaming call for reliability; extract inline image data.
  const res: any = await ai.models.generateContent({ model: modelId, contents, config });

  // Different SDK builds can surface results on res.output or res.candidates.
  const candidates = (res?.candidates ?? res?.output ?? []) as any[];
  const firstCandidate = candidates[0] || res?.response?.candidates?.[0];
  const parts = firstCandidate?.content?.parts || firstCandidate?.content || [];
  const imagePart = (parts as any[]).find((p) => p?.inlineData?.data);
  const imageBase64: string | undefined = imagePart?.inlineData?.data;

  if (!imageBase64) throw new Error('No image produced by model');
  return { imageBase64, modelId };
}
