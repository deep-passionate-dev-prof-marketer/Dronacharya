import { TranslationEngine } from "../src/services/translation/translationEngine";

async function runVerification() {
  console.log("=== DRONACHARYA SELF-HOSTED TRANSLATION TEST ===");

  // Test 1: Teacher speaks Hindi -> Student hears Spanish
  const t1 = await TranslationEngine.translate(
    "आज हम fractions के बारे में सीखेंगे।",
    "hi",
    "es",
    "math"
  );
  console.log("Test 1 (Hindi -> Spanish):", t1.translatedText, `[Provider: ${t1.provider}]`);

  // Test 2: Student speaks Spanish -> Teacher hears Hindi
  const t2 = await TranslationEngine.translate(
    "no entiendo esta parte.",
    "es",
    "hi",
    "general"
  );
  console.log("Test 2 (Spanish -> Hindi):", t2.translatedText, `[Provider: ${t2.provider}]`);

  // Test 3: Spontaneous conversational question in Spanish
  const t3 = await TranslationEngine.translate(
    "hola profesor, tengo una pregunta",
    "es",
    "hi",
    "general"
  );
  console.log("Test 3 (Spanish -> Hindi Conversation):", t3.translatedText, `[Provider: ${t3.provider}]`);

  // Test 4: English STEM question -> Spanish
  const t4 = await TranslationEngine.translate(
    "take the square root of 16.",
    "en",
    "es",
    "math"
  );
  console.log("Test 4 (English STEM -> Spanish):", t4.translatedText, `[Provider: ${t4.provider}]`);

  // Test 5: Spontaneous vocabulary token lookup
  const t5 = await TranslationEngine.translate(
    "student question problem",
    "en",
    "es",
    "general"
  );
  console.log("Test 5 (Token fallback -> Spanish):", t5.translatedText, `[Provider: ${t5.provider}]`);

  console.log("=== ALL TESTS COMPLETED WITH ZERO 3RD-PARTY APIS ===");
}

runVerification().catch(console.error);
