import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: {
    data: string;
    type: string;
    name: string;
  };
  pdf?: {
    data: string;
    name: string;
  };
}

interface AIChatProps {
  currentLatex: string;
  onLatexChange: (newLatex: string) => void;
  isLoading?: boolean;
  resumeId?: string;
  onPopulateInput?: (message: string) => void;
}

// Export the ref interface for parent to call methods
export interface AIChatRef {
  populateInput: (message: string) => void;
  focusInput: () => void;
  sendMessage: () => void;
}

const AIChat = forwardRef<AIChatRef, AIChatProps>(({ currentLatex, onLatexChange, resumeId }, ref) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Good to see you. How can I help you with your resume today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [templateContent, setTemplateContent] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('resume');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{data: string, type: string, name: string} | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<{data: string, name: string} | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (resumeId) {
      loadResumeTemplate();
      loadFormData();
    }
  }, [resumeId]);

  useEffect(() => {
    if (resumeId && templateName && formData && !sessionInitialized) {
      initializeSession();
    }
  }, [resumeId, templateName, formData, sessionInitialized]);

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, [sessionId]);

  // Initialize textarea height
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = '20px';
    }
  }, []);

  // Add clipboard paste support for images
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          event.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            // Convert to the same format as file upload
            const reader = new FileReader();
            reader.onload = () => {
              const base64Data = reader.result as string;
              const base64String = base64Data.split(',')[1];
              
              setSelectedImage({
                data: base64String,
                type: item.type.split('/')[1],
                name: `clipboard-image-${Date.now()}.${item.type.split('/')[1]}`
              });
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const loadFormData = async () => {
    if (!resumeId) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/resumes/${resumeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const resume = await response.json();
        setFormData(resume.resume_data);
        console.log('✅ FRONTEND: Loaded form data for session:', {
          resumeId,
          hasPersonalInfo: !!resume.resume_data?.personalInfo,
          hasExperience: !!resume.resume_data?.experience?.length,
          hasEducation: !!resume.resume_data?.education?.length
        });
      }
    } catch (error) {
      console.error('❌ Error loading form data:', error);
    }
  };

  const loadResumeTemplate = async () => {
    if (!resumeId) return;

    setTemplateLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      const resumeResponse = await fetch(`http://localhost:8000/api/resumes/${resumeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (resumeResponse.ok) {
        const resume = await resumeResponse.json();
        const resumeTemplateName = resume.template_name || 'professional_resume';
        setTemplateName(resumeTemplateName);

        const templateResponse = await fetch(`http://localhost:8000/api/templates/${resumeTemplateName}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (templateResponse.ok) {
          const templateData = await templateResponse.json();
          setTemplateContent(templateData.content || '');
          console.log('✅ FRONTEND: Loaded template for AI chat:', {
            templateName: resumeTemplateName,
            contentLength: templateData.content?.length || 0
          });
        } else {
          console.error('❌ Failed to load template content');
        }
      } else {
        console.error('❌ Failed to load resume data');
      }
    } catch (error) {
      console.error('❌ Error loading template:', error);
    } finally {
      setTemplateLoading(false);
    }
  };

  const initializeSession = async () => {
    if (!resumeId || !formData || sessionInitialized) return;

    // Immediately set flag to prevent duplicate calls
    setSessionInitialized(true);
    setTemplateLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      const sessionRequest = {
        resume_id: parseInt(resumeId),
        form_data: formData,
        template_name: templateName,
        job_description: null // Add job description later if needed
      };

      console.log('🚀 FRONTEND: Starting AI session:', {
        resumeId,
        templateName,
        hasFormData: !!formData,
        formDataKeys: Object.keys(formData || {}),
        // Detailed breakdown of all sections
        personalInfo: !!formData?.personalInfo,
        summary: !!formData?.summary,
        experience: formData?.experience?.length || 0,
        education: formData?.education?.length || 0,
        skills: formData?.skills?.length || 0,
        projects: formData?.projects?.length || 0,
        awards: formData?.awards?.length || 0,
        certifications: formData?.certifications?.length || 0,
        languages: formData?.languages?.length || 0,
        publications: formData?.publications?.length || 0,
        volunteering: formData?.volunteering?.length || 0,
        speaking: formData?.speaking?.length || 0,
        military: formData?.military?.length || 0,
        references: !!formData?.references,
        hobbies: formData?.hobbies?.length || 0,
        additional_sections: formData?.additional_sections?.length || 0
      });

      // Log the complete form data structure being sent
      console.log('📊 FRONTEND: Complete form data being sent to AI:', JSON.stringify(formData, null, 2));

      const response = await fetch('http://localhost:8000/api/ai/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(sessionRequest),
      });

      const result = await response.json();
      
      if (result.success && result.session_id) {
        setSessionId(result.session_id);
        
        console.log('✅ FRONTEND: Session initialized:', {
          sessionId: result.session_id,
          model: result.model_info?.model,
          contextCaching: result.model_info?.context_caching
        });

        // Session initialized successfully - no need to update the welcome message
      } else {
        console.error('❌ Failed to initialize session:', result);
        // Don't reset sessionInitialized to prevent infinite loop!
        // Keep it as true to prevent retries
        setMessages(prev => prev.map(msg => 
          msg.id === '1' ? {
            ...msg,
            content: `⚠️ Failed to start AI session (${response.status}). Using basic mode instead. Some features may be limited.`
          } : msg
        ));
      }
    } catch (error) {
      console.error('❌ Error initializing session:', error);
      // Don't reset sessionInitialized to prevent infinite loop!
      // Keep it as true to prevent retries
      setMessages(prev => prev.map(msg => 
        msg.id === '1' ? {
          ...msg,
          content: `⚠️ Network error initializing AI session. Using basic mode instead.`
        } : msg
      ));
    } finally {
      setTemplateLoading(false);
    }
  };

  const endSession = async () => {
    if (!sessionId) return;

    try {
      const token = localStorage.getItem('access_token');
      
      await fetch(`http://localhost:8000/api/ai/session/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('🔚 FRONTEND: Session ended:', sessionId);
    } catch (error) {
      console.error('❌ Error ending session:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (only images for image upload)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, or WEBP file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        const base64String = base64Data.split(',')[1]; // Remove data URL prefix
        
        const fileExtension = file.type.split('/')[1];
        setSelectedImage({
          data: base64String,
          type: fileExtension,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    }
  };

  const compileAndUploadCurrentPdf = async () => {
    if (!currentLatex.trim()) {
      alert('No LaTeX content to compile. Please write some LaTeX code first.');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      console.log('🔄 FRONTEND: Compiling LaTeX for AI analysis...', {
        latexLength: currentLatex.length
      });

      const response = await fetch('http://localhost:8000/api/latex/compile-for-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latex_content: currentLatex,
          compiler: 'pdflatex'
        }),
      });

      const result = await response.json();
      
      if (result.success && result.pdf_base64) {
        console.log('✅ FRONTEND: LaTeX compiled successfully for analysis', {
          pdfSize: result.pdf_base64.length,
          filename: result.filename
        });

        setSelectedPdf({
          data: result.pdf_base64,
          name: result.filename || 'current_resume.pdf'
        });
        
        console.log('📄 FRONTEND: PDF ready for AI analysis');
      } else {
        console.error('❌ FRONTEND: LaTeX compilation failed:', result.error);
        alert(`PDF compilation failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ FRONTEND: Error compiling LaTeX:', error);
      alert('Error compiling LaTeX. Please try again.');
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedPdf = () => {
    setSelectedPdf(null);
    // No file input to clear since we compile directly
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    // Check if session is initialized
    if (!sessionId || !sessionInitialized) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '⚠️ AI session not ready yet. Please wait for initialization to complete.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      image: selectedImage || undefined,
      pdf: selectedPdf || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    // Store attachment data for API call, then clear it
    const imageForAPI = selectedImage;
    const pdfForAPI = selectedPdf;
    setSelectedImage(null);
    setSelectedPdf(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // No PDF file input to clear since we compile directly

    try {
      const token = localStorage.getItem('access_token');
      
      console.log('💬 FRONTEND: Sending session-based chat message:', {
        sessionId,
        message: userMessage.content,
        hasImage: !!imageForAPI,
        hasPdf: !!pdfForAPI,
        currentLatexLength: currentLatex.length
      });

      const requestBody: any = {
        session_id: sessionId,
        message: userMessage.content,
        current_latex: currentLatex
      };

      // Add image data if present
      if (imageForAPI) {
        requestBody.image_data = imageForAPI.data;
        console.log('📸 FRONTEND: Sending image with session message:', {
          fileName: imageForAPI.name,
          fileType: imageForAPI.type,
          dataLength: imageForAPI.data.length
        });
      }

      // Add PDF data if present
      if (pdfForAPI) {
        requestBody.pdf_data = pdfForAPI.data;
        console.log('📄 FRONTEND: Sending PDF with session message:', {
          fileName: pdfForAPI.name,
          dataLength: pdfForAPI.data.length
        });
      }

      const response = await fetch('http://localhost:8000/api/ai/session/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('📨 FRONTEND: Received session response:', {
        success: result.success,
        hasResponse: !!result.response,
        hasModifiedLatex: !!result.modified_latex,
        sessionInfo: result.session_info
      });
          
      if (result.success && result.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: result.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Check for modified LaTeX
        if (result.modified_latex && result.modified_latex.trim() && result.modified_latex !== currentLatex) {
          console.log('✅ FRONTEND: Updating LaTeX editor with modified content');
          console.log('📄 FRONTEND: LaTeX comparison - Original length:', currentLatex.length, 'Modified length:', result.modified_latex.length);
          onLatexChange(result.modified_latex);
        } else if (result.modified_latex && result.modified_latex === currentLatex) {
          console.log('ℹ️ FRONTEND: Modified LaTeX is same as current LaTeX');
        } else {
          console.log('ℹ️ FRONTEND: No modified LaTeX in response');
        }
      } else {
        console.error('❌ FRONTEND: Session chat request failed:', result);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: result.error || 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('❌ FRONTEND: Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I couldn\'t connect to the AI service. Please check your connection and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    populateInput: (message: string) => {
      setInputValue(message);
      // Auto-resize after setting value
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          const scrollHeight = inputRef.current.scrollHeight;
          const minHeight = 20; // Minimal height when empty
          const maxHeight = 120; // ~5 rows maximum
          inputRef.current.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
        }
      }, 0);
    },
    focusInput: () => {
      inputRef.current?.focus();
    },
    sendMessage: () => {
      handleSendMessage();
    }
  }));

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0A0A0A' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(55, 65, 81, 0.1);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(107, 114, 128, 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(107, 114, 128, 0.5);
          }
        `
      }} />
      <div className="flex-shrink-0 px-4 py-2" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              templateLoading ? 'bg-yellow-500' : 
              sessionInitialized ? 'bg-green-500' : 
              'bg-red-500'
            }`}></div>
            <h3 className="text-sm font-medium text-white">ResumeAI</h3>
          </div>
          {templateName && (
            <span className="text-xs text-gray-400">
              {templateName}
            </span>
          )}
        </div>
        <div className="border-b border-gray-600/20 mt-2"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 ${
                  message.type === 'user'
                    ? 'text-white border border-gray-600/30 rounded-3xl'
                    : 'text-gray-100'
                }`}
                style={message.type === 'user' ? { backgroundColor: '#2A2A2A' } : {}}
              >
                {/* Show image if present */}
                {message.image && (
                  <div className="mb-3 max-w-xs">
                    <img 
                      src={`data:image/${message.image.type};base64,${message.image.data}`}
                      alt={message.image.name}
                      className="rounded-lg border border-gray-600/30 max-w-full h-auto"
                    />
                    <p className="text-xs text-gray-500 mt-1">{message.image.name}</p>
                  </div>
                )}

                {/* Show PDF if present */}
                {message.pdf && (
                  <div className="mb-3 p-3 bg-red-900/20 border border-red-600/30 rounded-lg max-w-xs">
                    <div className="flex items-center space-x-2">
                      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-sm text-white font-medium">{message.pdf.name}</p>
                        <p className="text-xs text-gray-400">PDF Document for Analysis</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                <div className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-300">AI is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="border-t border-gray-600/20 mx-4 mb-4"></div>
        
        {/* Image Upload Section */}
        {selectedImage && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src={`data:image/${selectedImage.type};base64,${selectedImage.data}`}
                  alt={selectedImage.name}
                  className="w-12 h-12 object-cover rounded border border-gray-600/30"
                />
                <div>
                  <p className="text-sm text-white font-medium">{selectedImage.name}</p>
                  <p className="text-xs text-gray-400">Ready to analyze with your message</p>
                </div>
              </div>
              <button
                onClick={removeSelectedImage}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* PDF Upload Section */}
        {selectedPdf && (
          <div className="mb-4 p-3 bg-red-900/20 rounded-lg border border-red-600/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 flex items-center justify-center bg-red-800/30 rounded border border-red-600/30">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{selectedPdf.name}</p>
                  <p className="text-xs text-gray-400">PDF ready for visual analysis</p>
                </div>
              </div>
              <button
                onClick={removeSelectedPdf}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Unified input container */}
        <div className="border border-gray-600/30 rounded-3xl" style={{ backgroundColor: '#151515' }}>
          {/* Top section - Expanding textarea */}
          <div className="px-4 pt-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                // Auto-resize based on content
                if (inputRef.current) {
                  inputRef.current.style.height = 'auto';
                  const scrollHeight = inputRef.current.scrollHeight;
                  const minHeight = 20; // Minimal height when empty
                  const maxHeight = 120; // ~5 rows maximum
                  inputRef.current.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
                }
              }}
              onKeyPress={handleKeyPress}
              placeholder={selectedImage || selectedPdf ? "Describe how to use this attachment..." : "Describe what you'd like to change about your resume..."}
              className="w-full resize-none bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none custom-scrollbar"
              style={{ 
                minHeight: '20px',
                maxHeight: '120px'
              }}
              disabled={isProcessing || templateLoading}
            />
          </div>
          
          {/* Bottom section - Fixed footer with buttons */}
          <div className="flex items-center justify-between px-2 pb-2">
            {/* Left side buttons */}
            <div className="flex items-center space-x-1">
              {/* Compile Current PDF Button */}
              <button
                onClick={compileAndUploadCurrentPdf}
                disabled={isProcessing || templateLoading || !currentLatex.trim()}
                className="w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center rounded-full"
                title="Compile current LaTeX as PDF for AI analysis"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              
              {/* Image Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || templateLoading}
                className="w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center rounded-full"
                title="Upload image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            {/* Right side - Send button */}
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing || templateLoading}
              className="w-8 h-8 bg-white text-black rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
        <div className="flex justify-end">
          <div className={`w-1 h-1 rounded-full ${templateLoading ? 'bg-yellow-500' : templateContent ? 'bg-green-500' : 'bg-gray-500'}`}></div>
        </div>
      </div>
    </div>
  );
});

AIChat.displayName = 'AIChat';

export default AIChat; 