

import { GoogleGenAI, Type } from "@google/genai";
import type { Phone, GeminiResponse, Recommendation, StoreDetails, ChatMessage, PhoneConstraints } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
  
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- START: Debug Logging ---
const AI_DEBUG_LOG_KEY = 'ai_debug_log';

/**
 * Sanitizes the 'thoughts' object (like groundingMetadata) to prevent localStorage overflow.
 * @param thoughts The original thoughts/metadata object from the Gemini response.
 * @returns A smaller, serializable object for logging.
 */
const sanitizeThoughtsForLogging = (thoughts: any): any => {
    if (!thoughts) {
        return 'No thoughts provided.';
    }

    // Check if it's groundingMetadata, which can be very large
    if (thoughts.groundingChunks || thoughts.searchEntryPoint) {
        const sanitized: { groundingChunks?: any[]; searchEntryPoint?: string } = {};

        if (thoughts.groundingChunks) {
            // Keep only the essential parts of grounding chunks
            sanitized.groundingChunks = thoughts.groundingChunks.map((chunk: any) => ({
                web: chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : undefined,
                maps: chunk.maps ? { uri: chunk.maps.uri, title: chunk.maps.title } : undefined
            })).filter((c:any) => c.web || c.maps);
        }
        
        // Omit the large searchEntryPoint which contains rendered HTML
        if (thoughts.searchEntryPoint) {
            sanitized.searchEntryPoint = 'Omitted for brevity to prevent log overflow.';
        }
        
        return sanitized;
    }

    // If it's not a known large object, return it as is.
    return thoughts;
};


/**
 * Logs an AI interaction to localStorage for debugging purposes.
 * @param stage The name of the pipeline stage.
 * @param thoughts The 'thoughts' object from the Gemini response.
 * @param rawResponse The raw text response from the Gemini API.
 */
export const logAiInteraction = (stage: string, thoughts: any, rawResponse: string): void => {
    try {
        const logsStr = localStorage.getItem(AI_DEBUG_LOG_KEY);
        const logs = logsStr ? JSON.parse(logsStr) : [];
        logs.push({
            timestamp: new Date().toISOString(),
            stage,
            thoughts: sanitizeThoughtsForLogging(thoughts),
            rawResponse
        });
        localStorage.setItem(AI_DEBUG_LOG_KEY, JSON.stringify(logs, null, 2));
    } catch (e) {
        console.error("Failed to write to AI debug log:", e);
    }
};

/**
 * Retrieves all AI debug logs from localStorage.
 * @returns An array of log entries.
 */
export const getAiLogs = (): any[] => {
    try {
        const logsStr = localStorage.getItem(AI_DEBUG_LOG_KEY);
        return logsStr ? JSON.parse(logsStr) : [];
    } catch (e) {
        console.error("Failed to read AI debug log:", e);
        return [];
    }
};

/**
 * Clears all AI debug logs from localStorage.
 */
export const clearAiLogs = (): void => {
    localStorage.removeItem(AI_DEBUG_LOG_KEY);
};
// --- END: Debug Logging ---


const recommendationSchema = {
    type: Type.OBJECT,
    properties: {
        phoneName: {
            type: Type.STRING,
            description: "The exact name of the recommended phone from the provided list."
        },
        justification: {
            type: Type.STRING,
            description: "A detailed explanation of why this phone is a good match for the user's priorities."
        }
    },
    required: ["phoneName", "justification"]
};

const verificationSchema = {
    type: Type.OBJECT,
    properties: {
        status: {
            type: Type.STRING,
            enum: ['Verified', 'Minor Discrepancy', 'Unverified'],
            description: "The verification status. 'Verified' if all sources agree. 'Minor Discrepancy' if sources have small differences. 'Unverified' if data could not be reliably found."
        },
        notes: {
            type: Type.STRING,
            description: "A brief note explaining any discrepancies or if a source was prioritized. e.g., 'Used official spec for battery, which differs slightly from GSMArena.' Should be a short, clear sentence."
        },
        sources: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 2-3 direct URL strings to the reputable sources used for verification."
        }
    },
    required: ["status", "notes", "sources"]
};


// FIX: Define properties object first to avoid self-reference issue in `required` array.
const phoneSpecProperties = {
    Name: { type: Type.STRING },
    Price: { type: Type.NUMBER, description: "Estimated price in the user's local currency as a number. If a price cannot be found, use the string 'N/A'." },
    Currency: { type: Type.STRING, description: "The 3-letter ISO currency code for the price (e.g., 'USD', 'NGN'). If price is 'N/A', this should be 'N/A' as well." },
    CPU: { type: Type.STRING },
    Battery: { type: Type.STRING, description: "Battery capacity, e.g., '5000 mAh'." },
    "Screen Tech": { type: Type.STRING, description: "e.g., 'AMOLED', 'OLED', 'LTPO AMOLED'." },
    Cameras: { type: Type.STRING, description: "Main camera specs, e.g., '50MP Wide, 12MP Ultrawide'." },
    "Refresh Rate": { type: Type.STRING, description: "e.g., '120Hz'."},
    "Screen Size": { type: Type.STRING, description: "e.g., '6.7 inches'." },
    "Charging Speed": { type: Type.STRING, description: "Wired charging speed, e.g., '67W'." },
    "Wireless Charging": { type: Type.BOOLEAN },
    "Video Recording": { type: Type.STRING, description: "Max video resolution and framerate, e.g., '4K@60fps'." },
    "Screen Resolution": { type: Type.STRING, description: "e.g., '1080 x 2400'." },
    "3.5mm Jack": { type: Type.BOOLEAN },
    "SIM Slots": { type: Type.STRING, description: "e.g., 'Dual SIM'." },
    verification: verificationSchema
};

const phoneSpecSchema = {
    type: Type.OBJECT,
    properties: phoneSpecProperties,
    required: Object.keys(phoneSpecProperties)
};

const phoneConstraintsSchema = {
  type: Type.OBJECT,
  properties: {
    price_min: { type: Type.NUMBER, description: "Minimum price, or null if not specified." },
    price_max: { type: Type.NUMBER, description: "Maximum price, or null if not specified." },
    currency: { type: Type.STRING, description: "The currency for the price range (e.g., 'USD', 'NGN'), or null if not specified."},
    primary_use_case: { type: Type.STRING, description: "Primary use case for the phone (e.g., 'gaming', 'photography', 'general use', 'business'). Set to null if unclear." },
    required_features: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Key features the user explicitly mentioned as required (e.g., 'high refresh rate', 'large battery', 'good camera')."
    },
    excluded_brands: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Brands the user explicitly said to exclude."
    },
    target_brands: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Specific brands the user mentioned they prefer."
    },
    model_series: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Specific model lines mentioned, e.g., 'Galaxy S', 'iPhone Pro', 'Pixel'."
    },
    release_year_min: {
      type: Type.NUMBER,
      description: "The minimum release year specified, e.g., if user says 'from 2022', this would be 2022."
    },
    exclude_latest_generation: {
        type: Type.BOOLEAN,
        description: "Set to true if the user wants to exclude the most recent models or generation."
    }
  },
};


/**
 * Extracts a JSON string from a Markdown code block.
 * @param text The text that might contain a JSON code block.
 * @returns The extracted JSON string.
 */
function extractJsonFromString(text: string): string {
  // Use a regex to find content between ```json and ``` or just ``` and ```
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  // If a match is found, return the captured group, otherwise return the original trimmed text
  if (match && match[1]) {
    return match[1].trim();
  }
  return text.trim();
}


export const getPhoneRecommendations = async (
  priorities: string,
  phones: Phone[]
): Promise<{ primary: Recommendation; runnerUp: Recommendation | null }> => {
  const prompt = `
    You are an expert phone recommender. Your task is to analyze the user's priorities and the provided list of phones with their specifications, then recommend the best phone and a runner-up.

    **User's Priorities:**
    "${priorities}"

    **List of Available Phones and Their Specifications:**
    ${JSON.stringify(phones.map(({ verification, ...rest }) => rest), null, 2)}

    **Instructions:**
    1.  Carefully read the user's priorities.
    2.  Analyze the specifications of all phones in the provided list.
    3.  Select the single best phone that matches the user's priorities. This is the "primary recommendation".
    4.  Select a second-best option as a "runner-up". The runner-up should be a good alternative but not the absolute best match. If no other phone is a suitable runner-up, you can omit it.
    5.  The 'phoneName' you return MUST EXACTLY match one of the "Name" fields from the provided phone list. Do not invent or alter phone names.
    6.  Provide a clear and concise justification for each recommendation, explaining how its features align with the user's stated needs.
    7.  Return the result in the specified JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro", 
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryRecommendation: recommendationSchema,
              runnerUp: {
                // FIX: Corrected typo from `recommendSchema` to `recommendationSchema`.
                ...recommendationSchema,
                description: "The second-best recommendation. This is optional."
              }
            },
            required: ["primaryRecommendation"]
          }
        },
      });

    const rawResponseText = response.text.trim();
    if (!rawResponseText) {
        throw new Error("Received an empty response from the AI model.");
    }
    
    const result: GeminiResponse = JSON.parse(rawResponseText);
    
    if (!result.primaryRecommendation || !result.primaryRecommendation.phoneName) {
        throw new Error("AI response is missing the primary recommendation.");
    }

    const primary: Recommendation = {
        name: result.primaryRecommendation.phoneName,
        justification: result.primaryRecommendation.justification
    };

    const runnerUp: Recommendation | null = result.runnerUp && result.runnerUp.phoneName
        ? {
            name: result.runnerUp.phoneName,
            justification: result.runnerUp.justification
          }
        : null;

    return { primary, runnerUp };

  } catch (error) {
    console.error("Error calling Gemini API for recommendations:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get recommendations from Gemini: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI model.");
  }
};

/**
 * Uses geolocation coordinates to determine the user's country.
 */
export const getCountryFromCoords = async (lat: number, lon: number): Promise<string | null> => {
  const prompt = `What is the country at latitude ${lat} and longitude ${lon}? Respond with ONLY the country name and nothing else.`;
  try {
      const response = await ai.models.generateContent({
          model: "gemini-flash-lite-latest",
          contents: prompt,
      });
      const country = response.text.trim();
      // Basic validation to ensure it's a plausible country name
      if (country && country.length > 2 && country.length < 60) {
        return country;
      }
      return null;
  } catch (e) {
      console.error("Error getting country from coords:", e);
      return null;
  }
};


/**
 * Stage 1: Analyzes the user's description to extract structured phone constraints.
 */
export const getPhoneConstraints = async (description: string, country: string): Promise<PhoneConstraints> => {
  const prompt = `
    You are an expert assistant for understanding user needs.
    The user is located in **${country}**.
    Analyze the following user request and extract key phone preferences and constraints into a structured JSON object.
    You MUST pay extremely close attention to specific model series (e.g., 'Galaxy S', 'Pixel', 'iPhone Pro'), release years, and date ranges. Also, identify if the user wants to exclude the most recent models.
    If the user mentions a price but no currency, assume the currency is for their location (${country}).
    If a constraint is not mentioned, omit it or set it to null.

    User Request: "${description}"

    Output Schema: ${JSON.stringify(phoneConstraintsSchema, null, 2)}
  `;
  let rawResponseText = '';
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: phoneConstraintsSchema,
        thinkingConfig: { thinkingBudget: 8192 },
      }
    });

    rawResponseText = response.text;
    logAiInteraction('Stage 1: Get Constraints', null, rawResponseText);

    const jsonText = extractJsonFromString(rawResponseText);
    const result = JSON.parse(jsonText);
    return result as PhoneConstraints;

  } catch (error) {
    console.error("Error calling Gemini API for getPhoneConstraints:", error);
    if (error instanceof Error) {
        const originalMessage = error.message;
        let enhancedMessage = `Failed to get phone constraints from Gemini: ${originalMessage}`;
        if (originalMessage.includes("is not valid JSON")) {
            enhancedMessage += ` | Raw Response: ${rawResponseText.substring(0, 150)}...`;
        }
        throw new Error(enhancedMessage);
    }
    throw new Error("An unknown error occurred while getting phone constraints.");
  }
};

/**
 * Stage 2: Generates a list of phone names based on structured constraints.
 */
export const generatePhoneListFromConstraints = async (constraints: PhoneConstraints): Promise<string[]> => {
    const prompt = `
      You are a smartphone expert assistant. Your task is to generate a list of phone models based on the provided structured constraints, strictly verifying that each phone meets all conditions.
      
      **Constraints:**
      ${JSON.stringify(constraints, null, 2)}
      
      **Instructions:**
      1.  **Interpret Constraints:** Carefully interpret all aspects of the provided constraints (price, currency, use case, features, brands, model series, release year, etc.).
      2.  **Initial Search:** Use your search tool to generate a broad list of potential candidate phones that seem to match the constraints.
      3.  **Strict Verification Loop:** For each candidate phone, perform a new, targeted search to rigorously verify if it meets EVERY constraint. Be ruthless. For example, if 'model_series' is 'Galaxy S', you must discard any 'Galaxy A' or 'Galaxy Z' phones. If 'release_year_min' is 2022, discard phones from 2021. Discard any phone that fails verification.
      4.  **Self-Correction and Final Review (MANDATORY):** Before you output the final JSON array, you MUST perform a final review. Re-read the original constraints. For every single phone name in your proposed final list, do a quick verification search to confirm it matches the brand, model series, and release window. If a phone does not perfectly match, you MUST remove it. This final check is mandatory to prevent errors.
      5.  **Final List Compilation:** Create a final list of up to 15 unique phone names that successfully passed your strict verification and self-correction process. If you can only find 2 or 3 phones that meet the criteria, return just those. Only return an empty list if you are certain that zero phones match after a thorough search.
      6.  **Output:** Return ONLY a JSON array of strings, where each string is the phone's full and correct model name (e.g., "Google Pixel 8 Pro", "Samsung Galaxy S24 Ultra"). Do not include any other text, explanation, or markdown formatting.
    `;
    let rawResponseText = '';
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
          thinkingConfig: { thinkingBudget: 16384 },
        }
      });
      
      rawResponseText = response.text;
      logAiInteraction('Stage 2: Generate List', response.candidates?.[0]?.groundingMetadata, rawResponseText);

      const jsonText = extractJsonFromString(rawResponseText);
      const result = JSON.parse(jsonText);
      return result as string[];
    } catch (error) {
      console.error("Error calling Gemini API for generatePhoneListFromConstraints:", error);
      if (error instanceof Error) {
          const originalMessage = error.message;
          let enhancedMessage = `Failed to generate phone list from Gemini: ${originalMessage}`;
          if (originalMessage.includes("is not valid JSON")) {
              enhancedMessage += ` | Raw Response: ${rawResponseText.substring(0, 150)}...`;
          }
          throw new Error(enhancedMessage);
      }
      throw new Error("An unknown error occurred while generating the phone list.");
    }
};

/**
 * Stage 3: Fetches and verifies detailed specifications for a single phone name.
 */
export const getSpecsForPhone = async (phoneName: string, country: string): Promise<Phone> => {
    const prompt = `
      You are a meticulous data researcher. For the smartphone name "${phoneName}", you MUST follow a strict "Research and Verify" process to find its detailed specifications and return the data, including verification details, in a structured JSON format.

      **"Research and Verify" Process:**
      1.  **Research on Specific Sources:** You MUST use your search tool to find specifications from the following list of reputable sources: **GSMArena, PhoneArena, Amazon.com, and the official manufacturer's product page for "${phoneName}"**. You should try to cross-reference data from at least two of these sources.
      2.  **Critical Self-Correction & Source Verification:** For each potential source URL found by your search tool, you MUST perform a verification step before extracting any data. Compare the \`title\` attribute of the search result (which represents the webpage's title) with the exact phone name you are currently researching: **"${phoneName}"**. If the webpage \`title\` does not clearly and unambiguously contain the \`phoneName\`, or if it appears to be for a different product, you MUST discard that source as unreliable and find an alternative. This prevents using data from incorrect product pages (e.g., product ID mixups). Only use sources that pass this stringent verification check.
      3.  **Cross-Reference and Synthesize:** Compare the data from the verified sources. If there are any conflicts (e.g., one source lists a 4500 mAh battery and another lists 4575 mAh), use the data from the more reliable source (typically the official one).
      4.  **Report Findings with Proof:** For the phone, you must populate the main specification fields AND a \`verification\` object.
          *   Set \`verification.status\`: 'Verified' if sources agree, 'Minor Discrepancy' if you had to resolve a conflict, 'Unverified' if you couldn't find reliable data even after thorough verification.
          *   Set \`verification.notes\`: Briefly explain any discrepancies you found or if a source was prioritized (e.g., "Official site lists 4575mAh, GSMArena lists 4500mAh. Used official data."). If there are no issues, this should be a short confirmation like "All verified sources were consistent."
          *   Set \`verification.sources\`: Provide an array of the direct URLs you used as proof. These must be URLs that passed your self-correction check.
      
      **Output Instructions:**
      *   For 'Price', you MUST search for the price specifically for a user located in **"${country}"**. Use search queries like '"${phoneName}" price in ${country}'. The price returned must be an estimated market price, and it MUST be a number. If a reliable price cannot be found, the value for 'Price' must be the string "N/A".
      *   For 'Currency', you MUST return the 3-letter ISO currency code corresponding to the price you found (e.g., "USD", "NGN", "EUR"). If the price is "N/A", the currency must also be "N/A".
      *   For boolean values ('Wireless Charging', '3.5mm Jack'), use JSON 'true' or 'false'.
      *   If a specific piece of information cannot be found after extensive searching (other than price), use the string "N/A". This should be a last resort.
      *   Return a single JSON object for the phone. Ensure the object perfectly adheres to the provided JSON schema. Do not include any extra text or markdown.
      *   The schema to follow is: ${JSON.stringify(phoneSpecSchema, null, 2)}
    `;
    let rawResponseText = '';
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
          // responseMimeType and responseSchema are removed as they are incompatible with tool use.
          // The prompt is configured to instruct the model to return a JSON object, which will be parsed from the text response.
          thinkingConfig: { thinkingBudget: 8192 },
        }
      });
      
      rawResponseText = response.text;
      logAiInteraction(`Stage 3: Get Specs for ${phoneName}`, response.candidates?.[0]?.groundingMetadata, rawResponseText);

      const jsonText = extractJsonFromString(rawResponseText);
      const result = JSON.parse(jsonText);
      // Gemini may return a number for Price when it should be a string 'N/A'
      // This is a workaround to handle cases where the prompt is not perfectly followed
      if (result.Price === null || result.Price === undefined) {
        result.Price = "N/A";
        result.Currency = "N/A";
      }
      return result as Phone;
    } catch (error) {
      console.error(`Error calling Gemini API for specs for ${phoneName}:`, error);
      if (error instanceof Error) {
        const originalMessage = error.message;
        let enhancedMessage = `Failed to fetch phone specs for ${phoneName} from Gemini: ${originalMessage}`;
        if (originalMessage.includes("is not valid JSON")) {
            enhancedMessage += ` | Raw Response: ${rawResponseText.substring(0, 150)}...`;
        }
        throw new Error(enhancedMessage);
      }
      throw new Error(`An unknown error occurred while fetching specs for ${phoneName}.`);
    }
};

export const answerTableQuestion = async (
    messages: ChatMessage[],
    tableData: Phone[],
    isThinkingMode: boolean
  ): Promise<string> => {
    const history = messages.slice(0, -1)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    const lastMessage = messages[messages.length - 1];
    const question = lastMessage.content;

    const prompt = `
      You are an AI smartphone expert. Your primary goal is to answer the user's question based on the provided JSON data and conversation history. You must be concise, clear, and follow a strict formatting guide.

      **Context: Phone Comparison Table Data:**
      \`\`\`json
      ${JSON.stringify(tableData.map(({ verification, ...rest }) => rest), null, 2)}
      \`\`\`

      **Conversation History:**
      ${history || 'No previous conversation.'}

      **User's LATEST Question:**
      "${question}"

      **Response Rules:**
      1.  **Be Relevant and Concise:** Your response must directly answer the user's LATEST question. 
          *   If the question requires details or comparisons (e.g., "Compare their cameras", "What are the prices?"), provide the information using the specified Markdown format.
          *   If the question is conversational (e.g., "thank you", "what did I ask first?"), provide a short, conversational answer. **DO NOT include lists of phone specs or summaries in this case.** Your primary goal is to avoid redundancy.
      2.  **Use History for Context:** Pay close attention to the conversation history to understand context. For example, if the user asks "what about that one?", refer to the phone discussed in the previous turn.
      3.  **Strict Markdown Formatting (When Listing Specs):**
          *   Use **bold text** to highlight phone names and key specs.
          *   When comparing phones, create a separate section for each phone, starting with the phone's name in bold.
          *   Follow the name with a simple bulleted list (\`* \`) for its key features.
      4.  **Prioritize Provided Data:** Your primary source of truth is the JSON data provided. Use search only to supplement information not present in the data.

      **Example of a SPEC-BASED answer (if user asks for refresh rates):**
      The **Redmi K60 Ultra** has the highest refresh rate at **144Hz**.

      **Redmi K60 Ultra**
      * Refresh Rate: 144Hz

      **Google Pixel 7 Pro 5G**
      * Refresh Rate: 120Hz

      **Example of a CONVERSATIONAL answer (if user says "thanks"):**
      You're welcome! Is there anything else I can help you with?

      **Output:** Return ONLY the Markdown formatted string of your answer.
    `;
  
    try {
      const modelConfig = isThinkingMode 
      ? { 
          model: "gemini-2.5-pro",
          config: {
              thinkingConfig: { thinkingBudget: 32768 },
              tools: [{googleSearch: {}}],
          }
      } 
      : { 
          model: "gemini-flash-lite-latest", 
          config: {
              tools: [{googleSearch: {}}],
          }
      };

      const response = await ai.models.generateContent({
        ...modelConfig,
        contents: prompt,
      });
      
      const answer = response.text.trim();
      if (!answer) {
          throw new Error("The AI expert did not provide an answer.");
      }
      return answer;
    } catch (error) {
      console.error("Error calling Gemini API for chat question:", error);
      if (error instanceof Error) {
          throw new Error(`Failed to get chat answer from Gemini: ${error.message}`);
      }
      throw new Error("An unknown error occurred while communicating with the AI model for the chat.");
    }
  };

  export const findNearbyStores = async (
    phoneName: string,
    latitude: number,
    longitude: number
  ): Promise<StoreDetails[]> => {
    
    const storeDetailsSchemaForPrompt = {
        stores: [
            {
                name: "string",
                mapsUrl: "string",
                price: "string | null",
                phoneNumber: "string | null",
                placeId: "string",
            }
        ]
    };

    const prompt = `
      A user wants to find stores near them that sell the "${phoneName}".
      Your task is to act as a research assistant with two steps:
      1.  **Find Stores:** Use the Google Maps tool to find relevant electronics or phone stores near the user's location.
      2.  **Research Details:** For each store you find, use the Google Search tool to find two specific pieces of information:
          a. The store's phone number.
          b. The current price for the specific phone model: "${phoneName}".
      3.  **Compile Results:** Consolidate your findings into a JSON object. The 'price' and 'phoneNumber' fields MUST be null if you cannot find them after a thorough search. You MUST include the 'placeId' from the Google Maps result for each store.

      **Output Format:**
      Return a single JSON object inside a markdown code block. The JSON object must match the following schema:
      \`\`\`json
      ${JSON.stringify(storeDetailsSchemaForPrompt, null, 2)}
      \`\`\`
      Do not include any stores if you cannot find their basic information from Google Maps. Do not include any other text or explanations outside of the JSON markdown block.
    `;
    
    let rawResponseText = '';
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            tools: [{ googleMaps: {} }, { googleSearch: {} }],
            toolConfig: {
                retrievalConfig: {
                    latLng: {
                        latitude,
                        longitude,
                    },
                },
            },
        },
      });

      rawResponseText = response.text.trim();
      if (!rawResponseText) {
        return [];
      }

      const jsonText = extractJsonFromString(rawResponseText);
      const result = JSON.parse(jsonText);
      const stores: StoreDetails[] = result.stores || [];

      // De-duplicate results using placeId to ensure each store appears only once.
      const uniqueStores = Array.from(new Map(stores.map(store => [store.placeId, store])).values());

      return uniqueStores;

    } catch (error) {
      console.error("Error calling Gemini API for Maps/Search grounding:", error);
      if (error instanceof Error) {
        const originalMessage = error.message;
        let enhancedMessage = `Failed to find nearby stores: ${originalMessage}`;
        if (originalMessage.includes("is not valid JSON")) {
            enhancedMessage += ` | Raw Response: ${rawResponseText.substring(0, 150)}...`;
        }
        throw new Error(enhancedMessage);
      }
      throw new Error("An unknown error occurred while finding nearby stores.");
    }
};