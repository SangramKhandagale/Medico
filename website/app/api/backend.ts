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
  formattedResponse: string;
}

export interface MedicalMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  symptoms?: string[];
  sources?: MedicalSource[];
}

interface SearchResult {
  position?: number;
  url?: string;
  link?: string;
  title?: string;
  description?: string;
  snippet?: string;
}

interface SearchResponse {
  results?: SearchResult[];
  related_keywords?: (string | { keyword?: string; text?: string })[];
}

class MedicalChatbotService {
  private groqApiKey: string;
  private rapidApiKey: string;
  private groqBaseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private googleSearchUrl = 'https://google-search74.p.rapidapi.com/';
  private lastSearchTime = 0;
  private searchCooldown = 2000; // 2 seconds between searches

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
    this.groqApiKey = groqApiKey || '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';
    this.rapidApiKey = rapidApiKey || '2ce562e37amshd20121dfa9b779dp1d6f56jsnbda5fe945ef1';
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
   * Enhanced medical search with better rate limiting and error handling
   */
  private async searchMedicalInfo(symptoms: string[], userQuery: string): Promise<{results: MedicalSource[], relatedTopics: string[]}> {
    try {
      // Implement rate limiting to avoid 429 errors
      const now = Date.now();
      const timeSinceLastSearch = now - this.lastSearchTime;
      
      if (timeSinceLastSearch < this.searchCooldown) {
        console.log('Rate limiting: Using fallback sources');
        return this.getFallbackMedicalSources(userQuery);
      }

      // Check if rapidApiKey is properly configured
      if (!this.rapidApiKey || this.rapidApiKey.trim() === '') {
        console.warn('RapidAPI key not configured, using fallback medical sources');
        return this.getFallbackMedicalSources(userQuery);
      }

      // Create a more targeted search query
      const searchQuery = `${userQuery} medical health symptoms treatment`.substring(0, 100);

      const options = {
        method: 'GET',
        url: this.googleSearchUrl,
        params: {
          query: searchQuery,
          limit: '5', // Reduced limit to avoid rate limits
          related_keywords: 'false' // Disable to reduce API calls
        },
        headers: {
          'x-rapidapi-key': this.rapidApiKey,
          'x-rapidapi-host': 'google-search74.p.rapidapi.com'
        },
        timeout: 8000 // Reduced timeout
      };

      this.lastSearchTime = now;
      const response = await axios.request(options);
      const data = response.data as SearchResponse;

      const results: MedicalSource[] = [];
      const relatedTopics: string[] = [];

      if (data.results && Array.isArray(data.results)) {
        const mappedResults = data.results.map((result: SearchResult, index: number) => ({
          position: result.position || index + 1,
          url: result.url || result.link || '#',
          title: result.title || 'Medical Information',
          description: result.description || result.snippet || 'Medical information and guidance',
          type: this.classifyMedicalSource(result.url || result.link || '')
        }));

        results.push(...mappedResults);
      }

      // Extract related topics from symptoms instead of API
      relatedTopics.push(...symptoms.map(symptom => `${symptom} treatment`));

      // Sort results by source reliability
      const sourceReliability = {
        'government_health': 5,
        'medical_journal': 4,
        'health_website': 3,
        'medical_blog': 2,
        'general': 1
      };

      results.sort((a, b) => sourceReliability[b.type] - sourceReliability[a.type]);

      // Remove duplicates and limit results
      const uniqueResults = results.filter((result, index, self) => 
        index === self.findIndex(r => r.url === result.url)
      ).slice(0, 5);

      return { 
        results: uniqueResults, 
        relatedTopics: [...new Set(relatedTopics)].slice(0, 5) 
      };
    } catch (error) {
      console.error('Error searching medical information:', error);
      
      // Always use fallback on any error to avoid breaking the app
      return this.getFallbackMedicalSources(userQuery);
    }
  }

  /**
   * Fallback medical sources when API fails
   */
  private getFallbackMedicalSources(_userQuery: string): {results: MedicalSource[], relatedTopics: string[]} {
    const fallbackSources: MedicalSource[] = [
      {
        position: 1,
        url: 'https://www.mayoclinic.org',
        title: 'Mayo Clinic - Medical Information',
        description: 'Comprehensive medical information and health resources',
        type: 'health_website'
      },
      {
        position: 2,
        url: 'https://www.webmd.com',
        title: 'WebMD - Health Information',
        description: 'Reliable health and medical information',
        type: 'health_website'
      },
      {
        position: 3,
        url: 'https://www.healthline.com',
        title: 'Healthline - Medical Knowledge',
        description: 'Evidence-based health information',
        type: 'health_website'
      },
      {
        position: 4,
        url: 'https://www.cdc.gov',
        title: 'CDC - Health Guidelines',
        description: 'Official health guidelines and information',
        type: 'government_health'
      },
      {
        position: 5,
        url: 'https://www.nih.gov',
        title: 'NIH - Medical Research',
        description: 'National Institutes of Health information',
        type: 'government_health'
      }
    ];

    const relatedTopics = [
      'medical symptoms',
      'health conditions',
      'treatment options',
      'medical advice',
      'health information'
    ];

    return { results: fallbackSources, relatedTopics };
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
      'diarrhea', 'fatigue', 'body aches', 'sore throat', 'dizzy', 'dizziness'
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
   * Generate comprehensive medical response using AI - FIXED TO AVOID JSON OUTPUT
   */
  private async generateMedicalResponse(
    userQuery: string,
    symptoms: string[],
    searchResults: MedicalSource[],
    urgencyLevel: SymptomAnalysis['urgencyLevel'],
    conversationHistory: MedicalMessage[] = []
  ): Promise<{ analysis: SymptomAnalysis; detailedExplanation: string; conversationContext: string }> {
    try {
      if (!this.groqApiKey || this.groqApiKey.trim() === '') {
        throw new Error('Groq API key is not configured');
      }

      const searchContext = searchResults.map(result => 
        `Source: ${result.title} (${result.type})\nDescription: ${result.description}\nURL: ${result.url}`
      ).join('\n\n');

      const systemPrompt = `You are a medical information assistant. Provide helpful, accurate medical guidance while being clear that you are NOT a replacement for professional medical care.

CRITICAL INSTRUCTIONS:
1. NEVER respond with JSON format
2. Always respond in natural, conversational language
3. Include appropriate medical disclaimers
4. Never diagnose definitively - use uncertain language like "may indicate", "could suggest", "might be related to"
5. Always recommend professional medical consultation for serious concerns

Context from previous conversation:
${conversationHistory.slice(-2).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Symptoms identified: ${symptoms.join(', ')}
Urgency level assessed: ${urgencyLevel}

Medical sources available:
${searchContext}

User's query: ${userQuery}

Please provide a comprehensive medical response that includes:
1. A detailed explanation of what the symptoms might indicate
2. Possible conditions (with appropriate uncertainty)
3. Recommended immediate actions
4. When to seek medical attention
5. Home care suggestions (if appropriate for the urgency level)

Remember: Use natural language, be conversational, and always include safety disclaimers. DO NOT use JSON format.`;

      const response = await axios.post(
        this.groqBaseUrl,
        {
          model: 'llama3-70b-8192',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.2, // Lower temperature for more consistent responses
          max_tokens: 1000,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.groqApiKey}`,
          },
          timeout: 25000
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content || '';
      
      // Parse the natural language response and structure it
      return this.parseNaturalLanguageResponse(userQuery, symptoms, urgencyLevel, aiResponse);
    } catch (error) {
      console.error('Error generating medical response:', error);
      return this.createFallbackResponse(userQuery, symptoms, urgencyLevel);
    }
  }

  /**
   * Parse natural language AI response into structured format
   */
  private parseNaturalLanguageResponse(
    userQuery: string, 
    symptoms: string[], 
    urgencyLevel: SymptomAnalysis['urgencyLevel'],
    aiResponse: string
  ): { analysis: SymptomAnalysis; detailedExplanation: string; conversationContext: string } {
    // Extract possible conditions from AI response
    const possibleConditions = this.extractConditionsFromText(aiResponse, symptoms);
    
    // Generate appropriate actions based on urgency
    const urgencyActions = {
      'emergency': 'Seek immediate emergency medical attention. Call emergency services or go to the nearest emergency room.',
      'high': 'Consult a healthcare provider within 24 hours or visit an urgent care center.',
      'moderate': 'Schedule an appointment with your healthcare provider within a few days.',
      'low': 'Monitor symptoms and consider consulting a healthcare provider if they persist or worsen.'
    };

    // Generate home remedies based on urgency and symptoms
    const homeRemedies = urgencyLevel === 'low' || urgencyLevel === 'moderate' ? 
      this.generateHomeRemedies(symptoms) : [];

    const analysis: SymptomAnalysis = {
      possibleConditions,
      urgencyLevel,
      recommendedAction: urgencyActions[urgencyLevel],
      homeRemedies,
      whenToSeeDoctor: [
        'Symptoms worsen or persist beyond expected timeframe',
        'New concerning symptoms develop',
        'You feel worried about your health',
        'Symptoms interfere with daily activities'
      ],
      disclaimer: 'This information is for educational purposes only and should not replace professional medical advice. Always consult with a healthcare provider for proper diagnosis and treatment.'
    };

    return {
      analysis,
      detailedExplanation: aiResponse,
      conversationContext: `User reported: ${symptoms.join(', ')}. Urgency: ${urgencyLevel}.`
    };
  }

  /**
   * Extract conditions from AI response text
   */
  private extractConditionsFromText(text: string, symptoms: string[]): string[] {
    const conditions: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Common condition patterns in AI responses
    const conditionPatterns = [
      /(?:could be|might be|may indicate|possibly|could suggest)\s+([^.!?]+)/gi,
      /(?:conditions like|such as|including)\s+([^.!?]+)/gi,
    ];

    conditionPatterns.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const condition = match.replace(/(could be|might be|may indicate|possibly|could suggest|conditions like|such as|including)/gi, '').trim();
          if (condition.length > 3 && condition.length < 50) {
            conditions.push(condition);
          }
        });
      }
    });

    // If no conditions found, generate based on symptoms
    if (conditions.length === 0) {
      conditions.push(...this.generateConditionsFromSymptoms(symptoms));
    }

    return [...new Set(conditions)].slice(0, 4); // Remove duplicates and limit
  }

  /**
   * Generate conditions based on symptoms
   */
  private generateConditionsFromSymptoms(symptoms: string[]): string[] {
    const conditions: string[] = [];
    const symptomsText = symptoms.join(' ').toLowerCase();
    
    if (symptomsText.includes('dizzy') || symptomsText.includes('dizziness')) {
      conditions.push('vertigo or balance disorder', 'inner ear infection', 'dehydration');
    }
    
    if (symptomsText.includes('vomit') || symptomsText.includes('nausea')) {
      conditions.push('gastroenteritis', 'food poisoning', 'viral infection');
    }
    
    if (symptomsText.includes('fever')) {
      conditions.push('viral infection', 'bacterial infection', 'flu');
    }
    
    if (symptomsText.includes('headache')) {
      conditions.push('tension headache', 'migraine', 'sinus infection');
    }
    
    // Default conditions if none match
    if (conditions.length === 0) {
      conditions.push('various conditions based on symptoms described');
    }
    
    return conditions;
  }

  /**
   * Generate home remedies based on symptoms
   */
  private generateHomeRemedies(symptoms: string[]): string[] {
    const remedies: string[] = [];
    const symptomsText = symptoms.join(' ').toLowerCase();
    
    if (symptomsText.includes('dizzy') || symptomsText.includes('dizziness')) {
      remedies.push('Rest and avoid sudden movements', 'Stay hydrated with water and electrolytes', 'Avoid driving or operating machinery');
    }
    
    if (symptomsText.includes('vomit') || symptomsText.includes('nausea')) {
      remedies.push('Sip clear fluids slowly', 'Try ginger tea or crackers', 'Rest and avoid solid foods temporarily');
    }
    
    // Default remedies
    if (remedies.length === 0) {
      remedies.push('Rest and stay hydrated', 'Monitor symptoms closely', 'Avoid strenuous activities');
    }
    
    return remedies;
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
      possibleConditions: this.generateConditionsFromSymptoms(symptoms),
      urgencyLevel: urgencyLevel,
      recommendedAction: urgencyActions[urgencyLevel],
      homeRemedies: urgencyLevel === 'low' || urgencyLevel === 'moderate' ? this.generateHomeRemedies(symptoms) : [],
      whenToSeeDoctor: [
        'Symptoms worsen or persist',
        'New concerning symptoms develop',
        'You feel worried about your health'
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
      
      // Search for medical information (with fallback handling)
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
        formattedResponse: ''
      };

      // Format the response for display
      response.formattedResponse = this.formatMedicalResponse(response);

      return response;
    } catch (error) {
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
    
    if (!this.rapidApiKey || this.rapidApiKey.trim() === '') {
      issues.push('RapidAPI key is not configured for medical search');
    }
    
    if (!this.groqApiKey || this.groqApiKey.trim() === '') {
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
