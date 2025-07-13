import axios from 'axios';

export interface MedicalSource {
  position: number;
  url: string;
  title: string;
  description: string;
  type: 'medical_journal' | 'health_website' | 'government_health' | 'medical_blog' | 'general';
}

export interface SymptomAnalysis {
  possibleConditions: string[];
  urgencyLevel: 'low' | 'moderate' | 'high' | 'emergency';
  recommendedAction: string;
  homeRemedies: string[];
  whenToSeeDoctor: string[];
  disclaimer: string;
}

export interface MedicalResponse {
  analysis: SymptomAnalysis;
  detailedExplanation: string;
  sources: MedicalSource[];
  relatedTopics: string[];
  conversationContext: string;
  formattedResponse: string; // Add this for better display
}

export interface MedicalMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  symptoms?: string[];
  sources?: MedicalSource[];
}

class MedicalChatbotService {
  private groqApiKey: string;
  private rapidApiKey: string;
  private groqBaseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private googleSearchUrl = 'https://google-search74.p.rapidapi.com/';

  // Medical keywords for better search targeting
  private medicalKeywords = [
    'symptoms', 'treatment', 'cure', 'medicine', 'health', 'medical',
    'doctor', 'hospital', 'remedies', 'disease', 'condition', 'diagnosis'
  ];

  // Trusted medical sources for prioritization
  private trustedMedicalSources = [
    'mayoclinic.org', 'webmd.com', 'healthline.com', 'medicalnewstoday.com',
    'nih.gov', 'cdc.gov', 'who.int', 'nhs.uk', 'clevelandclinic.org',
    'medscape.com', 'pubmed.ncbi.nlm.nih.gov'
  ];

  constructor(groqApiKey: string, rapidApiKey: string) {
    this.groqApiKey = groqApiKey;
    this.rapidApiKey = rapidApiKey;
  }

  /**
   * Extract symptoms from user input using pattern matching
   */
  private extractSymptoms(text: string): string[] {
    const symptoms: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Common symptom patterns
    const symptomPatterns = [
      /(?:i have|i'm having|experiencing|feeling|suffering from)\s+([^.!?]+)/gi,
      /(?:pain|ache|hurt|sore|tender)\s+(?:in|on|at)\s+([^.!?]+)/gi,
      /(?:headache|fever|cough|nausea|vomiting|diarrhea|fatigue|dizziness)/gi,
      /(?:can't|cannot|unable to)\s+([^.!?]+)/gi,
      /(?:swollen|inflamed|red|itchy|burning)\s+([^.!?]+)/gi
    ];

    symptomPatterns.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) {
        symptoms.push(...matches.map(match => match.trim()));
      }
    });

    return [...new Set(symptoms)]; // Remove duplicates
  }

  /**
   * Classify medical source type based on URL
   */
  private classifyMedicalSource(url: string): MedicalSource['type'] {
    const domain = url.toLowerCase();
    
    if (domain.includes('nih.gov') || domain.includes('cdc.gov') || 
        domain.includes('who.int') || domain.includes('nhs.uk')) {
      return 'government_health';
    }
    
    if (domain.includes('pubmed') || domain.includes('ncbi') || 
        domain.includes('nejm') || domain.includes('bmj')) {
      return 'medical_journal';
    }
    
    if (this.trustedMedicalSources.some(source => domain.includes(source))) {
      return 'health_website';
    }
    
    if (domain.includes('blog') || domain.includes('wordpress') || 
        domain.includes('medium')) {
      return 'medical_blog';
    }
    
    return 'general';
  }

  /**
   * Enhanced medical search with multiple targeted queries
   */
  private async searchMedicalInfo(symptoms: string[], userQuery: string): Promise<{results: MedicalSource[], relatedTopics: string[]}> {
    try {
      // Fix: Check if rapidApiKey is empty or undefined, not comparing to env var
      if (!this.rapidApiKey || this.rapidApiKey.trim() === '' || this.rapidApiKey === 'your-rapidapi-key-here') {
        console.error('RapidAPI key is not configured properly');
        return { results: [], relatedTopics: [] };
      }

      const searchQueries = [
        `${userQuery} symptoms causes treatment`,
        `${symptoms.join(' ')} medical condition diagnosis`,
        `${userQuery} home remedies natural treatment`,
        `${userQuery} when to see doctor emergency`,
        `${userQuery} medical advice health information`
      ];

      const allResults: MedicalSource[] = [];
      const relatedTopics: string[] = [];

      // Search with multiple queries for comprehensive results
      for (const query of searchQueries.slice(0, 3)) { // Limit to 3 searches
        const options = {
          method: 'GET',
          url: this.googleSearchUrl,
          params: {
            query: query,
            limit: '5',
            related_keywords: 'true'
          },
          headers: {
            'x-rapidapi-key': this.rapidApiKey,
            'x-rapidapi-host': 'google-search74.p.rapidapi.com'
          }
        };

        const response = await axios.request(options);
        const data = response.data;

        if (data.results && Array.isArray(data.results)) {
          const results = data.results.map((result: any, index: number) => ({
            position: result.position || index + 1,
            url: result.url || result.link || '#',
            title: result.title || 'No title',
            description: result.description || result.snippet || 'No description available',
            type: this.classifyMedicalSource(result.url || result.link || '')
          }));

          allResults.push(...results);
        }

        // Extract related topics
        if (data.related_keywords && Array.isArray(data.related_keywords)) {
          relatedTopics.push(...data.related_keywords.map((keyword: any) => 
            typeof keyword === 'string' ? keyword : keyword.keyword || keyword.text || ''
          ).filter((k: any) => k));
        }
      }

      // Sort results by source reliability
      const sourceReliability = {
        'government_health': 5,
        'medical_journal': 4,
        'health_website': 3,
        'medical_blog': 2,
        'general': 1
      };

      allResults.sort((a, b) => sourceReliability[b.type] - sourceReliability[a.type]);

      // Remove duplicates and limit results
      const uniqueResults = allResults.filter((result, index, self) => 
        index === self.findIndex(r => r.url === result.url)
      ).slice(0, 10);

      return { 
        results: uniqueResults, 
        relatedTopics: [...new Set(relatedTopics)].slice(0, 10) 
      };
    } catch (error: any) {
      console.error('Error searching medical information:', error);
      return { results: [], relatedTopics: [] };
    }
  }

  /**
   * Analyze symptoms and determine urgency level
   */
  private analyzeSymptomUrgency(symptoms: string[], userQuery: string): SymptomAnalysis['urgencyLevel'] {
    const emergencyKeywords = [
      'chest pain', 'difficulty breathing', 'severe headache', 'loss of consciousness',
      'severe bleeding', 'stroke', 'heart attack', 'suicide', 'overdose',
      'severe allergic reaction', 'anaphylaxis', 'severe burns', 'choking',
      'blood in vomit', 'blood in stool', 'vomiting blood', 'severe dizziness'
    ];

    const highUrgencyKeywords = [
      'high fever', 'severe pain', 'persistent vomiting', 'severe diarrhea',
      'difficulty swallowing', 'severe abdominal pain', 'vision problems',
      'numbness', 'seizure', 'fainting', 'blood', 'bleeding'
    ];

    const moderateUrgencyKeywords = [
      'fever', 'persistent cough', 'headache', 'nausea', 'vomiting',
      'diarrhea', 'fatigue', 'body aches', 'sore throat'
    ];

    const lowerQuery = userQuery.toLowerCase();
    
    if (emergencyKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'emergency';
    }
    
    if (highUrgencyKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'high';
    }
    
    if (moderateUrgencyKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'moderate';
    }
    
    return 'low';
  }

  /**
   * Generate comprehensive medical response using AI
   */
  private async generateMedicalResponse(
    userQuery: string,
    symptoms: string[],
    searchResults: MedicalSource[],
    urgencyLevel: SymptomAnalysis['urgencyLevel'],
    conversationHistory: MedicalMessage[] = []
  ): Promise<{ analysis: SymptomAnalysis; detailedExplanation: string; conversationContext: string }> {
    try {
      const searchContext = searchResults.map(result => 
        `Source: ${result.title} (${result.type})\nDescription: ${result.description}\nURL: ${result.url}`
      ).join('\n\n');

      const systemPrompt = `You are a medical information assistant designed to provide helpful, accurate, and safe medical guidance. You are NOT a replacement for professional medical care.

CRITICAL SAFETY GUIDELINES:
1. Always include appropriate medical disclaimers
2. Never diagnose specific medical conditions definitively
3. Always recommend consulting healthcare professionals for serious concerns
4. Provide balanced, evidence-based information
5. Suggest home remedies only for minor conditions
6. Be clear about when to seek immediate medical attention

Your task is to analyze the user's symptoms and provide:
1. Possible conditions (with appropriate uncertainty language)
2. Urgency assessment
3. Recommended actions
4. Safe home remedies (if appropriate)
5. Clear indicators for when to see a doctor

Context from previous conversation:
${conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Symptoms identified: ${symptoms.join(', ')}
Urgency level assessed: ${urgencyLevel}

Medical sources and information:
${searchContext}

User's query: ${userQuery}

Please provide a comprehensive but cautious response in JSON format with the following structure:
{
  "analysis": {
    "possibleConditions": ["condition1", "condition2"],
    "urgencyLevel": "${urgencyLevel}",
    "recommendedAction": "specific action recommendation",
    "homeRemedies": ["remedy1", "remedy2"],
    "whenToSeeDoctor": ["indicator1", "indicator2"],
    "disclaimer": "appropriate medical disclaimer"
  },
  "detailedExplanation": "detailed explanation of the analysis",
  "conversationContext": "brief summary of current conversation context"
}

Remember: Be helpful but never replace professional medical advice. Use phrases like "may indicate", "could be", "consider consulting" rather than definitive statements.`;

      // Fix: Check if groqApiKey is empty or undefined properly
      if (!this.groqApiKey || this.groqApiKey.trim() === '' || this.groqApiKey === 'your-groq-api-key-here') {
        throw new Error('Groq API key is not configured');
      }

      const response = await axios.post(
        this.groqBaseUrl,
        {
          model: 'llama3-70b-8192',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.3, // Lower temperature for more consistent medical advice
          max_tokens: 1200,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.groqApiKey}`,
          }
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content || '';
      
      // Try to parse JSON response
      try {
        const parsedResponse = JSON.parse(aiResponse);
        return {
          analysis: parsedResponse.analysis,
          detailedExplanation: parsedResponse.detailedExplanation,
          conversationContext: parsedResponse.conversationContext
        };
      } catch (err) {
        // If JSON parsing fails, create a structured response from the text
        return this.createFallbackResponse(userQuery, symptoms, urgencyLevel, aiResponse);
      }
    } catch (error: any) {
      console.error('Error generating medical response:', error);
      return this.createFallbackResponse(userQuery, symptoms, urgencyLevel);
    }
  }

  /**
   * Create fallback response when AI fails
   */
  private createFallbackResponse(
    userQuery: string, 
    symptoms: string[], 
    urgencyLevel: SymptomAnalysis['urgencyLevel'],
    aiResponse: string = ''
  ): { analysis: SymptomAnalysis; detailedExplanation: string; conversationContext: string } {
    const urgencyActions = {
      'emergency': 'Seek immediate emergency medical attention. Call emergency services or go to the nearest emergency room.',
      'high': 'Consult a healthcare provider within 24 hours or visit an urgent care center.',
      'moderate': 'Schedule an appointment with your healthcare provider within a few days.',
      'low': 'Monitor symptoms and consider consulting a healthcare provider if they persist or worsen.'
    };

    const analysis: SymptomAnalysis = {
      possibleConditions: ['Various conditions possible based on symptoms'],
      urgencyLevel: urgencyLevel,
      recommendedAction: urgencyActions[urgencyLevel],
      homeRemedies: urgencyLevel === 'low' ? [
        'Rest and hydration',
        'Over-the-counter pain relievers if appropriate',
        'Warm or cold compresses as needed'
      ] : [],
      whenToSeeDoctor: [
        'Symptoms worsen or persist',
        'New symptoms develop',
        'You feel concerned about your health'
      ],
      disclaimer: 'This information is for educational purposes only and should not replace professional medical advice. Always consult with a healthcare provider for proper diagnosis and treatment.'
    };

    return {
      analysis,
      detailedExplanation: aiResponse || `Based on the symptoms you've described, I recommend following the guidance above. The urgency level has been assessed as ${urgencyLevel}. Please remember that this is general information and not a substitute for professional medical evaluation.`,
      conversationContext: `User reported symptoms: ${symptoms.join(', ')}. Urgency assessed as ${urgencyLevel}.`
    };
  }

  /**
   * Format medical response for display
   */
  private formatMedicalResponse(response: MedicalResponse): string {
    const { analysis, detailedExplanation, sources } = response;
    
    let formattedResponse = `## Medical Information Analysis\n\n`;
    
    // Add urgency alert for high/emergency cases
    if (analysis.urgencyLevel === 'emergency' || analysis.urgencyLevel === 'high') {
      formattedResponse += `⚠️ **URGENT**: ${analysis.recommendedAction}\n\n`;
    }
    
    formattedResponse += `**Detailed Analysis:**\n${detailedExplanation}\n\n`;
    
    if (analysis.possibleConditions.length > 0) {
      formattedResponse += `**Possible Conditions to Consider:**\n`;
      analysis.possibleConditions.forEach(condition => {
        formattedResponse += `• ${condition}\n`;
      });
      formattedResponse += '\n';
    }
    
    formattedResponse += `**Recommended Action:**\n${analysis.recommendedAction}\n\n`;
    
    if (analysis.homeRemedies.length > 0) {
      formattedResponse += `**Home Care Suggestions:**\n`;
      analysis.homeRemedies.forEach(remedy => {
        formattedResponse += `• ${remedy}\n`;
      });
      formattedResponse += '\n';
    }
    
    if (analysis.whenToSeeDoctor.length > 0) {
      formattedResponse += `**When to Seek Medical Attention:**\n`;
      analysis.whenToSeeDoctor.forEach(indicator => {
        formattedResponse += `• ${indicator}\n`;
      });
      formattedResponse += '\n';
    }
    
    if (sources.length > 0) {
      formattedResponse += `**Medical Sources:**\n`;
      sources.slice(0, 3).forEach((source, index) => {
        const emoji = source.type === 'government_health' ? '🏛️' :
                     source.type === 'medical_journal' ? '📚' :
                     source.type === 'health_website' ? '🏥' : '🔍';
        formattedResponse += `${index + 1}. ${emoji} [${source.title}](${source.url})\n`;
      });
      formattedResponse += '\n';
    }
    
    formattedResponse += `**Important Disclaimer:**\n${analysis.disclaimer}`;
    
    return formattedResponse;
  }

  /**
   * Main method to process medical queries
   */
  async processMedicalQuery(
    userQuery: string,
    conversationHistory: MedicalMessage[] = []
  ): Promise<MedicalResponse> {
    try {
      // Extract symptoms from query
      const symptoms = this.extractSymptoms(userQuery);
      
      // Assess urgency level
      const urgencyLevel = this.analyzeSymptomUrgency(symptoms, userQuery);
      
      // Search for medical information
      const searchData = await this.searchMedicalInfo(symptoms, userQuery);
      
      // Generate AI response
      const aiResponse = await this.generateMedicalResponse(
        userQuery,
        symptoms,
        searchData.results,
        urgencyLevel,
        conversationHistory
      );

      const response: MedicalResponse = {
        analysis: aiResponse.analysis,
        detailedExplanation: aiResponse.detailedExplanation,
        sources: searchData.results,
        relatedTopics: searchData.relatedTopics,
        conversationContext: aiResponse.conversationContext,
        formattedResponse: '' // Will be set below
      };

      // Format the response for display
      response.formattedResponse = this.formatMedicalResponse(response);

      return response;
    } catch (error: any) {
      console.error('Error processing medical query:', error);
      
      // Emergency fallback response
      const fallbackResponse: MedicalResponse = {
        analysis: {
          possibleConditions: ['Unable to analyze at this time'],
          urgencyLevel: 'moderate',
          recommendedAction: 'Please consult with a healthcare provider for proper evaluation.',
          homeRemedies: [],
          whenToSeeDoctor: ['Any health concerns should be evaluated by a medical professional'],
          disclaimer: 'This system is currently experiencing technical difficulties. Please consult a healthcare provider for any medical concerns.'
        },
        detailedExplanation: 'I apologize, but I\'m unable to provide a detailed analysis at this time due to technical issues. Please consult with a healthcare provider for proper medical evaluation.',
        sources: [],
        relatedTopics: [],
        conversationContext: 'Technical error occurred during processing.',
        formattedResponse: ''
      };

      fallbackResponse.formattedResponse = this.formatMedicalResponse(fallbackResponse);
      return fallbackResponse;
    }
  }

  /**
   * Handle general medical conversation
   */
  isGeneralMedicalChat(query: string): boolean {
    const generalMedicalPatterns = [
      /^(hello|hi|hey).*doctor/i,
      /^(how are you|what's up)/i,
      /^(good morning|good afternoon|good evening)/i,
      /^(thank you|thanks)/i,
      /^(bye|goodbye|see you)/i,
      /^(what can you help|what do you do)/i
    ];
    
    return generalMedicalPatterns.some(pattern => pattern.test(query.trim()));
  }

  /**
   * Handle general medical chat responses
   */
  handleGeneralMedicalChat(query: string): string {
    if (/^(hello|hi|hey)/i.test(query)) {
      return 'Hello! I\'m a medical information assistant. I can help you understand symptoms and provide general health information. Please describe your symptoms or health concerns, and I\'ll do my best to provide helpful information. Remember, I\'m not a replacement for professional medical care.';
    }
    
    if (/^(thank you|thanks)/i.test(query)) {
      return 'You\'re welcome! I hope the information was helpful. Remember to consult with a healthcare provider for proper diagnosis and treatment. Is there anything else about your health you\'d like to discuss?';
    }
    
    if (/^(bye|goodbye|see you)/i.test(query)) {
      return 'Take care of your health! Remember to seek professional medical advice when needed. Feel free to return if you have any other health questions.';
    }
    
    if (/^(what can you help|what do you do)/i.test(query)) {
      return 'I can help you by:\n\n• Analyzing symptoms you describe\n• Providing information about possible conditions\n• Suggesting when to seek medical attention\n• Offering safe home remedies for minor issues\n• Explaining medical terms and conditions\n\nI always recommend consulting healthcare professionals for proper diagnosis and treatment. What health concern would you like to discuss?';
    }
    
    return 'I\'m here to help with your health questions. Please describe your symptoms or health concerns, and I\'ll provide information to help you understand them better. Remember, this is for informational purposes only and not a substitute for professional medical advice.';
  }

  /**
   * Get medical greeting
   */
  getMedicalGreeting(): string {
    return `Hello! I'm your medical information assistant. I can help you understand symptoms, provide general health information, and guide you on when to seek professional medical care.

**Important Disclaimer:** I provide information for educational purposes only and am not a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for medical concerns.

How can I help you today? Please describe your symptoms or health concerns.`;
  }

  /**
   * Validate medical API configuration
   */
  validateMedicalConfiguration(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.rapidApiKey || this.rapidApiKey.trim() === '' || this.rapidApiKey === 'your-rapidapi-key-here') {
      issues.push('RapidAPI key is not configured for medical search');
    }
    
    if (!this.groqApiKey || this.groqApiKey.trim() === '' || this.groqApiKey === 'your-groq-api-key-here') {
      issues.push('Groq API key is not configured for medical AI responses');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Format medical sources for display
   */
  formatMedicalSources(sources: MedicalSource[]): string {
    if (sources.length === 0) return 'No medical sources available.';
    
    return sources.map((source, index) => {
      const reliability = source.type === 'government_health' ? '🏛️' :
                         source.type === 'medical_journal' ? '📚' :
                         source.type === 'health_website' ? '🏥' :
                         source.type === 'medical_blog' ? '📝' : '🔍';
      
      return `${index + 1}. ${reliability} [${source.title}](${source.url})`;
    }).join('\n');
  }
}

export default MedicalChatbotService;