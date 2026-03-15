// Nepali health knowledge base for RAG
const knowledgeBase: { keywords: string[]; content: string }[] = [
  {
    keywords: ["टाउको", "headache", "टाउकोदुखाइ", "head"],
    content:
      "टाउको दुखाइको उपाय: पर्याप्त पानी पिउनुहोस् (दिनको ८-१० गिलास), आराम गर्नुहोस्, र ज्यादा चिन्ता नलिनुहोस्। यदि दुखाइ बारम्बार छ भने डाक्टरसँग परामर्श गर्नुहोस्।",
  },
  {
    keywords: ["ज्वरो", "fever", "तापक्रम", "temperature"],
    content:
      "ज्वरोमा: शरीरको तापक्रम जाँच गर्नुहोस्, धेरै झोलिलो पदार्थ पिउनुहोस्, आराम गर्नुहोस्। तापक्रम १०२°F भन्दा बढी छ भने तुरुन्त डाक्टरकहाँ जानुहोस्।",
  },
  {
    keywords: ["रक्तचाप", "blood pressure", "bp", "हाइपरटेन्सन"],
    content:
      "उच्च रक्तचाप नियन्त्रणका लागि: नुन कम खानुहोस्, नियमित व्यायाम गर्नुहोस्, तनाव कम गर्नुहोस्, र निर्धारित औषधि समयमा खानुहोस्।",
  },
  {
    keywords: ["मधुमेह", "diabetes", "sugar", "सुगर"],
    content:
      "मधुमेह व्यवस्थापनका लागि: चिनी र मिठा खाना कम गर्नुहोस्, नियमित रगत जाँच गर्नुहोस्, व्यायाम गर्नुहोस्, र समयमा इन्सुलिन/औषधि लिनुहोस्।",
  },
  {
    keywords: ["औषधि", "medicine", "medication", "दवाइ", "खाने"],
    content:
      "औषधि नियमित र सही समयमा लिनु महत्त्वपूर्ण छ। खाना खाएपछि लिने र खाना खानुअघि लिने औषधि छुट्याउनुहोस्। डाक्टरको सल्लाहबिना औषधि बन्द नगर्नुहोस्।",
  },
  {
    keywords: ["निद्रा", "sleep", "अनिद्रा", "insomnia"],
    content:
      "राम्रो निद्राका लागि: सुत्नु अघि मोबाइल नहेर्नुहोस्, नियमित समयमा सुत्नुहोस्, क्याफिन कम लिनुहोस्, र शान्त वातावरण बनाउनुहोस्।",
  },
  {
    keywords: ["व्यायाम", "exercise", "fitness", "कसरत"],
    content:
      "नियमित व्यायाम स्वास्थ्यका लागि अत्यन्त महत्त्वपूर्ण छ। दिनको कम्तीमा ३०-४५ मिनेट हिँड्नु वा हल्का व्यायाम गर्नु राम्रो हुन्छ।",
  },
  {
    keywords: ["हिजो", "आज", "पहिले", "report", "रिपोर्ट"],
    content:
      "तपाइँको स्वास्थ्य रिपोर्ट हेर्न र विगतका कुराकानीहरूको सारांश प्राप्त गर्न म सहयोग गर्न सक्छु।",
  },
];

export class RAGService {
  retrieve(query: string): string {
    const lowerQuery = query.toLowerCase();
    const relevant: string[] = [];

    for (const entry of knowledgeBase) {
      if (entry.keywords.some((kw) => lowerQuery.includes(kw))) {
        relevant.push(entry.content);
      }
    }

    if (relevant.length === 0) return "";

    return "स्वास्थ्य सन्दर्भ जानकारी:\n" + relevant.slice(0, 2).join("\n\n");
  }
}

export const ragService = new RAGService();
