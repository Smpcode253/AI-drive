import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a short, trending video topic for the given niche using GPT-4.
 */
export async function generateTopic(niche: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a YouTube trend analyst. Respond with only a concise video title.',
      },
      {
        role: 'user',
        content: `Generate a trending YouTube video topic for the niche: ${niche}`,
      },
    ],
    max_tokens: 60,
  });
  return completion.choices[0].message.content?.trim() ?? '';
}

/**
 * Generate a full video script for the given topic using GPT-4.
 */
export async function generateScript(topic: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          'You are a professional YouTube scriptwriter. Write an engaging, structured video script.',
      },
      {
        role: 'user',
        content: `Write a complete YouTube video script for the topic: ${topic}`,
      },
    ],
    max_tokens: 1500,
  });
  return completion.choices[0].message.content?.trim() ?? '';
}

export default { generateTopic, generateScript };
