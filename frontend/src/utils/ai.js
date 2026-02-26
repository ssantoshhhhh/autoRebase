const LANGUAGE_MAP = {
  'en': 'English',
  'hi': 'Hindi',
  'ta': 'Tamil',
  'te': 'Telugu',
  'kn': 'Kannada',
  'mr': 'Marathi',
  'bn': 'Bengali',
  'gu': 'Gujarati',
  'ml': 'Malayalam',
  'pa': 'Punjabi'
};

const FALLBACK_MESSAGES = {
  'en': (text) => `Thinking disabled (API Error). You said: "${text}"`,
  'hi': (text) => `संपर्क टूटना (API Error). आपने कहा: "${text}"`,
  'ta': (text) => `சிந்தனை முடக்கப்பட்டுள்ளது (API Error). நீங்கள் சொன்னது: "${text}"`,
  'te': (text) => `ఆలోచన నిలిపివేయబడింది (API Error). మీరు చెప్పింది: "${text}"`,
  'kn': (text) => `ಚಿಂತನೆ ನಿಷ್ಕ್ರಿಯಗೊಂಡಿದೆ (API Error). ನೀವು ಹೇಳಿದ್ದು: "${text}"`,
  'mr': (text) => `विचार करणे अक्षम केले आहे (API Error). आपण म्हणालात: "${text}"`,
  'bn': (text) => `চিন্তা করা অক্ষম করা হয়েছে (API Error). আপনি বলেছেন: "${text}"`,
  'gu': (text) => `વિચારણા અક્ષમ છે (API Error). તમે કહ્યું: "${text}"`,
  'ml': (text) => `ചിന്ത അപ്രാപ്തമാക്കി (API Error). നിങ്ങൾ പറഞ്ഞു: "${text}"`,
  'pa': (text) => `ਸੋਚਣਾ ਅਸਮਰੱਥ ਹੈ (API Error). ਤੁਸੀਂ ਕਿਹਾ: "${text}"`,
};

export const getAIResponse = async (text, languageCode, context = {}) => {
  const languageName = LANGUAGE_MAP[languageCode] || languageCode;
  const fallbackFn = FALLBACK_MESSAGES[languageCode] || FALLBACK_MESSAGES['en'];

  const azureEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
  const azureApiKey = import.meta.env.VITE_AZURE_OPENAI_KEY;
  const deploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'sih-vision';

  if (!azureEndpoint || !azureApiKey) {
    console.error("Azure OpenAI credentials missing");
    return fallbackFn(text).replace("(API Error)", "(Missing Credentials)");
  }

  // Construct the correct chat completion URL for Azure
  let url = azureEndpoint;
  if (!url.includes('/openai/deployments')) {
     url = `${azureEndpoint.replace(/\/$/, '')}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;
  }

  // Build the system greeting context
  let contextStr = "You are REVA, a compassionate AI Police Assistant for India.";
  if (context.userName) contextStr += ` You are speaking to ${context.userName}.`;
  if (context.location) contextStr += ` The user is currently in ${context.location}.`;
  if (context.mobile) contextStr += ` Their verified mobile is ${context.mobile}.`;
  
  contextStr += ` You MUST reply ONLY in ${languageName}. Keep responses short, concise, and natural for voice synthesis. 
  Ask follow up questions one by one to gather complaint details: 1. Incident Type, 2. Location, 3. Description, 4. Date/Time.
  
  When you have gathered ALL the details, you must conclude by saying something like "Thank you, I am now filing your complaint." and you MUST append a JSON block at the very end like this:
  [[SUBMIT: {"incidentType": "...", "location": "...", "description": "...", "dateTime": "..."}]]`;


  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureApiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: contextStr },
          ...(context.history || []),
          { role: 'user', content: text }
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API Error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("AI Error:", error);
    return fallbackFn(text);
  }
};
