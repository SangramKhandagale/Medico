"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, AlertTriangle, Clock, Heart, Shield, ExternalLink, Loader2, Settings } from 'lucide-react';
import MedicalChatbotService from '@/app/api/backend';
import type { MedicalResponse, MedicalMessage, SymptomAnalysis, MedicalSource } from '@/app/api/backend';

const MedicalChatbot = () => {
  const [messages, setMessages] = useState<MedicalMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [medicalService, setMedicalService] = useState<MedicalChatbotService | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    groqApiKey: process.env.NEXT_PUBLIC_CGROQ_API_KEY || '',
    rapidApiKey: process.env.NEXT_PUBLIC_RAPID_API_KEY || ''
  });
  const [currentAnalysis, setCurrentAnalysis] = useState<SymptomAnalysis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize service when API keys are provided
  useEffect(() => {
    if (apiKeys.groqApiKey && apiKeys.rapidApiKey) {
      const service = new MedicalChatbotService(apiKeys.groqApiKey, apiKeys.rapidApiKey);
      setMedicalService(service);
      setIsConfigured(true);
      
      // Add initial greeting
      const greeting: MedicalMessage = {
        role: 'assistant',
        content: service.getMedicalGreeting(),
        timestamp: Date.now()
      };
      setMessages([greeting]);
    }
  }, [apiKeys]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'bg-red-100 border-red-500 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'moderate': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'low': return 'bg-green-100 border-green-500 text-green-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
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

      // Create assistant response
      const assistantMessage: MedicalMessage = {
        role: 'assistant',
        content: response.detailedExplanation,
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

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate configuration
    if (!medicalService) {
      console.error('Medical service not initialized');
      return;
    }

    const validation = medicalService.validateMedicalConfiguration();
    if (!validation.isValid) {
      console.error('Configuration issues:', validation.issues);
      alert('Configuration issues: ' + validation.issues.join(', '));
      return;
    }

    setShowConfig(false);
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-blue-100 rounded-full p-3 inline-flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Medical Assistant</h1>
            <p className="text-gray-600">Configure your API keys to get started</p>
          </div>

          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Groq API Key
              </label>
              <input
                type="password"
                value={apiKeys.groqApiKey}
                onChange={(e) => setApiKeys(prev => ({ ...prev, groqApiKey: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Groq API key"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RapidAPI Key
              </label>
              <input
                type="password"
                value={apiKeys.rapidApiKey}
                onChange={(e) => setApiKeys(prev => ({ ...prev, rapidApiKey: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your RapidAPI key"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Initialize Medical Assistant
            </button>
          </form>

          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Disclaimer:</strong> This tool provides information for educational purposes only and is not a substitute for professional medical advice.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg mb-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 rounded-full p-3">
                <Heart className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Medical Assistant</h1>
                <p className="text-gray-600">AI-powered symptom analysis and health guidance</p>
              </div>
            </div>
            <button
              onClick={() => setShowConfig(true)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Chat Interface */}
          <div className="flex-1 bg-white rounded-2xl shadow-lg flex flex-col" style={{ height: '600px' }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                    }`}>
                      {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium mb-2">Medical Sources:</p>
                          <div className="space-y-1">
                            {message.sources.slice(0, 3).map((source: MedicalSource, idx: number) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                {source.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-3xl flex items-start space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-800">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing symptoms...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSubmit} className="flex space-x-4">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Describe your symptoms or ask a health question..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="w-80 space-y-4">
            {currentAnalysis && (
              <>
                {/* Urgency Level */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Urgency Assessment</h3>
                  <div className={`p-3 rounded-lg border-2 ${getUrgencyColor(currentAnalysis.urgencyLevel)}`}>
                    <div className="flex items-center space-x-2">
                      {getUrgencyIcon(currentAnalysis.urgencyLevel)}
                      <span className="font-medium capitalize">{currentAnalysis.urgencyLevel}</span>
                    </div>
                  </div>
                </div>

                {/* Possible Conditions */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Possible Conditions</h3>
                  <div className="space-y-2">
                    {currentAnalysis.possibleConditions.map((condition, index) => (
                      <div key={index} className="p-2 bg-blue-50 rounded-lg text-sm">
                        {condition}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Recommended Action</h3>
                  <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg">
                    {currentAnalysis.recommendedAction}
                  </p>
                </div>

                {/* Home Remedies */}
                {currentAnalysis.homeRemedies.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Home Remedies</h3>
                    <div className="space-y-2">
                      {currentAnalysis.homeRemedies.map((remedy, index) => (
                        <div key={index} className="p-2 bg-green-50 rounded-lg text-sm">
                          • {remedy}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* When to See Doctor */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">When to See a Doctor</h3>
                  <div className="space-y-2">
                    {currentAnalysis.whenToSeeDoctor.map((indicator, index) => (
                      <div key={index} className="p-2 bg-red-50 rounded-lg text-sm">
                        • {indicator}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Disclaimer */}
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-amber-500">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Important Disclaimer</h4>
                  <p className="text-xs text-gray-600">
                    This tool provides information for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4">API Configuration</h2>
            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Groq API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.groqApiKey}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, groqApiKey: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your Groq API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RapidAPI Key
                </label>
                <input
                  type="password"
                  value={apiKeys.rapidApiKey}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, rapidApiKey: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your RapidAPI key"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalChatbot;