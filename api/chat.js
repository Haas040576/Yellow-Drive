export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI backend not configured' });

  const { message = '', selectedLicense = '' } = req.body || {};
  if (!message.trim()) return res.status(400).json({ error: 'Missing message' });

  const instructions = `Du bist der digitale Assistent der Fahrschule Yellow-Drive in Murnau am Staffelsee. Antworte auf Deutsch, locker, freundlich, knapp und kompetent. Keine Werbesprache. Erfinde keine verbindlichen Preise, Termine oder Verfügbarkeiten. Wenn es um konkrete Yellow-Drive-Preise oder Termine geht, sage klar, dass diese persönlich bestätigt werden müssen. Bekannte Kontaktdaten: Fahrschule Yellow-Drive, Inhaber Stefan Bartl, Reschstrasse 2, 82418 Murnau, Telefon 08841 3840, Mobil 0171 8779310, E-Mail stefanbartl@gmx.net. Angebotene Klassen auf der Website: B, BF17, B197, A, A1, A2, AM, Mofa, BE, B96, L. Erkläre Führerscheinklassen verständlich und frage bei unklaren Fällen nach Alter, Vorbesitz und gewünschtem Fahrzeug. Die aktuell auf der Website ausgewählte Klasse ist ${selectedLicense || 'nicht angegeben'}.`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        instructions,
        input: message,
        max_output_tokens: 260,
        reasoning: { effort: 'none' }
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.error?.message || 'AI request failed' });

    const answer = data.output_text || data.output?.flatMap(item => item.content || []).find(c => c.type === 'output_text')?.text;
    if (!answer) return res.status(502).json({ error: 'Empty AI response' });
    return res.status(200).json({ answer });
  } catch (error) {
    return res.status(500).json({ error: 'AI backend failed' });
  }
}
