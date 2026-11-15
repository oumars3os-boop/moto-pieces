const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyAvTDcuBwIsoH9QBQ9UqOO1eK3r5UHUaRc";

/**
 * Analyse automatiquement une photo de pièce détachée de moto avec l'API Google Gemini 1.5 Flash Vision
 * @param {string} base64Image - Image encodée en base64 (DataURL)
 * @returns {Promise<{ success: boolean, nom?: string, cat?: string, marque?: string, motsCles: string[], rawText?: string }>}
 */
export async function analyserImageGemini(base64Image) {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const mimeType = base64Image.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Analyse cette photo de pièce détachée de moto. Identifie précisément le nom de la pièce, sa catégorie (moteur, freinage, transmission, electricite, carrosserie, etc.), sa marque et tous les mots-clés ou inscriptions visibles. Réponds sous forme de JSON strict: {\"nom\": \"...\", \"cat\": \"...\", \"marque\": \"...\", \"mots\": [\"...\"]}"
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: cleanBase64
                  }
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn("Avis API Gemini Vision:", response.status, errText);
      return { success: false, motsCles: [] };
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          nom: parsed.nom || "",
          cat: parsed.cat || "",
          marque: parsed.marque || "",
          motsCles: Array.isArray(parsed.mots) ? parsed.mots : [],
          rawText
        };
      }
    } catch (e) {}

    const motsExtraits = rawText.toLowerCase().split(/[\s,;:._\-\/]+/).filter(w => w.length >= 3);
    return {
      success: true,
      nom: "",
      cat: "",
      marque: "",
      motsCles: motsExtraits,
      rawText
    };
  } catch (err) {
    console.warn("Erreur réseau API Gemini AI Vision:", err);
    return { success: false, motsCles: [] };
  }
}
