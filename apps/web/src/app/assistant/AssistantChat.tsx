'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolsUsed?: string[];
  sources?: string[];
  timestamp: Date;
}

export default function AssistantChat() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get('orderNumber') || '';
  const initialQuery = searchParams.get('q') || '';
  const { user } = useAuth();

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [input, setInput] = useState(initialQuery);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Halo! Saya asisten AI MarketForge. Saya dapat membantu mencari informasi produk, memandu status pesanan Anda, atau menjelaskan kebijakan belanja.',
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Support Ticket Modal
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketOrder, setTicketOrder] = useState(initialOrderNumber);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ id: string } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const res = await api.ai.chat(textToSend, orderNumber.trim() || undefined);
      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        toolsUsed: res.tools_used,
        sources: res.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `Maaf, terjadi kendala saat memproses permintaan Anda: ${err?.message || 'Layanan AI sementara tidak tersedia.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDesc || submittingTicket) return;

    setSubmittingTicket(true);
    try {
      const res = await api.ai.createTicket({
        subject: ticketSubject,
        description: ticketDesc,
        order_number: ticketOrder.trim() || undefined,
      });
      setTicketResult(res);
      setTicketSubject('');
      setTicketDesc('');
    } catch (err: any) {
      alert(err?.message || 'Gagal membuat tiket bantuan.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  return (
    <section style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow">Dukungan AI Cerdas</p>
          <h1 style={{ margin: '0.25rem 0' }}>Asisten Virtual MarketForge</h1>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setTicketOrder(orderNumber);
            setShowTicketModal(true);
          }}
          style={{ fontSize: '0.85rem' }}
        >
          🎫 Buat Tiket Bantuan
        </button>
      </div>

      {/* Optional Order Context Input */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span className="muted" style={{ fontSize: '0.85rem' }}>Konteks Pesanan:</span>
        <input
          type="text"
          className="field"
          style={{ width: '220px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
          placeholder="Misal: ORD-20261103-XXXX"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />
        {orderNumber && (
          <button
            type="button"
            className="secondary-button"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            onClick={() => setOrderNumber('')}
          >
            Hapus Konteks
          </button>
        )}
        <span className="muted" style={{ fontSize: '0.75rem', marginLeft: 'auto' }}>
          *AI akan menggunakan nomor ini untuk memeriksa status pesanan secara otomatis
        </span>
      </div>

      {/* Chat Thread Container */}
      <div className="chat-container">
        <div className="chat-messages" style={{ minHeight: '380px', maxHeight: '520px', overflowY: 'auto' }}>
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={isUser ? 'chat-bubble chat-bubble-user' : 'chat-bubble chat-bubble-assistant'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    {isUser ? (user ? user.name : 'Anda') : 'MarketForge AI'}
                  </span>
                  <span className="muted" style={{ fontSize: '0.7rem' }}>
                    {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.92rem' }}>
                  {msg.text}
                </div>

                {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span className="muted" style={{ fontSize: '0.7rem' }}>Alat dipanggil:</span>
                    {msg.toolsUsed.map((t, idx) => (
                      <span key={idx} className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="chat-bubble chat-bubble-assistant" style={{ opacity: 0.8 }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>🤖 Asisten sedang merumuskan jawaban…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Chips */}
        <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', borderTop: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
          <span className="muted" style={{ fontSize: '0.75rem', alignSelf: 'center', whiteSpace: 'nowrap' }}>Saran:</span>
          {[
            'Cari produk harga di bawah 500 ribu',
            'Bagaimana cara membatalkan pesanan?',
            'Rekomendasikan produk terlaris',
            orderNumber ? `Periksa status pesanan ${orderNumber}` : 'Berapa biaya pengiriman standar?',
          ].map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="secondary-button"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', whiteSpace: 'nowrap' }}
              onClick={() => handleSend(prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Input Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="chat-input-bar">
          <input
            type="text"
            className="field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan sesuatu kepada MarketForge AI…"
            disabled={loading}
            style={{ fontSize: '0.9rem' }}
          />
          <button type="submit" className="button" disabled={loading || !input.trim()}>
            {loading ? '…' : 'Kirim'}
          </button>
        </form>
      </div>

      {/* Support Ticket Modal */}
      {showTicketModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Buat Tiket Bantuan Pelanggan</h2>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Jika asisten AI belum dapat menyelesaikan kendala Anda, tim support MarketForge siap membantu.
            </p>

            {ticketResult ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                <h3>Tiket Bantuan Terkirim!</h3>
                <p className="muted" style={{ fontSize: '0.875rem' }}>
                  ID Tiket: <code>{ticketResult.id}</code>
                </p>
                <p style={{ fontSize: '0.85rem' }}>
                  Tim kami akan menindaklanjuti laporan Anda melalui email terdaftar.
                </p>
                <button
                  type="button"
                  className="button"
                  style={{ marginTop: '1rem' }}
                  onClick={() => {
                    setTicketResult(null);
                    setShowTicketModal(false);
                  }}
                >
                  Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket}>
                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label htmlFor="t-order">Nomor Pesanan (Opsional)</label>
                  <input
                    id="t-order"
                    className="field"
                    value={ticketOrder}
                    onChange={(e) => setTicketOrder(e.target.value)}
                    placeholder="Contoh: ORD-20261103-XXXX"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label htmlFor="t-subj">Subjek Kendala</label>
                  <input
                    id="t-subj"
                    className="field"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Contoh: Kendala Pembayaran / Pengiriman"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="t-desc">Deskripsi Masalah</label>
                  <textarea
                    id="t-desc"
                    className="field"
                    rows={4}
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    placeholder="Jelaskan kendala secara mendalam agar kami dapat membantu lebih cepat…"
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowTicketModal(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="button" disabled={submittingTicket}>
                    {submittingTicket ? 'Mengirim Tiket…' : 'Kirim Tiket'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

