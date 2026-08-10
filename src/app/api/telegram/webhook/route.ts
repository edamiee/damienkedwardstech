import { NextResponse, type NextRequest } from "next/server";
import { runClaudeToolLoop } from "@/lib/anthropic";
import { sendTelegramMessage } from "@/lib/telegram";
import { ADMIN_AGENT_TOOLS, executeAdminAgentTool } from "@/lib/admin-agent-tools";

const SYSTEM_PROMPT = `You are Damien Edwards' site admin assistant, reachable by him only via Telegram. He'll ask you in plain English to change small pieces of copy on damienkedwards.tech, add a testimonial, or add a "what I do" service card. Use the available tools to make the change, then reply with a short confirmation of exactly what you changed. If a request is ambiguous, ask a clarifying question instead of guessing. If asked to do something outside your available tools, say so plainly rather than attempting a workaround.`;

// Telegram sends the secret_token set via setWebhook back on every call —
// the only thing standing between this URL and the open internet, since
// the URL itself isn't secret once registered.
function isFromTelegram(request: NextRequest): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return false;
  return request.headers.get("x-telegram-bot-api-secret-token") === secret;
}

export async function POST(request: NextRequest) {
  if (!isFromTelegram(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: { message?: { chat?: { id?: number }; text?: string } };
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id ? String(update.message.chat.id) : null;
  const text = update.message?.text;

  if (!chatId || !text) {
    return NextResponse.json({ ok: true });
  }

  // Anyone can find and message a public bot — silently drop anyone who
  // isn't the allowlisted admin chat, no reply and no tool access, so a
  // stranger can't probe the assistant or spend API credits.
  if (!process.env.TELEGRAM_ADMIN_CHAT_ID || chatId !== process.env.TELEGRAM_ADMIN_CHAT_ID) {
    // TEMP: diagnosing a report that messages aren't reaching the tool
    // loop — logs only the numeric chat id (not message content) so we
    // can tell a chat-id mismatch apart from a downstream failure.
    console.log("telegram webhook: dropped message from unrecognized chat", { chatId });
    return NextResponse.json({ ok: true });
  }

  console.log("telegram webhook: processing message from admin chat");

  try {
    const reply = await runClaudeToolLoop({
      system: SYSTEM_PROMPT,
      userPrompt: text,
      tools: ADMIN_AGENT_TOOLS,
      executeTool: executeAdminAgentTool,
      maxTokens: 1024,
      maxTurns: 4,
    });
    await sendTelegramMessage(chatId, reply);
  } catch (err) {
    console.error("telegram admin agent failed", err);
    await sendTelegramMessage(chatId, "Something went wrong on my end — try again.").catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
