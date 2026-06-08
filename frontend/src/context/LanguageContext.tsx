import React, { createContext, useContext, useState } from 'react';

export type LanguageType = 'English' | 'Hindi' | 'Marathi' | 'Tamil' | 'Telugu' | 'Bengali';

interface LanguageContextProps {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string) => string;
}

const translations: Record<LanguageType, Record<string, string>> = {
  English: {
    appName: "DriveLegal",
    appSubtitle: "Know Your Rights, Respect the Roads",
    chatbot: "Traffic Law Chatbot",
    chatbotDesc: "Ask questions about traffic laws and get sourced, accurate answers.",
    stateRules: "State-Wise Rules",
    stateRulesDesc: "Find amendments, exceptions, and unique vehicle rules specific to each state.",
    challanCalc: "Challan Calculator",
    challanCalcDesc: "Check violation fine amounts and calculate your total outstanding fine live.",
    travelChecker: "Know Before You Go",
    travelCheckerDesc: "Enter your route cities to check crossed states speed limits and travel conflicts.",
    lawExplainer: "Plain Language Explainer",
    lawExplainerDesc: "Simplify complex, dense legal codes of the Motor Vehicles Act into plain English.",
    disclaimerTitle: "Disclaimer & Legal Notice",
    disclaimerText: "The simplified text provided by this tool is strictly for general legal awareness and information. It is not formal legal advice. In all legal matters, the original text of the Motor Vehicles Act or official state gazettes remains authoritative.",
    selectState: "Select State",
    selectVehicle: "Select Vehicle Type",
    motorcycle: "Two-Wheeler",
    car: "Four-Wheeler / Car",
    heavy: "Heavy Vehicle",
    allVehicles: "All Vehicle Types",
    calculate: "Calculate Total Fine",
    fromCity: "Source City (e.g. Bhopal)",
    toCity: "Destination City (e.g. Pune)",
    checkRoute: "Analyze Route Rules",
    originalText: "Original Legal Code",
    simplifiedText: "Simplified Explanation",
    enterLawText: "Paste a section of the Motor Vehicles Act here...",
    explainBtn: "Explain in Plain Language",
    askQuestion: "Ask a question about Indian traffic rules (e.g., helmet fine in MP)...",
    send: "Send",
    offlineBanner: "You are offline. Showing cached information. Offline features are limited to cached states.",
    conflictsFound: "Route Rule Conflicts Detected",
    receiptTitle: "ITEMIZED CHALLAN RECEIPT",
    totalFine: "Total Fine Amount",
    repeatOffense: "Repeat Offense?",
    firstOffense: "First Offense",
    sourceNotes: "Notes / Basis",
    documentsRequired: "Documents Required for Trip",
    stateSpeedLimits: "Speed Limits by State",
    specialRulesTitle: "Special State Guidelines",
    detectedLanguage: "Detected Language",
    chatModeSimple: "Simple Mode (Friendly)",
    chatModeLegal: "Legal Mode (Strict)"
  },
  Hindi: {
    appName: "ड्राइवलीगल (DriveLegal)",
    appSubtitle: "अपने अधिकारों को जानें, सड़कों का सम्मान करें",
    chatbot: "ट्रैफिक कानून चैटबॉट",
    chatbotDesc: "ट्रैफिक कानूनों के बारे में सवाल पूछें और सटीक, प्रमाणित उत्तर पाएं।",
    stateRules: "राज्य-वार नियम",
    stateRulesDesc: "हर राज्य के लिए विशिष्ट संशोधनों, अपवादों और अनोखे नियमों की जाँच करें।",
    challanCalc: "चालान कैलकुलेटर",
    challanCalcDesc: "उल्लंघन जुर्मानों की सूची देखें और लाइव कुल राशि की गणना करें।",
    travelChecker: "यात्रा से पहले जानें",
    travelCheckerDesc: "अपने मार्ग के शहरों को दर्ज कर गति सीमा और राज्यों के नियमों में अंतर देखें।",
    lawExplainer: "सरल भाषा व्याख्याकार",
    lawExplainerDesc: "मोटर वाहन अधिनियम की जटिल कानूनी धाराओं को आसान हिंदी में समझें।",
    disclaimerTitle: "अस्वीकरण और कानूनी सूचना",
    disclaimerText: "इस टूल द्वारा प्रदान की गई सरल व्याख्या केवल जागरूकता के लिए है। यह कानूनी सलाह नहीं है। कानूनी मामलों में, मूल मोटर वाहन अधिनियम या आधिकारिक सरकारी गजट ही अंतिम रूप से मान्य होंगे।",
    selectState: "राज्य चुनें",
    selectVehicle: "वाहन का प्रकार चुनें",
    motorcycle: "दुपहिया वाहन (Two-Wheeler)",
    car: "चार पहिया / कार",
    heavy: "भारी वाहन (Heavy)",
    allVehicles: "सभी प्रकार के वाहन",
    calculate: "कुल जुर्माने की गणना करें",
    fromCity: "प्रस्थान शहर (जैसे: Bhopal)",
    toCity: "गंतव्य शहर (जैसे: Pune)",
    checkRoute: "मार्ग नियमों का विश्लेषण करें",
    originalText: "मूल कानूनी धारा",
    simplifiedText: "सरल भाषा में व्याख्या",
    enterLawText: "यहाँ मोटर वाहन अधिनियम की धारा का विवरण पेस्ट करें...",
    explainBtn: "सरल भाषा में समझाएं",
    askQuestion: "ट्रैफिक नियमों के बारे में सवाल पूछें (जैसे: एमपी में हेलमेट का जुर्माना)...",
    send: "भेजें",
    offlineBanner: "आप ऑफलाइन हैं। कैश्ड (सुरक्षित) जानकारी दिखाई जा रही है। ऑफलाइन मोड में केवल मुख्य राज्य उपलब्ध हैं।",
    conflictsFound: "मार्ग नियमों में अंतर (Conflict) पाया गया",
    receiptTitle: "मद-वार चालान रसीद",
    totalFine: "कुल जुर्माना राशि",
    repeatOffense: "दोबारा उल्लंघन?",
    firstOffense: "पहली बार उल्लंघन",
    sourceNotes: "विवरण / आधार",
    documentsRequired: "यात्रा के लिए आवश्यक दस्तावेज",
    stateSpeedLimits: "राज्यों के अनुसार गति सीमाएं",
    specialRulesTitle: "विशेष राज्य दिशानिर्देश",
    detectedLanguage: "पहचानी गई भाषा",
    chatModeSimple: "सरल मोड (दोस्ताना)",
    chatModeLegal: "कानूनी मोड (सख्त)"
  },
  Marathi: { appName: "DriveLegal", appSubtitle: "नियम पाळा, सुरक्षित राहा", chatbot: "ट्रॅफिक कायदा चॅटबॉट" },
  Tamil: { appName: "DriveLegal", appSubtitle: "விதிமுறைகளை அறிவோம், பாதுகாப்பாக பயணிப்போம்", chatbot: "போக்குவரத்து விதிமுறை சாட்பாட்" },
  Telugu: { appName: "DriveLegal", appSubtitle: "రహదారి నియమాలు పాటించండి", chatbot: "ట్రాఫిక్ లా చాట్‌బాట్" },
  Bengali: { appName: "DriveLegal", appSubtitle: "আইন জানুন, নিরাপদ থাকুন", chatbot: "ট্রাফিক আইন চ্যাটবট" }
};

// Fallback logic for languages without full translations: fallback to English
const getTranslation = (lang: LanguageType, key: string): string => {
  if (translations[lang] && translations[lang][key]) {
    return translations[lang][key];
  }
  return translations['English'][key] || key;
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageType>(() => {
    const saved = localStorage.getItem('drivelegal_lang');
    return (saved as LanguageType) || 'English';
  });

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
    localStorage.setItem('drivelegal_lang', lang);
  };

  const t = (key: string) => getTranslation(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
