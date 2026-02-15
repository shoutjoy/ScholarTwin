import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PaperAnalysisResult, SegmentType, TranslationTone, VocabularyItem, ConclusionSummary, PaperSegment } from "../types";

// Helper to get client (assumes API_KEY is set in environment)
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set REACT_APP_API_KEY or process.env.API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzePdf = async (
  base64Pdf: string, 
  tone: TranslationTone,
  pageRange?: string
): Promise<PaperAnalysisResult> => {
  const ai = getAiClient();
  
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      metadata: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          authors: { type: Type.ARRAY, items: { type: Type.STRING } },
          year: { type: Type.STRING },
          journal: { type: Type.STRING },
          volumeIssue: { type: Type.STRING },
          pages: { type: Type.STRING },
          doi: { type: Type.STRING }
        },
        required: ["title", "authors", "year"]
      },
      segments: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: [SegmentType.TEXT, SegmentType.HEADING, SegmentType.FIGURE_CAPTION, SegmentType.EQUATION, SegmentType.TABLE] },
            original: { type: Type.STRING },
            translated: { type: Type.STRING },
            citations: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING, description: "Detailed AI explanation for figures" }
          },
          required: ["id", "type", "original", "translated"]
        }
      }
    },
    required: ["metadata", "segments"]
  };

  const toneInstruction = tone === TranslationTone.ACADEMIC 
    ? "Translate body text using formal academic Korean (~이다). However, for **Headings, Titles, or short labels**, use **Noun endings** (e.g., '결론' NOT '결론이다', '연구 방법' NOT '연구 방법이다')." 
    : "Translate using an easy, explanatory Korean style.";

  let prompt = `
    Analyze the provided PDF academic paper. To improve speed, process only the visible text efficiently.
    
    Part 1: Metadata
    Extract the paper's metadata (Title, Authors, Year, Journal Name, Vol/Issue, Pages, DOI).

    Part 2: Content Segmentation
    1. Break the text into logical segments (Headings, Paragraphs, Equations, Tables).
    2. **Translation Rules (CRITICAL)**: 
       - ${toneInstruction}
       - **Sentence vs Heading**: If the segment is a Heading (e.g., "4. Conclusion"), translate as "4. 결론". Do NOT add "이다" to headings. Only use "이다" for full sentences.
    
    3. **Structure & Formatting Rules (STRICT)**:
       - **Equations / Code / Syntax**: If you see lists of equations or code (e.g., R syntax like "ATT =~ ...", "model <- ...", or math formulas), you **MUST INSERT NEWLINE CHARACTERS (\\n)** to separate each line. Do NOT return a single long string.
         - Example: "ATT =~ a + b \n SN =~ c + d"
       - **Tables**: If you see a table in the PDF:
         - Set type to 'table'.
         - **ORIGINAL Field**: Do NOT just copy the raw text. You MUST reformat the original text into a **valid Markdown Table** with pipes (|) and a delimiter row (|---|).
         - **TRANSLATED Field**: Translate the content inside the Markdown Table structure.

    4. Extract citations like "(Smith, 2020)" into the citations array.
    
    Return the result as a single JSON object containing 'metadata' and 'segments'.
  `;

  if (pageRange) {
    prompt += `
    IMPORTANT: Focus ONLY on the content found on page(s) ${pageRange}. Do NOT translate the entire document.
    However, try to find metadata (title/author) from the first page even if the range is different, or return generic metadata if not found.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = JSON.parse(text) as PaperAnalysisResult;
    return parsed;
  } catch (error) {
    console.error("Error analyzing PDF:", error);
    throw error;
  }
};

export const extractVocabulary = async (segments: PaperSegment[]): Promise<VocabularyItem[]> => {
  const ai = getAiClient();
  const contextText = segments.map(s => s.original).join("\n").slice(0, 30000); 

  const prompt = `
    Based on the following academic text, extract 5-10 key academic terms.
    For each term:
    1. Term (English).
    2. Definition (Korean, Graduate level).
    3. Context sentence from text.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        term: { type: Type.STRING },
        definition: { type: Type.STRING },
        context: { type: Type.STRING }
      },
      required: ["term", "definition", "context"]
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ text: contextText }, { text: prompt }],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  const text = response.text;
  return text ? JSON.parse(text) : [];
};

export const explainTermWithGrounding = async (term: string): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `
    Explain the academic term "${term}" in Korean for a graduate student.
    Use academic sources to define it. 
    Include citations if possible.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }] 
    }
  });

  let content = response.text || "설명을 찾을 수 없습니다.";
  
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    const links = chunks
      .map((c: any) => c.web?.uri ? `[source](${c.web.uri})` : null)
      .filter(Boolean)
      .join(', ');
    if (links) {
      content += `\n\n참고자료: ${links}`;
    }
  }

  return content;
};

export const generateConclusion = async (segments: PaperSegment[]): Promise<ConclusionSummary> => {
  const ai = getAiClient();
  const contextText = segments.map(s => s.original).join("\n").slice(0, 50000); 

  const prompt = `
    Summarize the conclusion of this paper in Korean using the text provided.
    Identify:
    1. Research Questions (연구 문제)
    2. Key Results (주요 연구 결과) - Describe findings clearly.
    3. Implications/Significance (시사점 및 의의)
    
    Tone: Academic (~이다).
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      researchQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
      results: { type: Type.ARRAY, items: { type: Type.STRING } },
      implications: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ text: contextText }, { text: prompt }],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  const text = response.text;
  if (!text) throw new Error("No conclusion generated");
  return JSON.parse(text);
};

export const findReferenceDetails = async (citation: string, fullTextContext: string): Promise<string> => {
  const ai = getAiClient();
  const prompt = `
    Find the full bibliographic reference for the citation "${citation}" in the provided text.
    Return just the full string of the reference (Author, Title, Year, Journal, etc.).
    If not found, return "Reference details not found in text."
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ text: `Text Context: ${fullTextContext.slice(-20000)}` }, { text: prompt }] 
  });

  return response.text || "";
};