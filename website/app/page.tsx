'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Sun, Moon, Send, User, Bot, AlertTriangle, Clock, Heart, Shield, ExternalLink, Loader2, Activity, Stethoscope, FileText } from 'lucide-react';
import MedicalChatbotService from '@/app/api/backend';
import type { MedicalResponse, MedicalMessage, SymptomAnalysis, MedicalSource } from '@/app/api/backend';

const MedicalChatbot = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [messages, setMessages] = useState<MedicalMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [medicalService, setMedicalService] = useState<MedicalChatbotService | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<SymptomAnalysis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const lightTheme = {
    bg: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
    cardBg: 'bg-white/70 backdrop-blur-lg',
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600',
    secondary: 'bg-gradient-to-r from-purple-500 to-pink-500',
    accent: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    text: 'text-slate-800',
    textSecondary: 'text-slate-600',
    border: 'border-white/20',
    shadow: 'shadow-lg shadow-blue-500/10',
    headerBg: 'bg-white/80 backdrop-blur-md',
    footerBg: 'bg-white/60 backdrop-blur-md'
  };

  const darkTheme = {
    bg: 'bg-gradient-to-br from-black via-gray-900 to-slate-900',
    cardBg: 'bg-gray-900/80 backdrop-blur-lg border-gray-700/50',
    primary: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600',
    secondary: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600',
    accent: 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    border: 'border-gray-700/50',
    shadow: 'shadow-2xl shadow-purple-500/20',
    headerBg: 'bg-black/80 backdrop-blur-md border-gray-800/50',
    footerBg: 'bg-black/60 backdrop-blur-md border-gray-800/50'
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Initialize service
  useEffect(() => {
    const service = new MedicalChatbotService(
      process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
      process.env.NEXT_PUBLIC_RAPID_API_KEY || ''
    );
    setMedicalService(service);
    
    // Add initial greeting
    const greeting: MedicalMessage = {
      role: 'assistant',
      content: service.getMedicalGreeting(),
      timestamp: Date.now()
    };
    setMessages([greeting]);
  }, []);

  // Improved auto-scroll to bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // Only scroll if user hasn't manually scrolled up
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [messages]);

  // Scroll animation hook
  const useScrollAnimation = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });
    return [ref, isInView];
  };

  // Animation variants (same as your original)
  const slideInLeft = {
    hidden: { x: -100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const slideInRight = {
    hidden: { x: 100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const slideInUp = {
    hidden: { y: 100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const slideInDown = {
    hidden: { y: -100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const fadeInScale = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const handleThemeToggle = () => {
    setIsToggling(true);
    setTimeout(() => {
      setIsDarkMode(!isDarkMode);
    }, 300);
    setTimeout(() => {
      setIsToggling(false);
    }, 800);
  };

  const getUrgencyColor = (urgency: string) => {
    if (isDarkMode) {
      switch (urgency) {
        case 'emergency': return 'bg-red-900/50 border-red-400 text-red-200';
        case 'high': return 'bg-orange-900/50 border-orange-400 text-orange-200';
        case 'moderate': return 'bg-yellow-900/50 border-yellow-400 text-yellow-200';
        case 'low': return 'bg-green-900/50 border-green-400 text-green-200';
        default: return 'bg-gray-900/50 border-gray-400 text-gray-200';
      }
    } else {
      switch (urgency) {
        case 'emergency': return 'bg-red-100 border-red-500 text-red-800';
        case 'high': return 'bg-orange-100 border-orange-500 text-orange-800';
        case 'moderate': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
        case 'low': return 'bg-green-100 border-green-500 text-green-800';
        default: return 'bg-gray-100 border-gray-500 text-gray-800';
      }
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <Clock className="w-4 h-4" />;
      case 'moderate': return <Heart className="w-4 h-4" />;
      case 'low': return <Shield className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !medicalService || isLoading) return;
    processMessage();
  };

  const processMessage = async () => {
    if (!medicalService) return;

    const userMessage: MedicalMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Check if it's general medical chat
      if (medicalService.isGeneralMedicalChat(currentInput)) {
        const chatResponse = medicalService.handleGeneralMedicalChat(currentInput);
        const assistantMessage: MedicalMessage = {
          role: 'assistant',
          content: chatResponse,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }

      // Process medical query
      const response: MedicalResponse = await medicalService.processMedicalQuery(currentInput, messages);
      
      // Set current analysis for display
      setCurrentAnalysis(response.analysis);

      // Create assistant response - use formattedResponse to avoid JSON output
      const assistantMessage: MedicalMessage = {
        role: 'assistant',
        content: response.formattedResponse || response.detailedExplanation,
        timestamp: Date.now(),
        sources: response.sources
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: MedicalMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or consult a healthcare provider if you have urgent medical concerns.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  
  // Get refs for scroll animations
  const [heroRef, heroInView] = useScrollAnimation();
  const [featuresRef, featuresInView] = useScrollAnimation();

  return (
    <div className={`min-h-screen ${theme.bg} transition-all duration-700 relative overflow-hidden`}>
      {/* Theme Toggle Overlay */}
      <AnimatePresence>
        {isToggling && (
          <motion.div
            className={`fixed inset-0 z-[100] ${isDarkMode ? 'bg-black' : 'bg-white'}`}
            initial={{ clipPath: 'circle(0% at 100% 0%)' }}
            animate={{ clipPath: 'circle(150% at 100% 0%)' }}
            exit={{ clipPath: 'circle(0% at 100% 0%)' }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header 
        className={`${theme.headerBg} ${theme.border} border-b sticky top-0 z-50`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-2 sm:space-x-3"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 ${theme.primary} rounded-lg flex items-center justify-center`}>
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>MedAssist</h1>
            </motion.div>
            
            <motion.button
              onClick={handleThemeToggle}
              className={`p-2 rounded-full ${theme.cardBg} ${theme.border} border hover:scale-110 transition-all duration-300 ${theme.shadow}`}
              whileTap={{ scale: 0.9 }}
            >
              {isDarkMode ? 
                <Sun className={`w-4 h-4 sm:w-5 sm:h-5 ${theme.text}`} /> : 
                <Moon className={`w-4 h-4 sm:w-5 sm:h-5 ${theme.text}`} />
              }
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <motion.main 
        className="container mx-auto px-4 sm:px-6 py-8 sm:py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div 
          ref={heroRef}
          className="text-center mb-8 sm:mb-12"
          variants={staggerContainer}
          initial="hidden"
          animate={heroInView ? "visible" : "hidden"}
        >
          <motion.h2 
            className={`text-3xl sm:text-4xl md:text-5xl font-bold ${theme.text} mb-4 sm:mb-6`}
            variants={slideInDown}
          >
            AI Medical Assistant
          </motion.h2>
          <motion.p 
            className={`text-lg sm:text-xl ${theme.textSecondary} mb-6 sm:mb-8 max-w-2xl mx-auto px-4`}
            variants={slideInUp}
          >
            Get instant symptom analysis, health guidance, and medical information from our AI-powered assistant.
          </motion.p>
        </motion.div>

        {/* Chat Interface */}
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Chat Section */}
            <motion.div 
              className="flex-1 lg:flex-[2]"
              variants={slideInLeft}
              initial="hidden"
              animate="visible"
            >
              <div className={`${theme.cardBg} ${theme.border} border rounded-xl ${theme.shadow} flex flex-col`} style={{ height: '600px' }}>
                {/* Messages - Improved scroll container */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-400/50 scrollbar-track-transparent"
                >
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={`max-w-3xl flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                        <motion.div 
                          className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                            message.role === 'user' 
                              ? `${theme.primary} text-white` 
                              : `${theme.accent} text-white`
                          }`}
                          whileHover={{ scale: 1.1 }}
                        >
                          {message.role === 'user' ? <User className="w-4 h-4 sm:w-5 sm:h-5" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </motion.div>
                        <motion.div
                          className={`px-4 py-3 rounded-2xl ${
                            message.role === 'user'
                              ? `${theme.primary} text-white`
                              : `${theme.cardBg} ${theme.text} ${theme.border} border`
                          }`}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="whitespace-pre-wrap text-sm sm:text-base">
                            {message.content.split('\n').map((paragraph, i) => (
                              <p key={i} className="mb-2 last:mb-0">{paragraph}</p>
                            ))}
                          </div>
                          {message.sources && message.sources.length > 0 && (
                            <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                              <p className="text-sm font-medium mb-2">Medical Sources:</p>
                              <div className="space-y-1">
                                {message.sources.slice(0, 3).map((source: MedicalSource, idx: number) => (
                                  <a
                                    key={idx}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} hover:underline`}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    {source.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div 
                      className="flex justify-start"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="max-w-3xl flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full ${theme.accent} text-white flex items-center justify-center`}>
                          <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className={`px-4 py-3 rounded-2xl ${theme.cardBg} ${theme.text} ${theme.border} border`}>
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm sm:text-base">Analyzing symptoms...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <div className={`${theme.border} border-t p-4`}>
                  <form onSubmit={handleSubmit} className="flex space-x-4">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Describe your symptoms or ask a health question..."
                      className={`flex-1 px-4 py-3 ${theme.cardBg} ${theme.border} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.text} placeholder-gray-500`}
                      disabled={isLoading}
                    />
                    <motion.button
                      type="submit"
                      disabled={isLoading || !inputMessage.trim()}
                      className={`${theme.primary} text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${theme.shadow}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Send</span>
                    </motion.button>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* Analysis Panel */}
            <motion.div 
              className="w-full lg:w-80 space-y-4"
              variants={slideInRight}
              initial="hidden"
              animate="visible"
            >
              {currentAnalysis && (
                <>
                  {/* Urgency Level */}
                  <motion.div 
                    className={`${theme.cardBg} ${theme.border} border rounded-xl p-4 ${theme.shadow}`}
                    variants={fadeInScale}
                  >
                    <h3 className={`font-semibold ${theme.text} mb-3`}>Urgency Assessment</h3>
                    <div className={`p-3 rounded-lg border-2 ${getUrgencyColor(currentAnalysis.urgencyLevel)}`}>
                      <div className="flex items-center space-x-2">
                        {getUrgencyIcon(currentAnalysis.urgencyLevel)}
                        <span className="font-medium capitalize">{currentAnalysis.urgencyLevel}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Possible Conditions */}
                  <motion.div 
                    className={`${theme.cardBg} ${theme.border} border rounded-xl p-4 ${theme.shadow}`}
                    variants={fadeInScale}
                  >
                    <h3 className={`font-semibold ${theme.text} mb-3`}>Possible Conditions</h3>
                    <div className="space-y-2">
                      {currentAnalysis.possibleConditions.map((condition, index) => (
                        <motion.div 
                          key={index} 
                          className={`p-2 ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-50'} rounded-lg text-sm ${theme.text}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          {condition}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Recommended Action */}
                  <motion.div 
                    className={`${theme.cardBg} ${theme.border} border rounded-xl p-4 ${theme.shadow}`}
                    variants={fadeInScale}
                  >
                    <h3 className={`font-semibold ${theme.text} mb-3`}>Recommended Action</h3>
                    <p className={`text-sm ${theme.text} ${isDarkMode ? 'bg-yellow-900/50' : 'bg-yellow-50'} p-3 rounded-lg`}>
                      {currentAnalysis.recommendedAction}
                    </p>
                  </motion.div>

                  {/* Home Remedies */}
                  {currentAnalysis.homeRemedies.length > 0 && (
                    <motion.div 
                      className={`${theme.cardBg} ${theme.border} border rounded-xl p-4 ${theme.shadow}`}
                      variants={fadeInScale}
                    >
                      <h3 className={`font-semibold ${theme.text} mb-3`}>Home Remedies</h3>
                      <div className="space-y-2">
                        {currentAnalysis.homeRemedies.map((remedy, index) => (
                          <motion.div 
                            key={index} 
                            className={`p-2 ${isDarkMode ? 'bg-green-900/50' : 'bg-green-50'} rounded-lg text-sm ${theme.text}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            • {remedy}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* When to See Doctor */}
                  <motion.div 
                    className={`${theme.cardBg} ${theme.border} border rounded-xl p-4 ${theme.shadow}`}
                    variants={fadeInScale}
                  >
                    <h3 className={`font-semibold ${theme.text} mb-3`}>When to See a Doctor</h3>
                    <div className="space-y-2">
                      {currentAnalysis.whenToSeeDoctor.map((indicator, index) => (
                        <motion.div 
                          key={index} 
                          className={`p-2 ${isDarkMode ? 'bg-red-900/50' : 'bg-red-50'} rounded-lg text-sm ${theme.text}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          • {indicator}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}

              {/* Disclaimer */}
              <motion.div 
                className={`${theme.cardBg} ${theme.border} border rounded-xl p-4 border-l-4 ${isDarkMode ? 'border-l-amber-400' : 'border-l-amber-500'} ${theme.shadow}`}
                variants={fadeInScale}
              >
                <div className="flex items-start space-x-2">
                  <AlertTriangle className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-500'} mt-0.5`} />
                  <div>
                    <h4 className={`font-semibold ${theme.text} mb-1`}>Important Disclaimer</h4>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      This tool provides information for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Features Grid */}
        <motion.div 
          ref={featuresRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto px-4 mt-12"
          variants={staggerContainer}
          initial="hidden"
          animate={featuresInView ? "visible" : "hidden"}
        >
          {[
            {
              icon: <Stethoscope className="w-6 h-6 sm:w-8 sm:h-8" />,
              title: "Symptom Analysis",
              description: "AI-powered analysis of your symptoms with detailed explanations",
              gradient: isDarkMode ? "from-blue-400 to-purple-500" : "from-blue-500 to-purple-600",
              direction: slideInLeft
            },
            {
              icon: <Activity className="w-6 h-6 sm:w-8 sm:h-8" />,
              title: "Health Monitoring",
              description: "Track your health status and get personalized recommendations",
              gradient: isDarkMode ? "from-green-400 to-teal-500" : "from-green-500 to-teal-600",
              direction: slideInUp
            },
            {
              icon: <FileText className="w-6 h-6 sm:w-8 sm:h-8" />,
              title: "Medical Resources",
              description: "Access to verified medical information and trusted sources",
              gradient: isDarkMode ? "from-yellow-400 to-orange-500" : "from-orange-500 to-red-500",
              direction: slideInRight
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              className={`${theme.cardBg} ${theme.border} border rounded-xl p-4 sm:p-6 hover:scale-105 transition-all duration-300 ${theme.shadow}`}
              variants={feature.direction}
              whileHover={{ y: -5 }}
            >
              <div className={`bg-gradient-to-r ${feature.gradient} w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center mb-3 sm:mb-4`}>
                <div className="text-white">
                  {feature.icon}
                </div>
              </div>
              <h4 className={`text-lg sm:text-xl font-bold ${theme.text} mb-2`}>
                {feature.title}
              </h4>
              <p className={`${theme.textSecondary} text-sm sm:text-base`}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.main>

      {/* Footer */}
      <motion.footer 
        className={`${theme.footerBg} ${theme.border} border-t mt-12 sm:mt-16 py-6 sm:py-8`}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <p className={`${theme.textSecondary} text-sm sm:text-base`}>
            © 2025 MedAssist. AI-powered medical assistance for better health decisions.
          </p>
        </div>
      </motion.footer>
    </div>
  );
};

export default MedicalChatbot;