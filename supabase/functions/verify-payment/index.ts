import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const TARGET_CARD = '9860010102408712';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, requiredAmount } = await req.json();

    if (!imageBase64 || !requiredAmount) {
      return new Response(
        JSON.stringify({ verified: false, message: 'Missing image or amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ verified: false, message: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `You are a payment verification AI. Analyze this payment screenshot carefully.

REQUIRED CHECKS:
1. Is this a real payment/transfer screenshot (not edited, not a mockup)?
2. Was the payment sent TO card number ${TARGET_CARD} (or formatted as 9860 0101 0240 8712)?
3. Is the transferred amount at least ${requiredAmount} UZS (som)? It can be MORE but NOT LESS.
4. Does the screenshot show a SUCCESSFUL/COMPLETED transaction?

RESPOND WITH EXACTLY THIS JSON FORMAT (no other text):
{
  "is_real_screenshot": true/false,
  "correct_card": true/false,
  "detected_card": "the card number you see in the screenshot or 'not found'",
  "amount_sufficient": true/false,
  "detected_amount": number or 0,
  "transaction_successful": true/false,
  "verified": true/false,
  "reason": "brief explanation"
}

The "verified" field should be TRUE only if ALL of these are true:
- is_real_screenshot = true
- correct_card = true
- amount_sufficient = true
- transaction_successful = true`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error:', response.status, errorText);
      return new Response(
        JSON.stringify({ verified: false, message: 'Verification service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from Gemini response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ verified: false, message: 'Could not parse verification result' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    // Build user-friendly message
    let message = '';
    if (result.verified) {
      message = `To'lov tasdiqlandi! Summa: ${result.detected_amount?.toLocaleString()} so'm`;
    } else {
      const issues = [];
      if (!result.is_real_screenshot) issues.push("Screenshot haqiqiy to'lov emas");
      if (!result.correct_card) issues.push(`Noto'g'ri karta (aniqlangan: ${result.detected_card})`);
      if (!result.amount_sufficient) issues.push(`Summa yetarli emas (${result.detected_amount?.toLocaleString()} < ${requiredAmount.toLocaleString()})`);
      if (!result.transaction_successful) issues.push("Tranzaksiya muvaffaqiyatsiz");
      message = issues.join('. ') || result.reason || 'Tekshiruv muvaffaqiyatsiz';
    }

    return new Response(
      JSON.stringify({
        verified: !!result.verified,
        message,
        details: {
          detectedAmount: result.detected_amount || 0,
          detectedCard: result.detected_card || 'N/A',
          isReal: !!result.is_real_screenshot,
          correctCard: !!result.correct_card,
          amountOk: !!result.amount_sufficient,
          transactionOk: !!result.transaction_successful,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Payment verification error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ verified: false, message: `Xatolik: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
