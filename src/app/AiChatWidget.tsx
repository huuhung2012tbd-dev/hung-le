"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Xin chào quý khách! Em là Trợ lý AI của HÙNG LÊ. Em có thể hỗ trợ quý khách tư vấn loại dây điện, aptomat, công tắc hay thiết bị điện công trình nào ạ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Dạ, em có thể hỗ trợ gì thêm cho quý khách ạ?",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Kết nối bị gián đoạn. Quý khách vui lòng liên hệ hotline/Zalo: 0909 660 910 để được tư vấn ngay nhé!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Nút bấm mở Chatbot AI (Góc dưới bên trái để không đè Zalo/Điện thoại) */}
      <div className="ai-widget-btn-wrapper">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="ai-widget-toggle"
          aria-label="Tư vấn AI HÙNG LÊ"
        >
          <div className="ai-icon-anim">✨</div>
          <span className="ai-btn-text">Hỏi AI Tư Vấn</span>
        </button>
      </div>

      {/* Cửa sổ Chatbot Popup */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-title-group">
              <div className="ai-avatar">🤖</div>
              <div>
                <div className="ai-chat-title">Trợ lý AI HÙNG LÊ</div>
                <div className="ai-chat-status">
                  <span className="ai-online-dot"></span> Sẵn sàng tư vấn 24/7
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="ai-chat-close"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>

          {/* Gợi ý câu hỏi nhanh */}
          <div className="ai-quick-questions">
            <button
              onClick={() => {
                setInput("Nhà 2 tầng nên đi dây điện Cadivi cỡ nào?");
              }}
            >
              💡 Chọn dây điện nhà ở
            </button>
            <button
              onClick={() => {
                setInput("Máy lạnh 1.5 HP chọn Aptomat loại nào?");
              }}
            >
              ⚡ Chọn Aptomat máy lạnh
            </button>
          </div>

          {/* Danh sách tin nhắn */}
          <div className="ai-chat-body">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`ai-message ${
                  m.role === "user" ? "ai-msg-user" : "ai-msg-bot"
                }`}
              >
                <div className="ai-msg-bubble">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="ai-message ai-msg-bot">
                <div className="ai-msg-bubble ai-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form nhập tin nhắn */}
          <form onSubmit={handleSend} className="ai-chat-footer">
            <input
              type="text"
              placeholder="Hỏi công suất, chọn thiết bị điện..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}

