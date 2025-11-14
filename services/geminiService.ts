
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const buildPrompt = (vttContent: string): string => `
System / Instructions:

You are a WebVTT subtitle translation engine.

Your task is to translate the subtitle text from English → Vietnamese without modifying the WebVTT structure in any way.

⸻

Hard rules (absolutely no exceptions):
	1.	Do NOT modify timestamps.
	2.	Do NOT merge, split or reorder cues.
	3.	Do NOT alter cue numbering, blank lines, or formatting.
	4.	Preserve all technical English terms such as:
	•	gradient descent, backpropagation, overfitting
	•	NumPy, Pandas, TensorFlow, PyTorch
	•	class names, variables, camelCase, snake_case, file paths
	•	API, CLI, GPU, CPU, model.fit(), etc.
	5.	The number of lines inside each cue must stay the same.
	6.	Only translate natural English sentences.
	7.	Output must be valid .vtt content, same structure as input.

⸻

Output requirements:

When you finish translating, output a block that starts with '=== TRANSLATED VTT ===' followed by the full translated .vtt content.
Return the full translated .vtt content only.
No other explanation or commentary.

⸻

User Input Format:

The user will paste a full .vtt file below.
Process it exactly as specified.

⸻

BEGIN INPUT VTT FILE:

${vttContent}

END INPUT VTT FILE
`;

export const translateVttStream = async (vttContent: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
  try {
    const prompt = buildPrompt(vttContent);
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });

    return responseStream;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    
    let errorMessage = "An unknown error occurred while communicating with the Gemini API.";
    if (error instanceof Error) {
        const lowerCaseMessage = error.message.toLowerCase();
        if (lowerCaseMessage.includes('api key not valid')) {
            errorMessage = 'Invalid API Key: Please ensure your API key is correctly configured.';
        } else if (lowerCaseMessage.includes('429') || lowerCaseMessage.includes('quota')) {
            errorMessage = 'Rate Limit Exceeded: You have exceeded your API request quota. Please wait and try again later.';
        } else if (lowerCaseMessage.includes('safety')) {
            errorMessage = 'Content Blocked: The request was blocked due to safety settings. Please check the content of your VTT file.';
        } else {
             errorMessage = `Gemini API Error: ${error.message}`;
        }
    }
    throw new Error(errorMessage);
  }
};
