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
  receiveAIResponse: (proposedLatex: string) => void;
  receiveAIOperations: (operations: any[]) => void;
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

  // Receive AI response and create visual diff using only diff library
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

    // Create simple decorations for the new content
    const decorations: any[] = [];
    const originalLines = state.originalLatex.split('\n');
    const newLines = newLatex.split('\n');
    
    // Highlight lines that are different from original
    for (let i = 0; i < newLines.length; i++) {
      const newLine = newLines[i];
      const originalLine = originalLines[i] || '';
      
      if (newLine !== originalLine || i >= originalLines.length) {
            decorations.push({
              range: {
            startLineNumber: i + 1,
                startColumn: 1,
            endLineNumber: i + 1,
                endColumn: 1,
              },
              options: {
                isWholeLine: true,
            className: 'bg-green-500/30 border-l-4 border-green-500',
            hoverMessage: { value: 'Modified line' }
          }
        });
      }
    }

    setState(prev => ({
      ...prev,
      proposedLatex: newLatex,
      currentLatex: newLatex, // Show the new content directly
      diffMode: 'viewing',
      showInlineChanges: true,
      editorDecorations: decorations,
      aiOperationInProgress: false
    }));
  }, [state.originalLatex, completeAIOperation]);



  // Apply JSON operations to LaTeX content with frozen line numbers
  const applyOperationsToLatex = useCallback((originalLatex: string, operations: any[]): string => {
    try {
      const lines = originalLatex.split('\n');
      let newLines = [...lines];
      
      // Validate operations before applying
      console.log('🔍 Validating operations...');
      for (const op of operations) {
        const opType = op.type;
        if (opType === 'delete_range' || opType === 'replace_range') {
          const startLine = op.start_line || 0;
          const endLine = op.end_line || 0;
          console.log(`🔍 Operation ${opType}: lines ${startLine}-${endLine}`);
          console.log(`🔍 Content at start line: "${lines[startLine - 1] || 'OUT_OF_BOUNDS'}"`);
          console.log(`🔍 Content at end line: "${lines[endLine - 1] || 'OUT_OF_BOUNDS'}"`);
        } else if (opType === 'delete' || opType === 'add' || opType === 'replace') {
          const line = op.line || 0;
          console.log(`🔍 Operation ${opType}: line ${line}`);
          console.log(`🔍 Content at line: "${lines[line - 1] || 'OUT_OF_BOUNDS'}"`);
        }
      }
      
      // Process operations in any order - line numbers are frozen!
      for (const op of operations) {
        const opType = op.type;
        
        console.log(`🔍 Processing operation: ${opType}`, op);
        
        // Use original line numbers directly (no adjustment needed!)
        const getLine = (lineNumber: number) => {
          return lineNumber - 1; // Convert to 0-based index
        };
        
        switch (opType) {
          case 'delete':
            const deleteLine = getLine(op.line || 0);
            console.log(`🗑️ Delete line ${op.line} (index: ${deleteLine})`);
            if (0 <= deleteLine && deleteLine < newLines.length) {
              newLines.splice(deleteLine, 1);
            }
            break;
            
          case 'add':
            const addLine = getLine(op.line || 0);
            const content = op.content || '';
            console.log(`➕ Add line ${op.line} (index: ${addLine}) with content: "${content}"`);
            if (0 <= addLine && addLine <= newLines.length) {
              // Ensure content doesn't have unwanted line breaks
              const cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '');
              newLines.splice(addLine, 0, cleanContent);
            }
            break;
            
          case 'replace':
            const replaceLine = getLine(op.line || 0);
            const replaceContent = op.content || '';
            console.log(`🔄 Replace line ${op.line} (index: ${replaceLine}) with content: "${replaceContent}"`);
            if (0 <= replaceLine && replaceLine < newLines.length) {
              // Ensure content doesn't have unwanted line breaks
              const cleanContent = replaceContent.replace(/\r\n/g, '\n').replace(/\r/g, '');
              newLines[replaceLine] = cleanContent;
            }
            break;
            
          case 'delete_range':
            const startLine = getLine(op.start_line || 0);
            const endLine = getLine(op.end_line || 0);
            console.log(`🗑️ Delete range ${op.start_line}-${op.end_line} (index: ${startLine}-${endLine})`);
            if (0 <= startLine && startLine <= endLine && endLine < newLines.length) {
              const deletedLines = endLine - startLine + 1;
              newLines.splice(startLine, deletedLines);
            }
            break;
            
          case 'add_multiple':
            const addMultipleLine = getLine(op.line || 0);
            const multipleContent = Array.isArray(op.content) ? op.content : [op.content || ''];
            console.log(`➕ Add multiple lines at ${op.line} (index: ${addMultipleLine}) with content:`, multipleContent);
            if (0 <= addMultipleLine && addMultipleLine <= newLines.length) {
              // Clean each content item
              const cleanContent = multipleContent.map((item: string) => 
                (item || '').replace(/\r\n/g, '\n').replace(/\r/g, '')
              );
              newLines.splice(addMultipleLine, 0, ...cleanContent);
            }
            break;
            
          case 'replace_range':
            const replaceStartLine = getLine(op.start_line || 0);
            const replaceEndLine = getLine(op.end_line || 0);
            const replaceRangeContent = Array.isArray(op.content) ? op.content : [op.content || ''];
            console.log(`🔄 Replace range ${op.start_line}-${op.end_line} (index: ${replaceStartLine}-${replaceEndLine}) with content:`, replaceRangeContent);
            if (0 <= replaceStartLine && replaceStartLine <= replaceEndLine && replaceEndLine < newLines.length) {
              // Clean each content item
              const cleanContent = replaceRangeContent.map((item: string) => 
                (item || '').replace(/\r\n/g, '\n').replace(/\r/g, '')
              );
              const oldLinesCount = replaceEndLine - replaceStartLine + 1;
              newLines.splice(replaceStartLine, oldLinesCount, ...cleanContent);
            }
            break;
            
          case 'move_section':
            newLines = moveSection(newLines, op.section_name, op.from_index, op.to_index);
            break;
            
          case 'reorder_items':
            newLines = reorderItems(newLines, op.section_name, op.changes);
            break;
            
          default:
            console.warn(`⚠️ Unknown operation type: ${opType}`);
        }
        
        console.log(`📊 After operation ${opType}: total lines = ${newLines.length}`);
      }
      
      return newLines.join('\n');
    } catch (error) {
      console.error('❌ Error applying operations to LaTeX:', error);
      return originalLatex;
    }
  }, []);

  // Helper function to move entire sections
  const moveSection = (lines: string[], sectionName: string, fromIndex: number, toIndex: number): string[] => {
    try {
      const sectionPattern = new RegExp(`\\\\rSection\\{${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`);
      let sectionStart = -1;
      let sectionEnd = -1;
      let sectionCount = 0;
      
      // Find the target section
      for (let i = 0; i < lines.length; i++) {
        if (sectionPattern.test(lines[i])) {
          sectionCount++;
          if (sectionCount === fromIndex) {
            sectionStart = i;
            // Find the end of this section (next section or end of document)
            for (let j = i + 1; j < lines.length; j++) {
              if (lines[j].includes('\\rSection{') || lines[j].includes('\\end{document}')) {
                sectionEnd = j - 1;
                break;
              }
            }
            if (sectionEnd === -1) sectionEnd = lines.length - 1;
            break;
          }
        }
      }
      
      if (sectionStart === -1 || sectionEnd === -1) {
        console.warn(`⚠️ Could not find section: ${sectionName} at index ${fromIndex}`);
        return lines;
      }
      
      // Extract the section content
      const sectionContent = lines.slice(sectionStart, sectionEnd + 1);
      const newLines = [...lines];
      
      // Remove the section from its current position
      newLines.splice(sectionStart, sectionEnd - sectionStart + 1);
      
      // Find insertion point for new position
      let insertIndex = 0;
      sectionCount = 0;
      for (let i = 0; i < newLines.length; i++) {
        if (newLines[i].includes('\\rSection{')) {
          sectionCount++;
          if (sectionCount === toIndex) {
            insertIndex = i;
            break;
          }
        }
      }
      
      // Insert the section at new position
      newLines.splice(insertIndex, 0, ...sectionContent);
      
      return newLines;
    } catch (error) {
      console.error('❌ Error moving section:', error);
      return lines;
    }
  };

  // Helper function to reorder items within a section
  const reorderItems = (lines: string[], sectionName: string, changes: any[]): string[] => {
    try {
      const sectionPattern = new RegExp(`\\\\rSection\\{${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`);
      let sectionStart = -1;
      let sectionEnd = -1;
      
      // Find the section
      for (let i = 0; i < lines.length; i++) {
        if (sectionPattern.test(lines[i])) {
          sectionStart = i;
          // Find the end of this section
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('\\rSection{') || lines[j].includes('\\end{document}')) {
              sectionEnd = j - 1;
              break;
            }
          }
          if (sectionEnd === -1) sectionEnd = lines.length - 1;
          break;
        }
      }
      
      if (sectionStart === -1 || sectionEnd === -1) {
        console.warn(`⚠️ Could not find section: ${sectionName}`);
        return lines;
      }
      
      // Extract section content
      const sectionLines = lines.slice(sectionStart, sectionEnd + 1);
      const newLines = [...lines];
      
      // Find item boundaries (like \begin{rSubsection}...\end{rSubsection})
      const items: { start: number; end: number; content: string[] }[] = [];
      let currentItemStart = -1;
      
      for (let i = 0; i < sectionLines.length; i++) {
        if (sectionLines[i].includes('\\begin{rSubsection}') || 
            sectionLines[i].includes('\\begin{rAward}') || 
            sectionLines[i].includes('\\begin{rCertification}')) {
          currentItemStart = i;
        } else if (sectionLines[i].includes('\\end{rSubsection}') || 
                   sectionLines[i].includes('\\end{rAward}') || 
                   sectionLines[i].includes('\\end{rCertification}')) {
          if (currentItemStart !== -1) {
            items.push({
              start: currentItemStart,
              end: i,
              content: sectionLines.slice(currentItemStart, i + 1)
            });
            currentItemStart = -1;
          }
        }
      }
      
      // Apply reordering changes
      const reorderedItems = [...items];
      for (const change of changes) {
        const fromIndex = change.from - 1;
        const toIndex = change.to - 1;
        if (0 <= fromIndex && fromIndex < reorderedItems.length && 
            0 <= toIndex && toIndex < reorderedItems.length) {
          const item = reorderedItems.splice(fromIndex, 1)[0];
          reorderedItems.splice(toIndex, 0, item);
        }
      }
      
      // Reconstruct section with reordered items
      const reorderedSection: string[] = [];
      let itemIndex = 0;
      
      for (let i = 0; i < sectionLines.length; i++) {
        if (sectionLines[i].includes('\\begin{rSubsection}') || 
            sectionLines[i].includes('\\begin{rAward}') || 
            sectionLines[i].includes('\\begin{rCertification}')) {
          // Add reordered item content
          if (itemIndex < reorderedItems.length) {
            reorderedSection.push(...reorderedItems[itemIndex].content);
            itemIndex++;
          }
          // Skip to end of current item
          while (i < sectionLines.length && 
                 !sectionLines[i].includes('\\end{rSubsection}') && 
                 !sectionLines[i].includes('\\end{rAward}') && 
                 !sectionLines[i].includes('\\end{rCertification}')) {
            i++;
          }
        } else if (!sectionLines[i].includes('\\end{rSubsection}') && 
                   !sectionLines[i].includes('\\end{rAward}') && 
                   !sectionLines[i].includes('\\end{rCertification}')) {
          // Add non-item content (like section headers, skills text, etc.)
          reorderedSection.push(sectionLines[i]);
        }
      }
      
      // Replace the section in the main lines array
      newLines.splice(sectionStart, sectionEnd - sectionStart + 1, ...reorderedSection);
      
      return newLines;
    } catch (error) {
      console.error('❌ Error reordering items:', error);
      return lines;
    }
  };

  // Helper function to create visual decorations from JSON operations
  const createDecorationsFromOperations = useCallback((operations: any[]): any[] => {
    // This function is no longer needed with Monaco diff editor
      return [];
  }, []);

  // Helper function to create visual decorations from the new content
  const createDecorationsFromNewContent = useCallback((originalLatex: string, newLatex: string, operations: any[]): any[] => {
    // This function is no longer needed with Monaco diff editor
      return [];
  }, []);

  // Helper function to fix double backslashes in AI responses
  const fixDoubleBackslashes = useCallback((text: string): string => {
    return text.replace(/\\\\/g, '\\');
  }, []);

  // Helper function to validate and fix malformed unified diffs
  const validateAndFixUnifiedDiff = useCallback((diffText: string): string => {
    // This function is no longer needed since we use JSON operations
    return diffText;
  }, []);

  // Validate and fix common LaTeX errors
  const validateAndFixLatex = useCallback((latexCode: string): string => {
    if (!latexCode) return latexCode;
    
    const lines = latexCode.split('\n');
    const fixedLines: string[] = [];
    const sectionCount: { [key: string]: number } = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Count sections to prevent duplicates
      if (line.includes('\\rSection{')) {
        const sectionMatch = line.match(/\\rSection\{([^}]+)\}/);
        if (sectionMatch) {
          const sectionName = sectionMatch[1];
          sectionCount[sectionName] = (sectionCount[sectionName] || 0) + 1;
          // Skip duplicate sections
          if (sectionCount[sectionName] > 1) {
            console.log(`🔧 Removing duplicate section: ${sectionName}`);
            continue;
          }
        }
      }
      
      // Remove content after \end{document}
      if (line.includes('\\end{document}')) {
        fixedLines.push(line);
          break;
      }
      
      // Skip lines after \end{document}
      if (fixedLines.some(prevLine => prevLine.includes('\\end{document}'))) {
        continue;
      }
      
      // Fix common tabular issues
      if (line.includes('\\begin{tabular}') && line.includes('\\item')) {
        console.log(`🔧 Skipping invalid tabular with \\item: ${line}`);
        continue;
      }
      
      // Remove \usepackage after \begin{document}
      if (line.includes('\\usepackage{') && i > 0) {
        const prevLines = lines.slice(0, i);
        if (prevLines.some(l => l.includes('\\begin{document}'))) {
          console.log(`🔧 Skipping \\usepackage after \\begin{document}: ${line}`);
          continue;
        }
      }
      
      fixedLines.push(line);
    }
    
    const fixedLatex = fixedLines.join('\n');
    return fixedLatex;
  }, []);







  // Receive AI JSON operations and apply them (client-side processing)
  const receiveAIOperations = useCallback((operations: any[]) => {
    if (!aiOperationInProgress.current) {
      console.log('🚫 Received AI operations but no operation in progress');
      return;
    }

    try {
      console.log('📥 OPERATIONS: Received operations:', operations);
      console.log('📥 OPERATIONS: Original LaTeX length:', state.originalLatex.length);
      
      // Check if there are any operations
      if (!operations || operations.length === 0) {
        console.log('📥 OPERATIONS: No operations received, completing operation');
        completeAIOperation();
        return;
      }
      
      // Apply operations to create new LaTeX content
      let newLatex = applyOperationsToLatex(state.originalLatex, operations);
      
      // Validate and fix common errors
      newLatex = validateAndFixLatex(newLatex);
      
      console.log('📥 OPERATIONS: New LaTeX length:', newLatex.length);
      console.log('📥 OPERATIONS: New LaTeX preview:', newLatex.substring(0, 200) + '...');
      
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
      console.error('❌ Error processing AI operations:', error);
      completeAIOperation();
    }
  }, [state.originalLatex, applyOperationsToLatex, validateAndFixLatex, completeAIOperation]);

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
        console.log('✅ Auto-saved resume successfully');
      } else {
        console.error('❌ Auto-save failed:', response.status);
        setState(prev => ({ ...prev, isSaving: false }));
      }
    } catch (error) {
      console.error('❌ Auto-save error:', error);
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
    receiveAIResponse,
    receiveAIOperations,
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