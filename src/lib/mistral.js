const MISTRAL_API_KEY =
  import.meta.env.VITE_MISTRAL_API_KEY || "mstrl_ANp5gagZIOEmJIrwlKhakSOlOXXxEPQJ_42ihVE";

/**
 * 🔍 OCR MISTRAL (mistral-ocr-latest) : lit le texte écrit sur une photo de pièce.
 * L'image est envoyée à l'API OCR de Mistral AI, qui renvoie le texte reconnu.
 * Avantage : aucune donnée de langue à télécharger sur le téléphone, la lecture
 * est faite par le serveur Mistral (rapide, même sur petite connexion).
 * @param {string} dataUrl - Image au format data URL (data:image/jpeg;base64,…)
 * @returns {Promise<{ success: boolean, text: string }>} - Texte lu sur l'image
 */
export async function lireImageMistralOCR(dataUrl) {
  try {
    const response = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        image: {
          type: "image_url",
          image_url: dataUrl,
        },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.warn("Avertissement API OCR Mistral:", response.status, errJson);
      return { success: false, text: "" };
    }

    const data = await response.json();
    // L'OCR Mistral renvoie des pages : on rassemble tout le texte lu (markdown)
    const texte = (data.pages || [])
      .map(p => p.markdown || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return { success: texte.length > 0, text: texte };
  } catch (error) {
    console.warn("Erreur réseau lors de l'appel à l'API OCR Mistral:", error);
    return { success: false, text: "" };
  }
}

/**
 * Génère une réponse d'assistant virtuel intelligent spécialisé en pièces détachées moto via l'API Mistral AI
 * @param {Array<{role: string, content: string}>} messages - Liste des messages de la discussion
 * @param {string} systemPrompt - Instructions système pour l'assistant IA
 * @returns {Promise<string>} - Réponse textuelle de Mistral AI
 */
export async function demanderAssistantMistral(messages, systemPrompt = "") {
  try {
    const payloadMessages = [];
    if (systemPrompt) {
      payloadMessages.push({ role: "system", content: systemPrompt });
    }
    payloadMessages.push(...messages);

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: payloadMessages,
        temperature: 0.7,
        max_tokens: 350,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.warn("Avertissement API Mistral AI:", response.status, errJson);
      return "";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.warn("Erreur réseau lors de l'appel à l'API Mistral AI:", error);
    return "";
  }
}
