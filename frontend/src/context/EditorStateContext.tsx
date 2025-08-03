import { logger } from '../utils/logger';
import React, { createContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase, apiConfig } from '../config/api';

// Types for editor state management
interface EditorState {
  // Core LaTeX content
  originalLatex: string;      // Clean LaTeX before AI changes
  currentLatex: string;       // Current LaTeX content (may include diff)
  proposedLatex: string;      // AI-proposed changes
  
  // Operation states
  diffMode: 'none' | 'viewing' | 'applying';
  isDirty: boolean;           // Has unsaved changes to original content
  aiOperationInProgress: boolean; // Track AI operation state
  
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
  initializeEditor: (
    resumeId: string | null, 
    latexContent: string, 
    lastSaved: Date | null,
    title?: string, 
    jobDesc?: string
  ) => void;
  
  // Content management
  updateLatexFromUser: (content: string) => void;
  updateLatexFromLoad: (content: string) => void;
  
  // AI operations
  startAIOperation: () => void;
  receiveAILatex: (newLatex: string) => void;
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
}

interface EditorContextType extends EditorState, EditorActions {}

export const EditorContext = createContext<EditorContextType | undefined>(undefined);

interface EditorStateProviderProps {
  children: React.ReactNode;
}

export const EditorStateProvider: React.FC<EditorStateProviderProps> = ({ children }) => {
  // Core state
  const [state, setState] = useState<EditorState>({
    originalLatex: '',
    currentLatex: '',
    proposedLatex: '',
    diffMode: 'none',
    isDirty: false,
    aiOperationInProgress: false,
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
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Auto-save timeout ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save effect - only trigger when safe to save
  useEffect(() => {
    const currentState = stateRef.current;
    if (!currentState.resumeId || !currentState.isAutoSaveEnabled || aiOperationInProgress.current || !currentState.isDirty) {
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
  }, [state.isDirty, state.resumeId, state.isAutoSaveEnabled]);

  // Initialize editor with resume data
  const initializeEditor = useCallback((
    resumeId: string | null, 
    latexContent: string, 
    lastSaved: Date | null,
    title = 'Untitled Resume', 
    jobDesc = ''
  ) => {
    aiOperationInProgress.current = false; // Reset on init
    setState(prev => ({
      ...prev,
      resumeId,
      originalLatex: latexContent,
      currentLatex: latexContent,
      proposedLatex: '',
      diffMode: 'none',
      isDirty: false,
      lastSaved, // Set lastSaved atomically
      showInlineChanges: false,
      editorDecorations: [],
      resumeTitle: title,
      jobDescription: jobDesc,
      aiOperationInProgress: false
    }));
  }, []);

  // Handle user edits to LaTeX content
  const updateLatexFromUser = useCallback((content: string) => {
    // Prevent user edits during AI operations
    if (aiOperationInProgress.current || state.diffMode !== 'none') {
      logger.warn('Blocking user edit during AI operation');
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
      showInlineChanges: false,
      aiOperationInProgress: true
    }));
  }, []);

  // Complete AI operation (unlock state)
  const completeAIOperation = useCallback(() => {
    aiOperationInProgress.current = false;
    setState(prev => ({
      ...prev,
      aiOperationInProgress: false
    }));
  }, []);

  // Receive AI LaTeX and show diff (simple approach)
  const receiveAILatex = useCallback((newLatex: string) => {
    if (!aiOperationInProgress.current) {
      logger.warn('Received AI LaTeX but no operation in progress');
      return;
    }

    try {
      logger.info('SIMPLE LATEX: Received new LaTeX');
      // LaTeX length logging for debugging
      
      if (!newLatex || newLatex === state.originalLatex) {
        logger.info('SIMPLE LATEX: No changes detected, completing operation');
        completeAIOperation();
        return;
      }
      
      // Set the proposed LaTeX content for diff viewing
      setState(prev => ({
        ...prev,
        proposedLatex: newLatex,
        diffMode: 'viewing',
        showInlineChanges: true,
        editorDecorations: [], // No custom decorations needed with Monaco diff editor
        aiOperationInProgress: false
      }));
      
    } catch (error) {
      logger.error('❌ Error processing AI LaTeX:', error);
      completeAIOperation();
    }
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
    const currentState = stateRef.current;
    if (!currentState.resumeId || currentState.isSaving || aiOperationInProgress.current) {
      return;
    }

    setState(prev => ({ ...prev, isSaving: true }));

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error("Not authenticated");
      const token = session.data.session.access_token;

      const response = await fetch(`${apiConfig.baseUrl}/resumes/${currentState.resumeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: currentState.resumeTitle,
          latex_content: currentState.originalLatex, // Always save original, never diff content
          job_description: currentState.jobDescription
        }),
      });

      if (response.ok) {
        setState(prev => ({
          ...prev,
          isDirty: false,
          lastSaved: new Date(),
          isSaving: false,
        }));
        logger.success('Auto-saved resume successfully');
      } else {
        logger.error('❌ Auto-save failed:', response.status);
        setState(prev => ({ ...prev, isSaving: false }));
      }
    } catch (error) {
      logger.error('❌ Auto-save error:', error);
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, []);

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

  const value: EditorContextType = {
    // State
    ...state,
    // Actions
    initializeEditor,
    updateLatexFromUser,
    updateLatexFromLoad,
    startAIOperation,
    receiveAILatex,
    acceptAIChanges,
    rejectAIChanges,
    completeAIOperation,
    triggerAutoSave,
    updateResumeTitle,
    updateJobDescription,
    setEditorDecorations,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

export type { EditorState, EditorActions, EditorContextType }; 