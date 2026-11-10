import { DEFAULT_ACTIVITY_GENERATION_PROMPT } from "../utils/activityGenerator.js";

const DEFAULT_WEBHOOK_URL =
  "https://osc-sch.app.n8n.cloud/webhook-test/2bc07647-b4dd-4be5-b6ab-468dccbda91e";

const generationSchema = `Devolvé únicamente un objeto JSON válido con esta estructura para UNA actividad:
{
  "titulo": "Título de la actividad",
  "descripcion": "Descripción breve",
  "ejercicios": [
    {
      "tipo": "opcion_unica",
      "enunciado": "Enunciado de la pregunta",
      "explicacionGeneral": "Explicación opcional para una respuesta correcta",
      "opciones": [
        { "texto": "Opción A", "pista": "Pista breve", "explicacionError": "Explicación del error" },
        { "texto": "Opción B", "pista": "Pista breve", "explicacionError": "Explicación del error" }
      ],
      "indiceCorrecta": 0
    }
  ]
}
Reglas: cada ejercicio debe ser de selección única, tener al menos dos opciones y exactamente una opción correcta. indiceCorrecta es el índice desde cero de la opción correcta. No incluyas identificadores, texto Markdown ni bloques de código.`;

export function buildActivityGenerationPrompt(prompt) {
  const instruction = prompt.trim() || DEFAULT_ACTIVITY_GENERATION_PROMPT;
  return `${instruction}\n\n${generationSchema}`;
}

export function getActivityGeneratorWebhookUrl() {
  const configuredUrl = import.meta.env?.VITE_WEBHOOK_URL?.trim();
  return configuredUrl || DEFAULT_WEBHOOK_URL;
}

export async function generateActivityFromFiles({ files, prompt, signal }) {
  if (!files.length)
    throw new Error("Seleccioná al menos un archivo para analizar.");

  const formData = new FormData();
  files.forEach((file, index) =>
    formData.append(`archivo${index + 1}`, file, file.name),
  );
  formData.append("prompt", buildActivityGenerationPrompt(prompt));

  let response;
  try {
    response = await fetch(getActivityGeneratorWebhookUrl(), {
      method: "POST",
      body: formData,
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "No se pudo conectar con el servicio de IA. Revisá tu conexión e intentá nuevamente.",
      { cause: error },
    );
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? "El servicio de IA devolvió una respuesta que no es JSON válido."
        : `El servicio de IA respondió con HTTP ${response.status}. Intentá nuevamente.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      result.message ||
        result.error ||
        `El servicio de IA respondió con HTTP ${response.status}. Intentá nuevamente.`,
    );
  }
  if (
    result?.success !== true ||
    !result.data ||
    typeof result.data !== "object"
  ) {
    throw new Error(
      result?.message || "El servicio de IA devolvió una respuesta incompleta.",
    );
  }
  return result.data;
}
