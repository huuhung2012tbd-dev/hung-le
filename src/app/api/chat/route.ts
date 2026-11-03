import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const MODEL = "gemini-3.6-flash";

type ChatMessage = {
  role: string;
  content: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function askGemini(apiKey: string, prompt: string) {
  const ai = new GoogleGenAI({ apiKey });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await ai.interactions.create({
        model: MODEL,
        input: prompt,
        system_instruction: `
Bạn là HÙNG LÊ AI, trợ lý tư vấn sản phẩm thiết bị điện.

QUY TẮC:
- Luôn trả lời bằng tiếng Việt, lịch sự, dễ hiểu.
- Chỉ cung cấp thông tin sản phẩm có trong dữ liệu website.
- Không tự bịa tên, giá, mã SKU hoặc thông số.
- Giá trên website chỉ là giá tham khảo.
- Không tự xác nhận tồn kho thực tế.
- Không hướng dẫn khách tự đấu nối hoặc sửa chữa điện.
- Khuyên khách tham khảo thợ điện có chuyên môn khi cần tư vấn kỹ thuật an toàn.
- Có thể giới thiệu hotline/Zalo 0909 660 910.
        `,
        store: false,
        generation_config: {
          thinking_level: "low",
        },
      });

      return result.output_text?.trim() || "";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      const isTemporaryError =
        message.includes("503") ||
        message.includes("429") ||
        message.toLowerCase().includes("overloaded");

      console.error(`Gemini attempt ${attempt} failed:`, message);

      if (!isTemporaryError || attempt === 3) {
        throw error;
      }

      await delay(attempt * 5000);
    }
  }

  return "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const messages: ChatMessage[] = Array.isArray(body.messages)
      ? body.messages
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { reply: "Bạn hãy nhập câu hỏi nhé!" },
        { status: 400 }
      );
    }

    const history = messages
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .slice(-12)
      .map((m) => ({
        role: m.role === "assistant" ? "Trợ lý" : "Khách hàng",
        content: m.content.slice(0, 2000),
      }));

    if (!supabase) {
      return NextResponse.json(
        { reply: "Hệ thống dữ liệu chưa được cấu hình." },
        { status: 500 }
      );
    }

    const { data: products, error } = await supabase
      .from("products")
      .select(
        "name, slug, sku, origin, description, reference_price, availability"
      )
      .eq("is_published", true)
      .limit(30);

    if (error) {
      console.error("Supabase error:", error.message);

      return NextResponse.json(
        { reply: "Hiện chưa thể tải danh mục sản phẩm." },
        { status: 500 }
      );
    }

    const prompt = `
DỮ LIỆU SẢN PHẨM HÙNG LÊ:
${JSON.stringify(products ?? [], null, 2)}

LỊCH SỬ TRÒ CHUYỆN:
${history.map((m) => `${m.role}: ${m.content}`).join("\n\n")}

Hãy trả lời tin nhắn cuối cùng của khách hàng.
Chỉ sử dụng dữ liệu sản phẩm được cung cấp.
`;

    // Chỉ sử dụng một API key
    const apiKey = process.env.GEMINI_API_KEY_PRIMARY;

    if (!apiKey) {
      return NextResponse.json(
        { reply: "Hệ thống AI chưa được cấu hình API key." },
        { status: 503 }
      );
    }

    const reply = await askGemini(apiKey, prompt);

    if (reply) {
      return NextResponse.json({ reply });
    }

    return NextResponse.json(
      {
        reply:
          "Trợ lý AI chưa tạo được câu trả lời. Bạn vui lòng thử lại nhé!",
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Chat API error:", error);

    return NextResponse.json(
      {
        reply:
          "Trợ lý AI đang bận. Bạn vui lòng thử lại hoặc liên hệ Zalo 0909 660 910 nhé!",
      },
      { status: 503 }
    );
  }
}