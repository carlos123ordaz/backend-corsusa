/**
 * ─── Voice Expense Controller ───
 * Procesa texto de voz y lo convierte en datos estructurados de gasto
 * usando Gemini AI.
 * 
 * Agregar a tu archivo de rutas:
 *   router.post('/api/expenses/voice-to-expense', voiceToExpense);
 * 
 * Agregar al controlador existente (gastoController.js) o usar como archivo separado.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyAheayc0VWeMd8Fx1zc8kpnqo9hwMcAD8M');
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const voiceToExpense = async (req, res) => {
    try {
        const { transcription } = req.body;

        if (!transcription || !transcription.trim()) {
            return res.status(400).json({
                error: 'No se recibió texto de la transcripción',
            });
        }

        const today = new Date().toISOString().split('T')[0];

        const prompt = `
Eres un asistente que convierte descripciones de gastos dictadas por voz en datos estructurados JSON.

El usuario ha dictado lo siguiente:
"${transcription}"

Analiza el texto y extrae la información del gasto. Devuelve ESTRICTAMENTE un JSON con esta estructura:

{
  "esValido": boolean,
  "motivoNoEsValido": string | null,
  "tipo": "viatico" | "compra",
  "ruc": string | null,
  "razon_social": string | null,
  "fecha_emision": "YYYY-MM-DD HH:mm:ss",
  "moneda": "PEN" | "USD" | "EUR",
  "categoria": "alimentacion" | "movilidad" | "hospedaje" | "transporte_aereo" | "transporte_terrestre" | "alquiler_vehiculo" | "alquiler_herramientas" | "materiales" | "EPPs" | "otros",
  "items": [
    {
      "descripcion": string,
      "cantidad": number,
      "precio_unitario": number,
      "subtotal": number
    }
  ],
  "total": number,
  "igv": number | 0,
  "descuento": number | 0,
  "detraccion": number | 0,
  "descripcion": string,
  "con_sustento": boolean,
  "detalle_sustento": "Sustento con IGV" | "Sustento sin IGV" | "Gasto Reparable" | "Si"
}

Reglas importantes:
- Si no se menciona fecha, usa la fecha de hoy: ${today}
- Si no se menciona moneda, asume "PEN" (soles peruanos)
- Si no se menciona tipo, asume "viatico"
- Si se menciona "dólares" o "dollars", usa "USD". Si se menciona "euros", usa "EUR"
- Infiere la categoría del contexto: comida/almuerzo/cena → "alimentacion", taxi/uber/bus → "movilidad", hotel → "hospedaje", etc.
- Si se mencionan varios items, sepáralos individualmente
- Si solo se menciona un monto total sin desglose, crea un solo item con ese monto
- El campo "descripcion" debe ser un resumen claro del gasto
- Si el texto no parece un gasto válido, marca esValido como false y explica el motivo
- Devuelve SOLO el JSON, sin texto adicional ni backticks
`;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json|```/g, '').trim();

        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            console.error("Error parsing voice-to-expense JSON:", err);
            return res.status(500).json({
                error: 'Error al procesar la respuesta de IA',
                raw: text,
            });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error en voice-to-expense:', error);
        res.status(500).json({
            error: 'Error al procesar el texto de voz',
            message: error.message,
        });
    }
};

module.exports = { voiceToExpense };