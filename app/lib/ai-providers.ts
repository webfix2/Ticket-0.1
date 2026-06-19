export interface AiTicketData {
  eventName: string;
  venue: string;
  location: string;
  dateTime: string;
  doorTime: string;
  section: string;
  sectionNo: string;
  gate: string;
  entrance: string;
  hospitalityArea: string;
  ticketHolder: string;
  row: string;
  seatNumbers: string;
  category: string;
  ageRestriction: string;
  description: string;
  coverImage: string;
  terms: string;
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  imageUrl?: string;
}

const TRAINING_EXAMPLES = [
  {
    eventName: 'Champions League final',
    venue: 'Budapest',
    location: 'Puskas Aréna Budapest',
    dateTime: '2026-05-30T18:00',
    doorTime: '18:00',
    section: 'Lower Bowl',
    sectionNo: '120',
    row: '5',
    seatNumbers: '10',
    category: 'Football',
    ageRestriction: 'All Ages',
    description: 'Watch the Champions League final live at Puskas Aréna in Budapest.',
    coverImage: 'https://robertlugana.sirv.com/TICKET/UEFA/WhatsApp%20Image%202026-05-12%20at%2013.51.58.jpeg',
    terms: '',
  },
  {
    eventName: 'MALIKO IS BACK 2026',
    venue: 'Golfy Stadium',
    location: 'Alberta, Canada',
    dateTime: '2026-05-22T12:26',
    doorTime: '5:00 PM',
    section: 'VIP Packages',
    sectionNo: '120',
    row: '67',
    seatNumbers: '101,102,103,104',
    category: 'Concert',
    ageRestriction: 'All Ages',
    description: 'Maliko is back for a special performance in Alberta.',
    coverImage: '',
    terms: '',
  },
  {
    eventName: 'ARIANA GRANDE: THE ETERNAL SUNSHINE TOUR',
    venue: 'Oakland Arena',
    location: 'Oakland',
    dateTime: '2026-06-06T19:30',
    doorTime: '',
    section: 'Lower Bowl',
    sectionNo: '109',
    row: '10',
    seatNumbers: '2,3',
    category: 'Concert',
    ageRestriction: 'All Ages',
    description: 'Ariana Grande brings The Eternal Sunshine Tour to Oakland Arena.',
    coverImage: 'https://s1.ticketm.net/dam/a/adb/fc874544-aef0-468d-8db5-0507863cbadb_CUSTOM.jpg',
    terms: '',
  },
];

const SYSTEM_PROMPT = `You are a ticket data extraction assistant. Given an event description and search results, generate structured ticket data that matches the following template exactly.

Here are examples of real ticket data from the database — match this format and style:

Example 1:
{"eventName":"Champions League final","venue":"Budapest","location":"Puskas Aréna Budapest","dateTime":"2026-05-30T18:00","doorTime":"18:00","section":"Lower Bowl","sectionNo":"120","row":"5","seatNumbers":"10","category":"Football","ageRestriction":"All Ages","description":"Watch the Champions League final live at Puskas Aréna in Budapest.","coverImage":"https://...","terms":""}

Example 2:
{"eventName":"MALIKO IS BACK 2026","venue":"Golfy Stadium","location":"Alberta, Canada","dateTime":"2026-05-22T12:26","doorTime":"5:00 PM","section":"VIP Packages","sectionNo":"120","row":"67","seatNumbers":"101,102,103,104","category":"Concert","ageRestriction":"All Ages","description":"Maliko is back for a special performance in Alberta.","coverImage":"","terms":""}

Example 3:
{"eventName":"ARIANA GRANDE: THE ETERNAL SUNSHINE TOUR","venue":"Oakland Arena","location":"Oakland","dateTime":"2026-06-06T19:30","doorTime":"","section":"Lower Bowl","sectionNo":"109","row":"10","seatNumbers":"2,3","category":"Concert","ageRestriction":"All Ages","description":"Ariana Grande brings The Eternal Sunshine Tour to Oakland Arena.","coverImage":"https://s1.ticketm.net/dam/a/adb/...","terms":""}

Rules:
- section must be one of: "VIP Packages", "Floor Seats", "Lower Bowl", "Upper Bowl"
- ageRestriction: "All Ages", "18+", or "21+"
- dateTime format: "YYYY-MM-DDTHH:mm"
- venue = stadium/arena name, location = city or city, country
- seatNumbers: comma-separated numbers or single number
- category: "Concert", "Football", "Sports", "Theater", "Festival" etc.
- doorTime: leave empty string if unknown
- terms: empty string
- coverImage: use the event image URL from search results if available, otherwise empty string

Always respond with valid JSON only, no markdown.`;

function cleanJson(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return raw;
  return raw.slice(start, end + 1);
}

function cleanJsonArray(raw: string): string {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1) return raw;
  return raw.slice(start, end + 1);
}

async function tryGeminiNano(prompt: string): Promise<string | null> {
  try {
    const ai = (window as any).ai;
    if (!ai?.languageModel) return null;
    const capabilities = await ai.languageModel.capabilities();
    if (capabilities.available === 'no') return null;
    const session = await ai.languageModel.create({
      temperature: 0.3,
      systemPrompt: SYSTEM_PROMPT,
    });
    const result = await session.prompt(prompt);
    session.destroy();
    return result;
  } catch {
    return null;
  }
}

async function tryPollinations(prompt: string): Promise<string | null> {
  try {
    const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

async function tryOpenRouter(prompt: string): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_OPENROUTER_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

async function tryHuggingFace(prompt: string): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_HUGGINGFACE_KEY;
  if (!key) return null;
  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser query: ${prompt}\n\nGenerate 3 ticket suggestions as JSON array:`;
  try {
    const res = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: { max_new_tokens: 800, temperature: 0.3 },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[0]?.generated_text || null;
  } catch {
    return null;
  }
}

const PROVIDERS: ((p: string) => Promise<string | null>)[] = [
  tryGeminiNano,
  tryPollinations,
  tryOpenRouter,
  tryHuggingFace,
];

export async function generateWithAI(
  query: string,
  searchResults: SearchResult[]
): Promise<AiTicketData[] | null> {
  const context = searchResults
    .map((r, i) => `${i + 1}. Title: ${r.title}\n   Snippet: ${r.snippet}\n   URL: ${r.url}\n   Image: ${r.imageUrl || ''}`)
    .join('\n\n');

  const prompt = `Given this event query: "${query}"
And these search results:
${context}

Generate 3 structured ticket suggestions as a JSON array. Each suggestion should be a different interpretation based on the search results. Follow the exact template from the training examples.

Return ONLY valid JSON array, no markdown:
[
  {
    "eventName": "...",
    "venue": "...",
    "location": "...",
    "dateTime": "YYYY-MM-DDTHH:mm",
    "doorTime": "...",
    "section": "Lower Bowl|Upper Bowl|VIP Packages|Floor Seats",
    "sectionNo": "...",
    "row": "...",
    "seatNumbers": "...",
    "category": "...",
    "ageRestriction": "All Ages",
    "description": "...",
    "coverImage": "${searchResults[0]?.imageUrl || ''}",
    "terms": ""
  }
]`;

  const results: AiTicketData[] = [];

  for (const provider of PROVIDERS) {
    const raw = await provider(prompt);
    if (!raw) continue;

    try {
      const cleaned = cleanJsonArray(raw);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const valid = arr.filter(
        (item: any) =>
          item.eventName || item.venue || item.location
      );
      if (valid.length > 0) {
        for (let i = 0; i < Math.min(valid.length, 3); i++) {
          const r = searchResults[i];
          results.push(normalizeTicketData(valid[i], r));
        }
        break;
      }
    } catch {
      continue;
    }
  }

  if (results.length === 0) {
    results.push(
      ...searchResults.map((r) => ({
        eventName: r.title,
        venue: '',
        location: '',
        dateTime: '',
        doorTime: '',
        section: '',
        sectionNo: '',
        gate: '',
        entrance: '',
        hospitalityArea: '',
        ticketHolder: '',
        row: '',
        seatNumbers: '',
        category: '',
        ageRestriction: 'All Ages',
        description: r.snippet,
        coverImage: r.imageUrl || '',
        terms: '',
      }))
    );
  }

  return results.slice(0, 3);
}

function normalizeTicketData(item: any, searchResult: SearchResult): AiTicketData {
  return {
    eventName: item.eventName || searchResult.title || '',
    venue: item.venue || '',
    location: item.location || '',
    dateTime: item.dateTime || '',
    doorTime: item.doorTime || '',
    section: item.section || '',
    sectionNo: item.sectionNo || '',
    gate: item.gate || '',
    entrance: item.entrance || '',
    hospitalityArea: item.hospitalityArea || '',
    ticketHolder: item.ticketHolder || '',
    row: item.row || '',
    seatNumbers: item.seatNumbers || '',
    category: item.category || '',
    ageRestriction: item.ageRestriction || 'All Ages',
    description: item.description || searchResult.snippet || '',
    coverImage: item.coverImage || searchResult.imageUrl || '',
    terms: item.terms || '',
  };
}
