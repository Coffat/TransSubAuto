import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { countCues } from '../utils/vttUtils';

const getFullPrompt = (vttChunk: string, chunkCueCount: number, glossary: string): string => {
  const glossarySection = glossary.trim() ? `
GLOSSARY:
Use these exact translations for the following terms. This is a strict, unbreakable rule.
---
${glossary.trim()}
---
` : '';
  
  return `You are a professional subtitle translator. Your task is to translate the English text in the provided VTT cues into natural, fluent Vietnamese.

UNBREAKABLE RULES:
1.  **PRESERVE TIMESTAMPS & STRUCTURE**: Timestamps (e.g., \`00:01:02.345 --> 00:01:03.456\`), cue numbers, and blank lines MUST be preserved exactly. DO NOT change them.
2.  **PRESERVE TAGS**: All styling and speaker tags (like \`<i>\`, \`<b>\`, \`<v Speaker Name>\`) MUST be copied exactly as they appear.
3.  **1-to-1 CUE MAPPING**: The input chunk below contains exactly ${chunkCueCount} cue blocks. Your response MUST contain the exact same number of translated cue blocks. Do not merge, split, add, or omit any cues.
4.  **OUTPUT-ONLY**: Your entire response MUST ONLY be the translated VTT cues. Do not include any other text, greetings, explanations, apologies, or code markers like \`\`\`vtt.
${glossarySection}
EXAMPLE:
---
INPUT:
1
00:00:01.000 --> 00:00:03.500
This is an <i>example</i> subtitle.

2
00:00:04.100 --> 00:00:06.200
It demonstrates the format.

---
YOUR EXPECTED OUTPUT:
1
00:00:01.000 --> 00:00:03.500
Đây là một phụ đề <i>ví dụ</i>.

2
00:00:04.100 --> 00:00:06.200
Nó minh họa cho định dạng.
---

Now, translate the following VTT chunk following all unbreakable rules:
---
${vttChunk}
`;
};

const getFollowUpPrompt = (vttChunk: string, chunkCueCount: number, glossary: string): string => {
    const glossaryReminder = glossary.trim() ? `Remember to strictly follow the glossary provided earlier. ` : '';
    return `Continue translating this next chunk. It contains ${chunkCueCount} cues. ${glossaryReminder}Remember all unbreakable rules, especially preserving timestamps and ensuring your output has exactly ${chunkCueCount} cues.

Translate now:
---
${vttChunk}
`;
}

export const translateVttWithChat = async (
  chatSession: Chat | undefined,
  vttChunkContent: string,
  apiKey: string,
  glossary: string,
): Promise<{ chat: Chat; stream: AsyncGenerator<GenerateContentResponse> }> => {
  if (!apiKey) {
    throw new Error("API Key is not provided. Please set your API key.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const chunkCueCount = countCues(vttChunkContent);
  const useFullPrompt = !chatSession;

  const prompt = useFullPrompt
    ? getFullPrompt(vttChunkContent, chunkCueCount, glossary) 
    : getFollowUpPrompt(vttChunkContent, chunkCueCount, glossary);

  let activeChat = chatSession;
  if (!activeChat) {
    activeChat = ai.chats.create({ 
      model: 'gemini-2.5-flash',
    });
  }

  try {
    const stream = await activeChat.sendMessageStream({ 
      message: prompt,
    });
    return { chat: activeChat, stream };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Check both the stringified error object and the message property for more robust detection
    const errorString = JSON.stringify(error).toLowerCase();
    const lowerCaseMessage = (error as Error).message.toLowerCase();
    
    let errorMessage = `Failed to call the Gemini API: ${(error as Error).message}`;
    if (lowerCaseMessage.includes('api key not valid')) {
        errorMessage = 'Invalid API Key: The provided API key is not valid. Please check and re-enter it.';
    } else if (errorString.includes('resource_exhausted') || lowerCaseMessage.includes('quota')) {
        errorMessage = 'RESOURCE_EXHAUSTED: Your API key has exceeded its usage quota. Please try again later or check your Google AI Studio dashboard.';
    } else if (lowerCaseMessage.includes('safety')) {
        errorMessage = 'Content Blocked: The request was blocked due to safety settings. Please check the content of your VTT file.';
    }
    
    throw new Error(errorMessage);
  }
};