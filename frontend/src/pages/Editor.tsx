import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../hooks/useAuth';
import { useResume } from '../context/ResumeContext';
import { useEditorState } from '../hooks/useEditorState';
import { motion } from 'framer-motion';
import AIChat, { AIChatRef } from '../components/AIChat';
import ThreePanelSplitter from '../components/ThreePanelSplitter';
import { apiConfig, supabase } from '../config/api';
import Logo from '../components/Logo';

const LaTeXEditor: React.FC = () => {
  const { resumeId } = useParams<{ resumeId?: string }>();
  const { user, logout } = useAuth();
  const { setCurrentResume } = useResume();
  
  // Use editor state context instead of local state
  const editorState = useEditorState();
  
  // Local UI states (not managed by context)
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileLog, setCompileLog] = useState<string>('');
  const [showJobForm, setShowJobForm] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);
  
  const editorRef = useRef<any>(null);
  const aiChatRef = useRef<AIChatRef>(null);
  const latestLatexContent = useRef(editorState.currentLatex);
  const isInitialMount = useRef(true);
  const decorations = useRef<string[]>([]);

  // Keep a ref to the latest latex content to avoid stale closures
  useEffect(() => {
    latestLatexContent.current = editorState.currentLatex;
  }, [editorState.currentLatex]);

  // Utility function to format time since last save
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString();
  };

  // Auto-compile after a successful save
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (editorState.lastSaved) {
      console.log('✅ Save completed, triggering auto-compilation.');
      compileLatex();
    }
  }, [editorState.lastSaved]); // Intentionally not including compileLatex, see below

  // Debug logging for inline changes state
  useEffect(() => {
    console.log('🔍 EDITOR: showInlineChanges changed to:', editorState.showInlineChanges, 'proposedLatex length:', editorState.proposedLatex.length);
  }, [editorState.showInlineChanges, editorState.proposedLatex]);

  // Apply Monaco decorations when they change
  useEffect(() => {
    if (editorRef.current) {
      decorations.current = editorRef.current.deltaDecorations(
        decorations.current,
        editorState.editorDecorations
      );
    }
  }, [editorState.editorDecorations]);

  // Load PDF from browser storage if available
  useEffect(() => {
    if (resumeId) {
      const storageKey = `pdf_${resumeId}`;
      const storedPdfData = sessionStorage.getItem(storageKey);
      if (storedPdfData) {
        // Convert data URL back to blob and create object URL
        fetch(storedPdfData)
          .then(response => response.blob())
          .then(blob => {
            const pdfUrl = URL.createObjectURL(blob);
            setPdfUrl(pdfUrl);
            console.log('📄 Loaded existing PDF from browser storage');
          })
          .catch(error => {
            console.error('Failed to load PDF from storage:', error);
            // Clear invalid data
            sessionStorage.removeItem(storageKey);
          });
      }
    }
  }, [resumeId]);

  // Load resume if resumeId is provided
  useEffect(() => {
    if (resumeId && user) {
      loadResume(resumeId);
    } else {
      // Start with empty template
      const emptyTemplate = `\\documentclass{resume}
\\begin{document}

\\name{Your Name}
\\address{Email: your.email@example.com | Phone: (123) 456-7890 | Location: City, State}

\\begin{rSection}{Professional Summary}
Write your professional summary here...
\\end{rSection}

\\begin{rSection}{Experience}
\\begin{rSubsection}{Company Name}{Start - End Date}{Job Title}{Location}
\\resumeItem{Achievement or responsibility that demonstrates relevant skills}
\\resumeItem{Another achievement with quantifiable results}
\\end{rSubsection}
\\end{rSection}

\\begin{rSection}{Education}
\\begin{rSubsection}{University Name}{Graduation Date}{Degree}{Location}
\\end{rSubsection}
\\end{rSection}

\\begin{rSection}{Skills}
Programming Languages, Frameworks, Tools, etc.
\\end{rSection}

\\end{document}`;
      editorState.initializeEditor(null, emptyTemplate, null);
    }
  }, [resumeId, user?.id]);

  const loadResume = async (id: string) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error("Not authenticated");
      const token = session.data.session.access_token;

      const response = await fetch(`${apiConfig.baseUrl}/resumes/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch resume');
      const data = await response.json();
      setCurrentResume(data.resume_data);
      editorState.initializeEditor(
        id, 
        data.latex_content, 
        new Date(data.updated_at),
        data.title || 'Untitled Resume', 
        data.job_description || ''
      );
    } catch (error) {
      console.error("Error fetching resume:", error);
    }
  };

  const compileLatexWithContent = useCallback(async (overrideContent?: string) => {
    // Use override content if provided, otherwise use the latest from the ref
    const contentToCompile = overrideContent || latestLatexContent.current;
    
    if (!contentToCompile.trim()) return;

    setIsCompiling(true);
    setCompileLog('');

    try {
      const session = await supabase.auth.getSession();

      if (!session.data.session) throw new Error("Not authenticated");
      const token = session.data.session.access_token;
      console.log('🔄 Starting LaTeX compilation...', {
        contentLength: contentToCompile.length,
        isOverride: !!overrideContent
      });
      
      const response = await fetch(`${apiConfig.baseUrl}/latex/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          latex_content: contentToCompile,
          compiler: 'pdflatex',
          resume_title: editorState.resumeTitle
        }),
      });

      console.log('📊 Compile response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Check compilation status from headers
      const success = response.headers.get('X-Success') === 'true';
      const filename = response.headers.get('X-Filename') || 'resume.pdf';
      const error = response.headers.get('X-Error') || '';

      if (success && response.body) {
        // PDF compilation successful
        const blob = await response.blob();
        
        if (blob.size > 0) {
          // Convert blob to data URL for storage
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            
            // Store PDF in browser storage with resume ID as key
            const storageKey = `pdf_${resumeId}`;
            sessionStorage.setItem(storageKey, dataUrl);
            
            // Create object URL for immediate display
            const pdfUrl = URL.createObjectURL(blob);
            setPdfUrl(pdfUrl);
            
            console.log('✅ PDF compiled and stored in browser storage');
            console.log('📄 PDF filename:', filename);
          };
          reader.readAsDataURL(blob);
          
          // Clear any previous compilation errors
          setCompileLog('✅ Compilation successful');
        } else {
          throw new Error('PDF compilation returned empty file');
        }
      } else {
        // Compilation failed
        const errorMessage = error.replace(/_/g, ' ') || 'Unknown compilation error';
        console.error('❌ Compilation failed:', errorMessage);
        setCompileLog(`❌ Compilation failed: ${errorMessage}`);
        setPdfUrl('');
        
        // Clear any stored PDF
        if (resumeId) {
          const storageKey = `pdf_${resumeId}`;
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error('❌ Compile error:', error);
      setCompileLog(`Error: ${error}`);
    } finally {
      setIsCompiling(false);
    }
  }, [editorState.resumeTitle]); // Depends on resumeTitle for the save payload

  // Wrapper for onClick handlers that don't need content override
  const compileLatex = useCallback(() => compileLatexWithContent(), [compileLatexWithContent]);

  const generateWithAI = async () => {
    if (!editorState.jobDescription.trim()) {
      alert('Please enter a job description first');
      return;
    }

    // Expert ATS-focused LaTeX generation prompt
    const tailoringPrompt = `You are an expert LaTeX resume generator specializing in ATS-friendly, machine-readable resumes.

TARGET POSITION:
${editorState.jobDescription}

TASK: Generate a complete, ATS-optimized LaTeX resume using my existing template and data.

REQUIREMENTS:
✅ ATS-FRIENDLY: Use clear section headers, standard fonts, proper spacing
✅ MACHINE-READABLE: Avoid complex formatting, tables, or graphics that confuse ATS
✅ KEYWORD-OPTIMIZED: Include relevant keywords from the job description naturally
✅ QUANTIFIED IMPACT: Use specific numbers, percentages, and metrics
✅ TEMPLATE-COMPLIANT: Keep exact same LaTeX structure and commands

OUTPUT: Return ONLY the complete LaTeX code from \\documentclass{} to \\end{document}. No explanations or commentary.

Tailor the content to match this specific role while maintaining professional, scannable formatting.`;

    // Show clean message to user instead of technical prompt
    const userFriendlyMessage = `✨ Tailoring your resume for: ${editorState.jobDescription}`;
    aiChatRef.current?.populateInput(userFriendlyMessage);
    aiChatRef.current?.focusInput();
    
    // Send the actual technical prompt behind the scenes
    setTimeout(async () => {
      // Replace user message with technical prompt before sending
      const chatInput = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement;
      if (chatInput) {
        chatInput.value = tailoringPrompt;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      aiChatRef.current?.sendMessage();
    }, 100);
    
    // Close the job form
        setShowJobForm(false);
  };

  const downloadPDF = async () => {
    if (!resumeId) {
      alert('Resume ID not found');
      return;
    }

    setIsDownloading(true);
    try {
      // Get PDF from browser storage
      const storageKey = `pdf_${resumeId}`;
      const storedPdfData = sessionStorage.getItem(storageKey);
      
      if (!storedPdfData) {
        alert('Please compile the PDF first before downloading');
        return;
      }

      // Convert data URL back to blob
      const response = await fetch(storedPdfData);
      const blob = await response.blob();
      
      // Generate filename based on resume data or use default
      const filename = editorState.resumeTitle 
        ? `${editorState.resumeTitle.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_Resume.pdf`
        : 'Resume.pdf';
      
      // Create download link
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(downloadUrl);
      
      console.log('📥 PDF downloaded:', filename);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download PDF. Please try compiling again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Remove unused function - AIChat now uses context directly

  // Diff creation is now handled by the context

  // Apply red/green styling based on line content - now uses context
  const applyDiffStyling = (content: string) => {
    if (!editorRef.current) return;
    
    const lines = content.split('\n');
    const decorations: any[] = [];
    
    lines.forEach((line, index) => {
      if (line.trim().startsWith('%%')) {
        // Red styling for old content (commented lines)
        decorations.push({
          range: { startLineNumber: index + 1, startColumn: 1, endLineNumber: index + 1, endColumn: 1000 },
          options: {
            isWholeLine: true,
            className: 'diff-line-red',
            minimap: { color: '#ef4444', position: 2 }
          }
        });
      } else if (isNewContentLine(line, index, lines)) {
        // Green styling for new content
        decorations.push({
          range: { startLineNumber: index + 1, startColumn: 1, endLineNumber: index + 1, endColumn: 1000 },
          options: {
            isWholeLine: true,
            className: 'diff-line-green',
            minimap: { color: '#22c55e', position: 2 }
          }
        });
      }
    });
    
    editorState.setEditorDecorations(decorations);
    editorRef.current.deltaDecorations([], decorations);
  };

  // Helper to detect if a line is new content (follows a %% line or is substantially different)
  const isNewContentLine = (line: string, index: number, allLines: string[]) => {
    if (line.trim() === '' || line.trim().startsWith('%%')) return false;
    
    // Check if previous line was a comment (indicating this is replacement content)
    if (index > 0 && allLines[index - 1].trim().startsWith('%%')) {
      return true;
    }
    
    // For now, we'll be conservative and only highlight lines that follow %% comments
    return false;
  };

  // Handle individual line clicks for accept/reject - simplified since context handles state
  const handleLineClick = (lineNumber: number) => {
    // Individual line handling is complex and not essential for the fix
    // We'll keep the bulk accept/reject for now
    console.log('🖱️ Clicked line:', lineNumber, '- Use Accept All/Reject All buttons');
  };

  // Accept the AI suggested changes - now uses context
  const handleAcceptChanges = () => {
    console.log('🔄 EDITOR: Accepting AI changes');
    editorState.acceptAIChanges();
    
    // Auto-compile with the new content
    setTimeout(() => {
      const cleanContent = editorState.currentLatex
      .split('\n')
        .filter((line: string) => !line.trim().startsWith('%%'))
      .join('\n');
      compileLatexWithContent(cleanContent);
    }, 500);
  };

  // Reject the AI suggested changes - now uses context
  const handleRejectChanges = () => {
    console.log('🔄 EDITOR: Rejecting AI changes');
    editorState.rejectAIChanges();
  };

  // Create the LaTeX editor content
  const latexEditorContent = (
    <div className="h-full flex flex-col">
      {/* LaTeX Code Section - 75% height */}
      <div className="flex-3" style={{ height: '75%' }}>
        <div className="h-full flex flex-col">
          <div className="border-b border-gray-600/20 px-4 py-3" style={{ backgroundColor: '#0A0A0A' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">LaTeX Code</h3>
            </div>
          </div>
          
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="latex"
              value={editorState.currentLatex}
              onChange={(value) => editorState.updateLatexFromUser(value || '')}
              theme="vs-dark"
              onMount={(editor) => {
                editorRef.current = editor;
                
                // Add click handler for individual change acceptance/rejection
                editor.onDidChangeModelContent(() => {
                  // Detect if content changed due to our diff operations
                  if (editorState.showInlineChanges) {
                    setTimeout(() => applyDiffStyling(editorState.currentLatex), 50);
                  }
                });
                
                // Use mouse up instead of mouse down for better click detection
                editor.onMouseUp((e) => {
                  if (editorState.showInlineChanges && e.target.position) {
                    const lineNumber = e.target.position.lineNumber;
                    const lines = editorState.currentLatex.split('\n');
                    const clickedLine = lines[lineNumber - 1];
                    
                    // Check if clicking on a diff line (red or green)
                    if (clickedLine && (
                      clickedLine.trim().startsWith('%%') || 
                      isNewContentLine(clickedLine, lineNumber - 1, lines)
                    )) {
                      handleLineClick(lineNumber);
                    }
                  }
                });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                readOnly: editorState.showInlineChanges, // Make read-only when showing changes
                selectOnLineNumbers: false, // Disable line number selection in diff mode
                selectionHighlight: !editorState.showInlineChanges, // Disable selection highlight in diff mode
              }}
            />
            
            {/* Inline Accept/Reject Controls */}
            {editorState.showInlineChanges && (
              <div className="absolute top-4 right-4 flex flex-col items-end space-y-2 z-10">
                <div className="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
                  💡 Click red lines to reject • Click green lines to accept
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRejectChanges}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={handleAcceptChanges}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Accept All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Section - 25% height */}
      <div className="flex-1 border-t border-gray-600/20" style={{ height: '25%', backgroundColor: '#0A0A0A' }}>
        <div className="h-full flex flex-col">
          <div className="border-b border-gray-600/20 px-4 py-2" style={{ backgroundColor: '#0A0A0A' }}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">
                Compilation Log
                {compileLog && (
                  compileLog.toLowerCase().includes('error') || 
                  compileLog.toLowerCase().includes('warning') || 
                  compileLog.toLowerCase().includes('failed')
                ) && (
                  <span className="ml-2 text-yellow-400 text-xs">⚠️</span>
                )}
              </h4>
              {compileLog && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(compileLog);
                      // Brief visual feedback
                      const button = document.activeElement as HTMLButtonElement;
                      if (button) {
                        const originalText = button.textContent;
                        button.textContent = 'Copied!';
                        setTimeout(() => {
                          button.textContent = originalText;
                        }, 1000);
                      }
                    }}
                    className="text-gray-400 hover:text-white transition-colors text-xs px-2 py-1 rounded border border-gray-600/30 hover:border-gray-500/50"
                    title="Copy log to clipboard"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setCompileLog('')}
                    className="text-gray-400 hover:text-white transition-colors text-xs"
                    title="Clear log"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {compileLog ? (
                              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap leading-relaxed log-text">
                  {compileLog}
                </pre>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#2A2A2A' }}>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500">No compilation log yet</p>
                  <p className="text-xs text-gray-600">Compile your LaTeX to see logs here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Create the AI chat content
  const aiChatContent = resumeId ? (
    <AIChat 
      ref={aiChatRef}
      resumeId={resumeId}
    />
  ) : (
    <div className="flex h-full items-center justify-center p-4 text-center text-gray-400">
      Save a new resume to enable AI Chat.
    </div>
  );

  return (
    <>
      {/* CSS for clean diff highlighting */}
      <style>
        {`
          .diff-line-red {
            background-color: rgba(239, 68, 68, 0.15) !important;
            color: #ef4444 !important;
            text-decoration: line-through !important;
            border-left: 3px solid #ef4444 !important;
            opacity: 0.8 !important;
            cursor: pointer !important;
          }
          .diff-line-red:hover {
            background-color: rgba(239, 68, 68, 0.25) !important;
          }
          .diff-line-green {
            background-color: rgba(34, 197, 94, 0.15) !important;
            color: #22c55e !important;
            border-left: 3px solid #22c55e !important;
            font-weight: 500 !important;
            cursor: pointer !important;
          }
          .diff-line-green:hover {
            background-color: rgba(34, 197, 94, 0.25) !important;
          }
        `}
      </style>
    <div className="h-screen text-white flex flex-col" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <div className="backdrop-blur-xl border-b border-gray-600/20 sticky top-0 z-50" style={{ backgroundColor: '#000000' }}>
        <div className="px-6 py-2">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center space-x-6">
              <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <Logo size="md" />
              </Link>
              
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={editorState.resumeTitle}
                  onChange={(e) => editorState.updateResumeTitle(e.target.value)}
                  className="border border-gray-600/30 rounded-3xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-gray-500/50 focus:border-gray-500/50 transition-all title-text"
                  style={{ backgroundColor: '#151515' }}
                  placeholder="Resume title..."
                />
                {/* Save status indicator */}
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  {editorState.isSaving ? (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span>Saving...</span>
                    </>
                  ) : editorState.lastSaved ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Saved {formatTime(editorState.lastSaved)}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span>Not saved</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Center buttons */}
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowJobForm(!showJobForm)}
                className="text-white px-4 py-2 rounded-3xl transition-all text-sm font-medium flex items-center space-x-2 hover:opacity-90"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>AI Tailor</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={compileLatex}
                disabled={isCompiling || !editorState.currentLatex.trim()}
                className="text-white px-4 py-2 rounded-3xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center space-x-2"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                {isCompiling ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span>{isCompiling ? 'Compiling...' : 'Compile PDF'}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={downloadPDF}
                disabled={isDownloading || !pdfUrl}
                className="text-white px-4 py-2 rounded-3xl transition-all text-sm font-medium flex items-center space-x-2 hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                {isDownloading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2-7h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h3" />
                  </svg>
                )}
                <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
              </motion.button>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm full-name-text">{user?.full_name}</span>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Job Description Modal */}
      {showJobForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="border border-gray-600/20 rounded-3xl p-8 max-w-2xl w-full"
            style={{ backgroundColor: '#0A0A0A' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">AI Resume Tailoring</h3>
              <button
                onClick={() => setShowJobForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Job Description
                </label>
                <textarea
                  value={editorState.jobDescription}
                  onChange={(e) => editorState.updateJobDescription(e.target.value)}
                  className="w-full h-32 border border-gray-600/30 rounded-3xl px-4 py-3 text-white resize-none focus:outline-none focus:ring-1 focus:ring-gray-500/50 focus:border-gray-500/50 transition-all"
                  style={{ backgroundColor: '#151515' }}
                  placeholder="Paste the job description here to tailor your resume content..."
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowJobForm(false)}
                  className="text-white px-6 py-2 rounded-3xl transition-all hover:opacity-90"
                  style={{ backgroundColor: '#2A2A2A' }}
                >
                  Cancel
                </button>
                <button
                  onClick={generateWithAI}
                  disabled={!editorState.jobDescription.trim() || isCompiling}
                  className="text-white px-6 py-2 rounded-3xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  style={{ backgroundColor: '#2A2A2A' }}
                >
                  Start Tailoring
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Main Content - Three Panel Layout: LaTeX | AI Chat | PDF */}
      <div className="flex-1 overflow-hidden">
        <ThreePanelSplitter
          leftContent={latexEditorContent}
          centerContent={aiChatContent}
          rightContent={
            <div className="h-full" style={{ backgroundColor: '#0A0A0A' }}>
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#2A2A2A' }}>
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No PDF Generated</h3>
                    <p className="text-gray-500 mb-6">Compile your LaTeX code to see the PDF preview</p>
                    <button
                      onClick={compileLatex}
                      disabled={isCompiling || !editorState.currentLatex.trim()}
                      className="text-white px-6 py-3 rounded-3xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                      style={{ backgroundColor: '#2A2A2A' }}
                    >
                      {isCompiling ? 'Compiling...' : 'Compile PDF'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          }
          initialLeftWidth={30}
          initialCenterWidth={33}
          minLeftWidth={20}
          minCenterWidth={15}
          minRightWidth={20}
        />
      </div>


    </div>
    </>
  );
};

export default LaTeXEditor; 