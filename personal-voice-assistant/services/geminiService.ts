import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type } from "@google/genai";
import { Source } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = "gemini-2.5-flash";

const systemInstruction = `You are a sophisticated AI personal assistant. 
Your responses should be concise, helpful, and slightly formal, with a touch of wit. 
You have access to tools for getting the weather, sending emails, and creating calendar events.
When asked for information you don't know, use your search tool to find the most up-to-date answers.
If you open a URL, just say you've opened it. Don't describe the content.
Analyze user commands. If a command is to open a website (e.g., 'open google.com'), your response should be ONLY the full URL (e.g., 'https://www.google.com').
Do not add any other words, markdown, or explanation.
When asked to perform an action like sending an email or creating an event, if any information is missing (e.g., recipient, subject, body for email; title, start time, end time for calendar), ask the user for the missing details before calling the tool.
For weather, you only need a location.`;


const getWeatherFunction: FunctionDeclaration = {
  name: 'get_weather',
  parameters: {
    type: Type.OBJECT,
    description: 'Get the current weather for a specific location.',
    properties: {
      location: {
        type: Type.STRING,
        description: 'The city and state, e.g., San Francisco, CA',
      },
    },
    required: ['location'],
  },
};

const sendEmailFunction: FunctionDeclaration = {
  name: 'send_email',
  parameters: {
    type: Type.OBJECT,
    description: 'Send an email to a recipient.',
    properties: {
      recipient: {
        type: Type.STRING,
        description: 'The email address of the recipient.',
      },
      subject: {
        type: Type.STRING,
        description: 'The subject line of the email.',
      },
      body: {
        type: Type.STRING,
        description: 'The content/body of the email.',
      },
    },
    required: ['recipient', 'subject', 'body'],
  },
};

const createCalendarEventFunction: FunctionDeclaration = {
  name: 'create_calendar_event',
  parameters: {
    type: Type.OBJECT,
    description: 'Create a calendar event.',
    properties: {
      title: {
        type: Type.STRING,
        description: 'The title of the event.',
      },
      start_time: {
        type: Type.STRING,
        description: 'The start time of the event in ISO 8601 format.',
      },
      end_time: {
        type: Type.STRING,
        description: 'The end time of the event in ISO 8601 format.',
      },
      description: {
          type: Type.STRING,
          description: 'A brief description of the event.'
      }
    },
    required: ['title', 'start_time', 'end_time'],
  },
};


export async function getAssistantResponse(prompt: string): Promise<{ text: string, sources: Source[], functionCall?: { name: string; args: any; } }> {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }, { functionDeclarations: [getWeatherFunction, sendEmailFunction, createCalendarEventFunction] }],
            },
        });

        let text = response.text;
        
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
            const firstCall = functionCalls[0];
            return {
                text: '',
                sources: [],
                functionCall: {
                    name: firstCall.name,
                    args: firstCall.args
                }
            }
        }


        // Special handling for URL commands
        const urlRegex = /^(https?:\/\/[^\s]+)$/i;
        if (urlRegex.test(text.trim())) {
            window.open(text.trim(), '_blank');
            text = `Opening ${text.trim()}.`;
        }

        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const sources: Source[] = [];
        if (groundingMetadata?.groundingChunks) {
            groundingMetadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web) {
                    sources.push({
                        uri: chunk.web.uri,
                        title: chunk.web.title || chunk.web.uri,
                    });
                }
            });
        }

        return { text, sources, functionCall: undefined };
    } catch (error) {
        console.error("Error getting response from Gemini:", error);
        throw new Error("Failed to communicate with the AI assistant.");
    }
}