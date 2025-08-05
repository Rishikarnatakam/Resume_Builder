import { logger } from '../utils/logger';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { useAuth } from '../hooks/useAuth';
import { useResume } from '../context/ResumeContext';
import { useEditorState } from '../hooks/useEditorState';
import { motion } from 'framer-motion';
import AIChat, { AIChatRef } from '../components/AIChat';
import ThreePanelSplitter from '../components/ThreePanelSplitter';
import { apiConfig, supabase } from '../config/api';
import Logo from '../components/Logo';
import { UserIcon } from '@heroicons/react/24/outline';

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
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  
  const editorRef = useRef<any>(null);
  const aiChatRef = useRef<AIChatRef>(null);
  const latestLatexContent = useRef(editorState.currentLatex);
  const isInitialMount = useRef(true);
  const decorations = useRef<string[]>([]);

  // State for diff mode
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffEditorInstance, setDiffEditorInstance] = useState<any>(null);

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
      logger.success('Save completed, triggering auto-compilation.');
      compileLatex();
    }
  }, [editorState.lastSaved]); // Intentionally not including compileLatex, see below

  // Auto-switch to diff mode when AI changes are available
  useEffect(() => {
    if (editorState.showInlineChanges && editorState.proposedLatex && editorState.proposedLatex !== editorState.originalLatex) {
      setIsDiffMode(true);
    } else if (!editorState.showInlineChanges) {
      setIsDiffMode(false);
    }
  }, [editorState.showInlineChanges, editorState.proposedLatex, editorState.originalLatex]);

  // Apply Monaco decorations when they change
  useEffect(() => {
    if (editorRef.current) {
      decorations.current = editorRef.current.deltaDecorations(
        decorations.current,
        editorState.editorDecorations
      );
    }
  }, [editorState.editorDecorations]);

  // Fetch AI message balance
  const fetchMessageBalance = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      const response = await fetch(`${apiConfig.baseUrl}/subscriptions/current-subscription`, {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const remaining = data.message_quota - data.messages_used;
        setMessagesRemaining(remaining);
      }
    } catch (error) {
              logger.error('Error fetching message balance', error);
    }
  };

  // Fetch message balance on mount
  useEffect(() => {
    fetchMessageBalance();
  }, []);

  // Refresh message balance after AI operations complete
  useEffect(() => {
    if (!editorState.aiOperationInProgress) {
      // Refresh message balance when AI operation completes
      fetchMessageBalance();
    }
  }, [editorState.aiOperationInProgress]);

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
            logger.info('Loaded existing PDF from browser storage');
          })
          .catch(error => {
            logger.error('Failed to load PDF from storage', error);
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
              logger.error("Error fetching resume", error);
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
      logger.compilationStart(contentToCompile.length);
      
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

      // Response status and headers logged for debugging
      
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
            
            logger.compilationSuccess(filename);
            logger.info('PDF filename', { filename });
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
        logger.compilationError(errorMessage);
        setCompileLog(`❌ Compilation failed: ${errorMessage}`);
        setPdfUrl('');
        
        // Clear any stored PDF
        if (resumeId) {
          const storageKey = `pdf_${resumeId}`;
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      logger.error('Compile error', error);
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

    // Simple prompt that leverages AI's already learned knowledge
    const tailoringPrompt = `JOB DESCRIPTION: ${editorState.jobDescription}

IMPORTANT: Before making any changes, carefully consider and apply:
- Template instructions and formatting rules you learned
- ATS guidelines for keyword optimization and achievement focus  
- Job tailoring guidelines for content enhancement
- User's formatting preferences and customizations
- Job Tailoring Guidelines

INSTRUCTIONS: Use the job tailoring guidelines, template instructions, and ATS guidelines you already learned in this session to tailor the resume for this specific job description. DO NOT add placeholders like [INSERT], [ADD], or [FILL] - provide actual content.

OUTPUT: Return ONLY the complete LaTeX code from \\documentclass{} to \\end{document}. No explanations or commentary.`;

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
      
      logger.success('PDF downloaded', { filename });
      
    } catch (error) {
              logger.error('Download failed', error);
      alert('Failed to download PDF. Please try compiling again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Remove unused function - AIChat now uses context directly

  // Diff creation is now handled by the context



  const handleRejectChanges = () => {
    editorState.rejectAIChanges();
    setIsDiffMode(false);
  };

  const handleAcceptChanges = () => {
    editorState.acceptAIChanges();
    setIsDiffMode(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (diffEditorInstance) {
        try {
          diffEditorInstance.dispose();
        } catch (error) {
          // Ignore disposal errors
        }
      }
    };
  }, [diffEditorInstance]);



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
            <div className="h-full w-full" style={{ display: isDiffMode && editorState.showInlineChanges && editorState.proposedLatex ? 'block' : 'none' }}>
              <DiffEditor
                key="diff-editor-stable"
                height="100%"
                language="latex"
                original={editorState.originalLatex}
                modified={editorState.proposedLatex}
                theme="vs-dark"
                onMount={(editor) => {
                  setDiffEditorInstance(editor);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  automaticLayout: true,
                  readOnly: true,
                  renderSideBySide: false,
                }}
              />
            </div>
            <div className="h-full w-full" style={{ display: !isDiffMode || !editorState.showInlineChanges || !editorState.proposedLatex ? 'block' : 'none' }}>
              <Editor
                height="100%"
                defaultLanguage="latex"
                value={editorState.currentLatex}
                onChange={(value) => editorState.updateLatexFromUser(value || '')}
                theme="vs-dark"
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  automaticLayout: true,
                  readOnly: editorState.showInlineChanges,
                }}
              />
            </div>
            
            {/* Inline Accept/Reject Controls */}
            {editorState.showInlineChanges && (
              <div className="absolute top-4 right-4 flex flex-col items-end space-y-2 z-10">
                <div className="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
                  {isDiffMode ? '💡 Review changes in diff view' : '💡 Click red lines to reject • Click green lines to accept'}
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
          /* Monaco Diff Editor handles all styling automatically */
          /* No custom CSS needed for diff highlighting */
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
            <div className="flex items-center space-x-6">
              <span className="flex items-center space-x-2 text-sm text-gray-400">
                <UserIcon className="w-4 h-4" />
                <span className="full-name-text hover:text-white transition-colors">{user?.full_name}</span>
              </span>
              {messagesRemaining !== null && (
                <span className={`text-base font-semibold ${messagesRemaining > 6 ? 'text-green-400' : messagesRemaining > 3 ? 'text-yellow-400' : 'text-red-400'}`}>AI messages left: {messagesRemaining}</span>
              )}
              <Link
                to="/billing"
                className="px-4 py-2 rounded-3xl text-sm transition-colors text-gray-400 hover:text-white"
                style={{ backgroundColor: '#000000' }}
                title="Go to Billing to buy more messages"
              >
                Billing
              </Link>
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