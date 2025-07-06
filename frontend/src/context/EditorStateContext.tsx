import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase, apiConfig } from '../config/api';
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';

// Types for editor state management
interface EditorState {
  // Core LaTeX content
  originalLatex: string;      // Clean LaTeX before AI changes
  currentLatex: string;       // Current LaTeX content (may include diff)
  proposedLatex: string;      // AI-proposed changes
  
  // Operation states
  diffMode: 'none' | 'viewing' | 'applying';
  isDirty: boolean;           // Has unsaved changes to original content
  
  // Auto-save state
  isAutoSaveEnabled: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  
  // UI states (preserve existing functionality)
  showInlineChanges: boolean;
  editorDecorations: any[];
  
  // Resume metadata
  resumeId: string | null;
  resumeTitle: string;
  jobDescription: string;
}

interface EditorActions {
  // Initialization
  initializeEditor: (resumeId: string | null, latexContent: string, title?: string, jobDesc?: string) => void;
  
  // Content management
  updateLatexFromUser: (content: string) => void;
  updateLatexFromLoad: (content: string) => void;
  
  // AI operations
  startAIOperation: () => void;
  receiveAIResponse: (proposedLatex: string) => void;
  acceptAIChanges: () => void;
  rejectAIChanges: () => void;
  completeAIOperation: () => void;
  
  // Auto-save operations
  triggerAutoSave: () => Promise<void>;
  
  // Resume metadata
  updateResumeTitle: (title: string) => void;
  updateJobDescription: (jobDesc: string) => void;
  
  // UI state
  setEditorDecorations: (decorations: any[]) => void;
  setLastSaved: (date: Date | null) => void;
}

interface EditorContextType extends EditorState, EditorActions {}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

interface EditorStateProviderProps {
  children: React.ReactNode;
}

export const useEditorState = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditorState must be used within an EditorStateProvider');
  }
  return context;
};

export const EditorStateProvider: React.FC<EditorStateProviderProps> = ({ children }) => {
  // Core state
  const [state, setState] = useState<Omit<EditorState, 'aiOperationInProgress'>>({
    originalLatex: '',
    currentLatex: '',
    proposedLatex: '',
    diffMode: 'none',
    isDirty: false,
    isAutoSaveEnabled: true,
    isSaving: false,
    lastSaved: null,
    showInlineChanges: false,
    editorDecorations: [],
    resumeId: null,
    resumeTitle: 'Untitled Resume',
    jobDescription: ''
  });

  // Ref for AI operation state to avoid stale closures
  const aiOperationInProgress = useRef(false);

  // Auto-save timeout ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save effect - only trigger when safe to save
  useEffect(() => {
    if (!state.resumeId || !state.isAutoSaveEnabled || aiOperationInProgress.current || !state.isDirty) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      triggerAutoSave();
    }, 2000);

    // Cleanup timeout
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.isDirty, state.resumeId, state.isAutoSaveEnabled, state.originalLatex, state.resumeTitle, state.jobDescription]);

  // Initialize editor with resume data
  const initializeEditor = useCallback((resumeId: string | null, latexContent: string, title = 'Untitled Resume', jobDesc = '') => {
    aiOperationInProgress.current = false; // Reset on init
    setState(prev => ({
      ...prev,
      resumeId,
      originalLatex: latexContent,
      currentLatex: latexContent,
      proposedLatex: '',
      diffMode: 'none',
      isDirty: false,
      showInlineChanges: false,
      editorDecorations: [],
      resumeTitle: title,
      jobDescription: jobDesc
    }));
  }, []);

  // Handle user edits to LaTeX content
  const updateLatexFromUser = useCallback((content: string) => {
    // Prevent user edits during AI operations
    if (aiOperationInProgress.current || state.diffMode !== 'none') {
      console.log('🚫 Blocking user edit during AI operation');
      return;
    }

    setState(prev => ({
      ...prev,
      originalLatex: content,
      currentLatex: content,
      isDirty: true
    }));
  }, [state.diffMode]);

  // Handle loading LaTeX content (no dirty flag)
  const updateLatexFromLoad = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      originalLatex: content,
      currentLatex: content,
      isDirty: false
    }));
  }, []);

  // Start AI operation (lock state)
  const startAIOperation = useCallback(() => {
    aiOperationInProgress.current = true;
    setState(prev => ({
      ...prev,
      diffMode: 'none',
      showInlineChanges: false
    }));
  }, []);

  // Complete AI operation (unlock state)
  const completeAIOperation = useCallback(() => {
    aiOperationInProgress.current = false;
    // No state change needed here as the ref is separate
  }, []);

  // Receive AI response and create diff
  const receiveAIResponse = useCallback((newLatex: string) => {
    if (!aiOperationInProgress.current) {
      console.log('🚫 Received AI response but no operation in progress');
      return;
    }

    if (newLatex === state.originalLatex) {
      // No changes, complete operation
      completeAIOperation();
      return;
    }

    const dmp = new diff_match_patch();
    // Use line-based diffing for accuracy
    const { chars1, chars2, lineArray } = dmp.diff_linesToChars_(state.originalLatex, newLatex);
    const diffs = dmp.diff_main(chars1, chars2, false);
    dmp.diff_charsToLines_(diffs, lineArray);
    dmp.diff_cleanupSemantic(diffs);

    const decorations: any[] = [];
    let originalLine = 1;

    for (const diff of diffs) {
      const op = diff[0];
      const text = diff[1];
      const lineCount = (text.match(/\n/g) || []).length;

      if (op === DIFF_EQUAL) {
        originalLine += lineCount;
      } else if (op === DIFF_INSERT) {
        // For insertions, we just need to mark the line in the original document
        // where the new content will be inserted.
        decorations.push({
          range: {
            startLineNumber: originalLine,
            startColumn: 1,
            endLineNumber: originalLine,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: 'bg-green-600 bg-opacity-20',
            glyphMarginClassName: 'bg-green-600',
            linesDecorationsClassName: 'bg-green-600 bg-opacity-10'
          }
        });
      } else if (op === DIFF_DELETE) {
        // For deletions, highlight the range of lines being removed.
        decorations.push({
          range: {
            startLineNumber: originalLine,
            startColumn: 1,
            endLineNumber: originalLine + lineCount -1,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: 'bg-red-600 bg-opacity-20',
            glyphMarginClassName: 'bg-red-600',
          }
        });
        originalLine += lineCount;
      }
    }

    setState(prev => ({
      ...prev,
      proposedLatex: newLatex,
      // Keep currentLatex as original to show diff against it
      currentLatex: prev.originalLatex, 
      diffMode: 'viewing',
      showInlineChanges: true,
      editorDecorations: decorations
    }));
  }, [state.originalLatex, completeAIOperation]);

  // Accept AI changes
  const acceptAIChanges = useCallback(() => {
    if (state.diffMode !== 'viewing' || !state.proposedLatex) {
      return;
    }

    completeAIOperation();
    const newContent = state.proposedLatex;

    setState(prev => ({
      ...prev,
      originalLatex: newContent,
      currentLatex: newContent,
      proposedLatex: '',
      diffMode: 'none',
      showInlineChanges: false,
      editorDecorations: [],
      isDirty: true // Mark as dirty for auto-save
    }));
  }, [state.diffMode, state.proposedLatex, completeAIOperation]);

  // Reject AI changes
  const rejectAIChanges = useCallback(() => {
    if (state.diffMode !== 'viewing') {
      return;
    }

    completeAIOperation();
    setState(prev => ({
      ...prev,
      currentLatex: prev.originalLatex,
      proposedLatex: '',
      diffMode: 'none',
      showInlineChanges: false,
      editorDecorations: []
    }));
  }, [state.diffMode, state.originalLatex, completeAIOperation]);

  // Auto-save function
  const triggerAutoSave = useCallback(async () => {
    if (!state.resumeId || state.isSaving || aiOperationInProgress.current) {
      return;
    }

    setState(prev => ({ ...prev, isSaving: true }));

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error("Not authenticated");
      const token = session.data.session.access_token;

      const response = await fetch(`${apiConfig.baseUrl}/resumes/${state.resumeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: state.resumeTitle,
          latex_content: state.originalLatex, // Always save original, never diff content
          job_description: state.jobDescription
        }),
      });

      if (response.ok) {
        setState(prev => ({
          ...prev,
          isDirty: false,
          lastSaved: new Date()
        }));
        console.log('✅ Auto-saved resume successfully');
      } else {
        console.error('❌ Auto-save failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Auto-save error:', error);
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, [state.resumeId, state.isSaving, state.resumeTitle, state.originalLatex, state.jobDescription]);

  // Update resume title
  const updateResumeTitle = useCallback((title: string) => {
    setState(prev => ({
      ...prev,
      resumeTitle: title,
      isDirty: true
    }));
  }, []);

  // Update job description  
  const updateJobDescription = useCallback((jobDesc: string) => {
    setState(prev => ({
      ...prev,
      jobDescription: jobDesc,
      isDirty: true
    }));
  }, []);

  // Set editor decorations
  const setEditorDecorations = useCallback((decorations: any[]) => {
    setState(prev => ({
      ...prev,
      editorDecorations: decorations
    }));
  }, []);

  // Set last saved date
  const setLastSaved = useCallback((date: Date | null) => {
    setState(prev => ({
      ...prev,
      lastSaved: date
    }));
  }, []);

  const value: EditorContextType = {
    // State
    ...state,
    // Actions
    initializeEditor,
    updateLatexFromUser,
    updateLatexFromLoad,
    startAIOperation,
    receiveAIResponse,
    acceptAIChanges,
    rejectAIChanges,
    completeAIOperation,
    triggerAutoSave,
    updateResumeTitle,
    updateJobDescription,
    setEditorDecorations,
    setLastSaved
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

export type { EditorState, EditorActions, EditorContextType }; 