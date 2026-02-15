
export enum TranslationTone {
  ACADEMIC = 'Academic (~이다)',
  EXPLANATORY = 'Explanatory (설명체)',
}

export enum SegmentType {
  TEXT = 'text',
  HEADING = 'heading',
  FIGURE_CAPTION = 'figure_caption',
  EQUATION = 'equation',
  TABLE = 'table'
}

export interface PaperMetadata {
  title: string;
  authors: string[];
  year: string;
  journal: string;
  volumeIssue?: string;
  pages?: string;
  doi?: string;
}

export interface PaperAnalysisResult {
  metadata: PaperMetadata;
  segments: PaperSegment[];
}

export interface PaperSegment {
  id: string;
  type: SegmentType;
  original: string;
  translated: string;
  citations?: string[]; // Detected citations like (Author, 2023)
  description?: string; // AI generated description for figures
}

export interface VocabularyItem {
  term: string;
  definition: string;
  context: string;
}

export interface ConclusionSummary {
  researchQuestions: string[];
  results: string[];
  implications: string[];
}

export interface ReferenceLink {
  citation: string;
  details: string;
  url?: string;
}

export interface ProcessingState {
  isUploading: boolean;
  isProcessing: boolean;
  progress: number; // 0-100
  error: string | null;
}

// Auth Types
export interface User {
  id: string; // email as id
  password?: string; // optional for google auth
  name: string;
  phone?: string;
  isPaid: boolean;
  isActive: boolean;
  isAdmin: boolean;
  provider: 'local' | 'google';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
