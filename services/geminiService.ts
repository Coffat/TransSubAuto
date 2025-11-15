import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const buildJsonPrompt = (vttContent: string, isInitialMessage: boolean): object => {
  const basePrompt = {
    task: "Translate the provided WebVTT content from English to natural, fluent Vietnamese.",
    vtt_content: vttContent,
  };

  if (isInitialMessage) {
    return {
      role: "You are an expert linguist and a meticulous VTT (WebVTT) subtitle file format specialist. Your sole mission is to translate English subtitles into natural, fluent Vietnamese with perfect structural fidelity.",
      non_negotiable_core_rules: {
        rule_1_timestamp_integrity: {
          priority: "CRITICAL FAILURE POINT. This is the single most important rule.",
          details: [
            "You MUST NOT alter, shift, round, or omit the timestamps (e.g., `00:00:13.380 --> 00:00:15.110`). They must be copied CHARACTER-FOR-CHARACTER.",
            "Failure to comply with this rule renders the entire translation useless.",
          ]
        },
        rule_2_structural_integrity: "The cue numbering, blank lines separating cues, and all structural elements of the VTT file MUST remain identical to the input. Do NOT merge or reorder subtitle cues.",
        rule_3_one_to_one_cue_translation: {
          description: "A single input cue block MUST result in exactly one output cue block. DO NOT split one cue into multiple timestamped blocks. This is a critical failure.",
          input_cue_example: "5\n00:00:20.123 --> 00:00:25.456\nThis is a rather long sentence that needs to be translated into Vietnamese while remaining as a single subtitle cue.",
          incorrect_output_violation: "5\n00:00:20.123 --> 00:00:25.456\nĐây là một câu khá dài.\n\n6\n00:00:20.123 --> 00:00:25.456\ncần được dịch sang tiếng Việt.",
          correct_output_adherence: "5\n00:00:20.123 --> 00:00:25.456\nĐây là một câu khá dài cần được dịch sang tiếng Việt và giữ nguyên thành một dòng phụ đề duy nhất."
        }
      },
      special_vtt_element_handling: {
          voice_tags: "If you see tags like `<v Speaker Name>`, preserve the tag exactly and translate only the text that follows. Example: `<v Roger>Hello world.` becomes `<v Roger>Xin chào thế giới.`",
          styling_and_alignment_tags: "Preserve ALL VTT styling tags and alignment cues (e.g., `<b>`, `<i>`, `<u>`, `align:start`, `position:10%`) exactly as they appear in the original.",
          comments: "VTT files can contain `NOTE` comments. These should NOT be translated. Copy them exactly as they are. Example: `NOTE This is a test` remains `NOTE This is a test`."
      },
      translation_guidelines: {
        tone_and_style: "Maintain the original tone of the subtitles, whether it is formal, informal, technical, or conversational. The translation should feel natural to a native Vietnamese speaker.",
        general_content: "Aggressively translate all general English content into natural-sounding Vietnamese. Translate the meaning and intent, not just word-for-word.",
        technical_terms: {
          translate: "General technical concepts into their common Vietnamese equivalents (e.g., 'overfitting' -> 'sự quá khớp').",
          preserve: [
            "Proper nouns for technologies, libraries, frameworks (e.g., NumPy, Pandas, TensorFlow, Python).",
            "Code identifiers: variable names, function names (e.g., `my_variable`, `calculateSum()`).",
            "Specific commands (e.g., `model.fit()`, `pip install`).",
            "Widely accepted acronyms (e.g., API, CLI, GPU, CPU)."
          ]
        }
      },
      output_format_protocol: {
        header: "Start your translated output with a header line: `=== TRANSLATED VTT ===`",
        body: "Your response body should contain ONLY the full, translated VTT content, adhering to all rules.",
        footer: "End your entire response with the completion signal: `=== END OF TRANSLATION ===`",
        important: "Your output MUST NOT contain any explanations, apologies, or text outside of the specified format. Do not write 'Here is the translation:' or anything similar."
      },
      final_internal_monologue: "Before you output a single character, perform this internal check: 'Did I copy every single timestamp character-for-character? Is every cue number present? Did I preserve all special tags like `<v Roger>` or `<b>`? Is the final `=== END OF TRANSLATION ===` marker present at the absolute end, with no text after it?' Only after confirming 'yes' to all, proceed with the output.",
      ...basePrompt
    };
  }
  
  // For subsequent chunks, send a lean but forceful prompt.
  return {
    ...basePrompt,
    instruction: "This is a subsequent chunk of a larger file. Continue the translation seamlessly, maintaining context.",
    absolute_command: "Your output for this chunk MUST BE ONLY the translated VTT cues. DO NOT, under any circumstances, include the '=== TRANSLATED VTT ===' header or the '=== END OF TRANSLATION ===' footer. These are strictly forbidden for intermediate chunks. Your entire response must be raw VTT content and nothing else."
  };
};


const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 7000;

export const translateVttWithChat = async (
  chatSession: Chat | undefined,
  vttContent: string,
  isInitialMessage: boolean
): Promise<{ chat: Chat; stream: AsyncGenerator<GenerateContentResponse> }> => {
  
  const promptObject = buildJsonPrompt(vttContent, isInitialMessage);
  const promptString = JSON.stringify(promptObject, null, 2);

  let activeChat = chatSession;
  if (!activeChat) {
    activeChat = ai.chats.create({ 
      model: 'gemini-2.5-flash',
      // We are not using system instructions as we are sending a detailed first message.
    });
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const stream = await activeChat.sendMessageStream({ 
        message: promptString,
        config: {
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 2048 }
        }
      });
      return { chat: activeChat, stream }; // Success
    } catch (error) {
      lastError = error as Error;
      const lowerCaseMessage = (error as Error).message.toLowerCase();
      
      if (lowerCaseMessage.includes('429') || lowerCaseMessage.includes('quota')) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.warn(`Rate limit exceeded. Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      break; // Non-retriable error or retries exhausted
    }
  }

  console.error("Error calling Gemini API after all retries:", lastError);
  
  let errorMessage = "An unknown error occurred while communicating with the Gemini API.";
  if (lastError) {
      const lowerCaseMessage = lastError.message.toLowerCase();
      if (lowerCaseMessage.includes('api key not valid')) {
          errorMessage = 'Invalid API Key: Please ensure your API key is correctly configured.';
      } else if (lowerCaseMessage.includes('429') || lowerCaseMessage.includes('quota')) {
          errorMessage = `Rate Limit Exceeded: Failed after ${MAX_RETRIES} attempts. Please wait a while before trying again.`;
      } else if (lowerCaseMessage.includes('safety')) {
          errorMessage = 'Content Blocked: The request was blocked due to safety settings. Please check the content of your VTT file.';
      } else {
           errorMessage = `Gemini API Error: ${lastError.message}`;
      }
  }
  throw new Error(errorMessage);
};