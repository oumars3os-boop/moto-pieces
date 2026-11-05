const MISTRAL_API_KEY =
  import.meta.env.VITE_MISTRAL_API_KEY || "mstrl_ANp5gagZIOEmJIrwlKhakSOlOXXxEPQJ_42ihVE";

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
