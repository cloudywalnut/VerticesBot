import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ENV_FILE, PERSONA_DIR, MEM_DIR } from '@/lib/paths';

function parseEnv(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      val = val.replace(/^['"]|['"]$/g, '');
      result[match[1]] = val;
    }
  }
  return result;
}

interface EngineConfig {
  url: string;
  model: string;
  apiKey: string;
  isAnthropic: boolean;
}

function getEngineConfig(env: Record<string, string>): EngineConfig {
  const choice = env.AUTO_ENGINE_CHOICE || '1';

  const engines: Record<string, EngineConfig> = {
    '2': { url: 'https://api.deepseek.com/chat/completions',                                      model: 'deepseek-chat',      apiKey: env.deepseekApi || '', isAnthropic: false },
    '3': { url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',        model: 'qwen-turbo',         apiKey: env.qwenApi     || '', isAnthropic: false },
    '4': { url: 'https://api.anthropic.com/v1/messages',                                          model: 'claude-sonnet-4-6',  apiKey: env.antApi      || '', isAnthropic: true  },
    '5': { url: (env.localUrl || 'http://localhost:1234/v1/chat/completions'),                     model: 'local-model',        apiKey: env.localApi    || '', isAnthropic: false },
  };

  return engines[choice] ?? {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4.1',
    apiKey: env.openaiApi || '',
    isAnthropic: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { message, history, personaType } = await req.json();

    const rawEnv = fs.readFileSync(ENV_FILE, 'utf-8');
    const env    = parseEnv(rawEnv);

    const engine = getEngineConfig(env);
    if (!engine.apiKey) {
      const engineNames: Record<string, string> = { '1': 'OpenAI', '2': 'DeepSeek', '3': 'Qwen', '4': 'Anthropic', '5': 'Local' };
      const name = engineNames[env.AUTO_ENGINE_CHOICE || '1'] ?? 'AI';
      return NextResponse.json({ error: `No API key configured for ${name}. Set it in Settings.` }, { status: 400 });
    }

    // Load persona
    const personaFiles: Record<string, string> = {
      long:  'verticespersona-long.txt',
      short: 'verticespersona-short.txt',
      boss:  'verticespersona-boss.txt',
    };
    const personaFile = path.join(PERSONA_DIR, personaFiles[personaType] ?? personaFiles.long);
    let persona = fs.existsSync(personaFile) ? fs.readFileSync(personaFile, 'utf-8') : '';
    persona = persona.replace(/\{\{BOT_NAME\}\}/g, env.BOT_NAME || 'Vertices');

    // Load memory
    const permFile = path.join(MEM_DIR, 'verticesmemory-perm.txt');
    const tempFile = path.join(MEM_DIR, 'verticesmemory-temp.txt');
    const perm     = fs.existsSync(permFile) ? fs.readFileSync(permFile, 'utf-8').trim() : '';
    const temp     = fs.existsSync(tempFile) ? fs.readFileSync(tempFile, 'utf-8').trim() : '';

    let memoryBlock = '';
    if (perm) memoryBlock += `\n\nImportant Knowledge & Info YOU Must ALWAYS REMEMBER:\n${perm}`;
    if (temp) memoryBlock += `\n\nComing Days' & Weeks' Updates plus Important Info:\n${temp}`;

    const fullPersona = persona + memoryBlock;

    // Build history string (same format as bot's getLastChatHistory)
    const personLabel = env.PERSON || 'Customer';
    const historyStr = (history as Array<{ user: string; bot: string }>)
      .map(h => `${personLabel}: ${h.user}\nYou: ${h.bot}`)
      .join('\n');

    // Build prompt (same as bot's individual chat logic)
    const currentDateTime = new Date().toLocaleString(env.localFormat || 'en-US', {
      timeZone: env.TimeZone || 'Asia/Kuala_Lumpur',
    });

    const prompt = historyStr
      ? `This is your most recent chat history with ${personLabel}:\n${historyStr}\n${personLabel}: ${message}.\nThe local date & time now is ${currentDateTime}.\nBased on the above chats, your given persona & your role in the company, generate a reply, without any greeting (unless the ${personLabel} is greeting you), to the latest message from ${personLabel}. Vary your replies if the topic has already been replied or answered.`
      : `A new ${personLabel} has messaged YOU for the first time. The local date & time now is ${currentDateTime}. Please greet this ${personLabel}, introduce yourself, and MUST REPLY to this chat below by the new ${personLabel}:\n\n${personLabel}: "${message}".`;

    // Call AI
    let reply = '';

    if (engine.isAnthropic) {
      const response = await fetch(engine.url, {
        method: 'POST',
        headers: {
          'x-api-key':         engine.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
        },
        body: JSON.stringify({
          model:      engine.model,
          max_tokens: 200,
          system:     fullPersona,
          messages:   [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json() as any;
      reply = data.content?.[0]?.text ?? '';
      if (!reply && data.error) throw new Error(data.error.message ?? 'Anthropic error');
    } else {
      const response = await fetch(engine.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${engine.apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          model:       engine.model,
          messages:    [
            { role: 'system', content: fullPersona },
            { role: 'user',   content: prompt },
          ],
          temperature: 0.5,
          max_tokens:  200,
        }),
      });
      const data = await response.json() as any;
      reply = data.choices?.[0]?.message?.content ?? '';
      if (!reply && data.error) throw new Error(data.error.message ?? 'AI error');
    }

    if (!reply) return NextResponse.json({ error: 'AI returned an empty response.' }, { status: 500 });

    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
