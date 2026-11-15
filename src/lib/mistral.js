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
  // Limite de temps : sans réponse au bout de 25 s, on passe au secours local
  const controleur = typeof AbortController !== "undefined" ? new AbortController() : null;
  const minuteur = controleur ? setTimeout(() => controleur.abort(), 25000) : null;
  try {
    const response = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      signal: controleur ? controleur.signal : undefined,
      // CORRECTION : l'API Mistral attend le champ « document » (et non « image »).
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
          type: "image_url",
          image_url: dataUrl,
        },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.warn("Avertissement API OCR Mistral:", response.status, errJson);
      return {
        success: false,
        text: "",
        status: response.status,
        message: response.status === 401 || response.status === 403
          ? "Clé Mistral refusée (vérifie VITE_MISTRAL_API_KEY)"
          : "Mistral OCR a répondu avec l'erreur " + response.status,
      };
    }

    const data = await response.json();
    // L'OCR Mistral renvoie des pages : on rassemble tout le texte lu (markdown)
    const texte = (data.pages || [])
      .map(p => p.markdown || "")
      .join(" ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")   // retire les balises d'images du markdown
      .replace(/\s+/g, " ")
      .trim();

    return { success: texte.length > 0, text: texte, message: texte.length > 0 ? "" : "Aucun texte lisible sur la photo" };
  } catch (error) {
    console.warn("Erreur réseau lors de l'appel à l'API OCR Mistral:", error);
    return { success: false, text: "", message: "Mistral OCR injoignable (réseau)" };
  } finally {
    if (minuteur) clearTimeout(minuteur);
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

/**
 * 👁️ RECONNAISSANCE PAR IA (vision Mistral) : l'IA regarde la photo comme une personne.
 * - Sans catalogue : elle décrit seulement l'objet et recopie le texte lisible.
 * - Avec catalogue : elle dit en plus quels articles enregistrés sont LE MÊME type d'objet (ou aucun).
 * @param {string} dataUrl - photo (data:image/jpeg;base64,…)
 * @param {string[]|null} lignesCatalogue - lignes « id | nom | marque | catégorie | mots-clés »
 */
const MISTRAL_VISION_MODEL = import.meta.env.VITE_MISTRAL_VISION_MODEL || "mistral-small-latest";

export async function analyserObjetMistral(dataUrl, lignesCatalogue = null) {
  const controleur = typeof AbortController !== "undefined" ? new AbortController() : null;
  const minuteur = controleur ? setTimeout(() => controleur.abort(), 30000) : null;
  try {
    if (!dataUrl || !String(dataUrl).startsWith("data:image")) return { success: false, message: "Photo illisible" };
    const avecCatalogue = Array.isArray(lignesCatalogue) && lignesCatalogue.length > 0;

    const consigne = [
      "Tu es un vendeur expert en pièces détachées de motos et accessoires, avec un très bon œil. On te montre la photo d'UN objet.",
      "",
      "ÉTAPE 1 — Regarde la photo comme le ferait une personne : quel est cet objet (type de pièce, marque ou modèle si visibles, couleur, état) ? Recopie aussi tout texte lisible dessus (marque, référence, code).",
      avecCatalogue ? "ÉTAPE 2 — Dis lesquels des articles du catalogue ci-dessous sont EXACTEMENT ce même type d'objet." : "",
      avecCatalogue ? "\nCATALOGUE (identifiant | nom | marque | catégorie | mots-clés) :\n" + lignesCatalogue.join("\n") : "",
      "",
      "RÈGLES STRICTES :",
      "- Réponds uniquement d'après ce que tu VOIS sur la photo.",
      avecCatalogue ? "- Choisis un article seulement si tu es sûr qu'il s'agit du même type de pièce. Une ressemblance de forme ou de couleur ne suffit pas." : "",
      avecCatalogue ? "- Si l'objet n'est pas dans le catalogue, si la photo est floue ou sombre, ou si elle ne montre pas une pièce, laisse la liste \"correspondances\" VIDE. Vide est une bonne réponse." : "",
      avecCatalogue ? "- Utilise uniquement les identifiants de la liste. N'en invente jamais." : "",
      avecCatalogue ? "- \"confiance\" vaut \"haute\" (certain), \"moyenne\" (probable) ou \"faible\" (doute)." : "",
      "",
      "Réponds UNIQUEMENT avec ce JSON, sans aucun autre texte :",
      avecCatalogue
        ? "{\"objet\":\"description courte en français\",\"texte_lu\":\"texte lisible sur la pièce\",\"correspondances\":[{\"id\":12,\"confiance\":\"haute\",\"raison\":\"pourquoi\"}]}"
        : "{\"objet\":\"description courte en français\",\"texte_lu\":\"texte lisible sur la pièce\"}",
    ].filter(l => l !== "").join("\n");

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${MISTRAL_API_KEY}` },
      signal: controleur ? controleur.signal : undefined,
      body: JSON.stringify({
        model: MISTRAL_VISION_MODEL,
        temperature: 0,
        max_tokens: 700,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: consigne },
            { type: "image_url", image_url: dataUrl },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.warn("Avertissement vision Mistral:", response.status, errJson);
      return {
        success: false,
        status: response.status,
        message: response.status === 401 || response.status === 403
          ? "Clé Mistral refusée (vérifie VITE_MISTRAL_API_KEY)"
          : response.status === 429
            ? "Trop de demandes à Mistral : réessaie dans une minute"
            : "Mistral a répondu avec l'erreur " + response.status,
      };
    }

    const data = await response.json();
    let contenu = data?.choices?.[0]?.message?.content;
    if (Array.isArray(contenu)) contenu = contenu.map(c => (c && c.text) || "").join(" ");
    const brut = String(contenu || "");
    const debut = brut.indexOf("{");
    const fin = brut.lastIndexOf("}");
    if (debut < 0 || fin <= debut) return { success: false, message: "Réponse de l'IA illisible" };
    const json = JSON.parse(brut.slice(debut, fin + 1));
    return {
      success: true,
      objet: String(json.objet || ""),
      texte_lu: String(json.texte_lu || ""),
      correspondances: Array.isArray(json.correspondances) ? json.correspondances : [],
    };
  } catch (error) {
    console.warn("Erreur vision Mistral:", error);
    return {
      success: false,
      message: error && error.name === "AbortError" ? "Mistral n'a pas répondu à temps" : "Mistral injoignable (réseau ou réponse illisible)",
    };
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}
