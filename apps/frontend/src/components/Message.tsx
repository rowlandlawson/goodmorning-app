"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Message = {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);

  const fetchMessages = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();

      // ✅ FIX: the backend response is { success, count, data }
      // so setMessages to the `data` array (or [] if missing)
      setMessages(data.data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-800">📨 Messages</h1>
              <Link
                href="/"
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Form
              </Link>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
                <span className="text-gray-600">Loading messages...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">📨 Messages</h1>
              <p className="text-gray-600 mt-1">
                {messages.length} message{messages.length !== 1 ? "s" : ""} collected
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchMessages(true)}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm border border-gray-200 disabled:opacity-50"
              >
                {refreshing ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Refresh
              </button>
              <Link
                href="/"
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Message
              </Link>
            </div>
          </div>

          {/* Messages List */}
          {messages.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No messages yet</h3>
              <p className="text-gray-600 mb-6">Be the first to share your thoughts!</p>
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md"
              >
                Create First Message
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">{message.name}</h3>
                      <p className="text-blue-600 text-sm">{message.email}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {formatDate(message.created_at)}
                      </span>
                      <button
                        onClick={async () => {
                          const ok = window.confirm("Delete this message? This action cannot be undone.");
                          if (!ok) return;
                          setDeletingIds((s) => [...s, message.id]);
                          try {
                            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                            const res = await fetch(`${API_URL}/api/messages/${message.id}`, {
                              method: "DELETE",
                            });
                            if (!res.ok) throw new Error("Failed to delete message");
                            setMessages((prev) => prev.filter((m) => m.id !== message.id));
                          } catch (err) {
                            console.error("Error deleting message:", err);
                            alert("Failed to delete message");
                          } finally {
                            setDeletingIds((s) => s.filter((id) => id !== message.id));
                          }
                        }}
                        disabled={deletingIds.includes(message.id)}
                        className="inline-flex items-center px-3 py-1 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors duration-150 text-sm disabled:opacity-60"
                        aria-label={`Delete message ${message.id}`}
                      >
                        {deletingIds.includes(message.id) ? (
                          <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                          </svg>
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{message.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}