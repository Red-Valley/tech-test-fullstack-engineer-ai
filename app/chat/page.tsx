import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
        <p className="text-sm text-gray-400 mt-1">
          Ask anything about the games catalog.
        </p>
      </div>
      <ChatWindow />
    </div>
  );
}
