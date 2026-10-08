# 09 - API Specification

`POST /api/ai/live-translate-stream`
- Body: `{ text: string, sourceLanguage?: string, targetLanguage: string, speaker?: string }`
- Response: `{ speaker: string, sourceLanguage: string, targetLanguage: string, englishText: string, translatedText: string, provider: string }`
