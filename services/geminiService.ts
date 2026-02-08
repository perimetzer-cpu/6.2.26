
import { GoogleGenAI, Type } from "@google/genai";

// Always initialize with the environment variable directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDocumentForFields = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `זהה שדות חתימה ומידע נדרש בטקסט המשפטי הבא. החזר רשימת JSON של סוגי שדות (SIGNATURE, TEXT, DATE, ID_NUMBER) ותוויות עבורם.
      טקסט המסמך: ${text.substring(0, 3000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              label: { type: Type.STRING }
            }
          }
        }
      }
    });
    
    const jsonStr = response.text?.trim() || '[]';
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return [];
  }
};

/**
 * Generate a polite and personalized reminder message using Gemini
 */
export const generateSmartReminder = async (docTitle: string, signerName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `כתוב הודעת תזכורת קצרה, אדיבה ומקצועית בוואטסאפ עבור לקוח שטרם חתם על מסמך. 
      שם הלקוח: ${signerName}
      שם המסמך: ${docTitle}
      ההודעה צריכה להיות בעברית, לכלול אימוג'י אחד או שניים, ולהדגיש שהחתימה לוקחת פחות מדקה.
      החזר רק את טקסט ההודעה.`,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Reminder Error:", error);
    return `שלום ${signerName}, תזכורת ידידותית לחתימה על המסמך "${docTitle}". תודה!`;
  }
};

/**
 * Generate a 1-sentence summary of the document for the signer
 */
export const summarizeDocument = async (docTitle: string, fileName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `סכם במשפט אחד פשוט וידידותי מה המטרה של המסמך הבא עבור החותם.
      כותרת: ${docTitle}
      שם קובץ: ${fileName}
      הסיכום צריך להיות בעברית ולהתחיל במילים "מסמך זה נועד ל...".`,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return "";
  }
};
