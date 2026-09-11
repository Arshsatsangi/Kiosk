import { useEffect, useRef, useState, useCallback } from 'react';
import { Bot, Download, Mic, MicOff, Plus, Send, Trash2, Volume2, VolumeX, Loader2, Stethoscope } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { niroApi } from '../services/api';
import { useChatStore } from '../store/chatStore';
import ayurvaaniImg from '../store/img/ayurvaani.png';

type Session = {
  id: string;
  title: string;
  createdAt: string;
};

type ProfileData = {
  name?: string;
  age?: number;
  gender?: string;
  weightKg?: number;
  mobile?: string;
  problem?: string;
  findings?: string;
};

export default function NirogaverseChat() {
  const activeModule = 'AYURVAANI';
  const {
    selectedSession,
    message,
    messages,
    setSelectedSession,
    setMessage,
    setMessages,
  } = useChatStore();

  const [loadingReply, setLoadingReply] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const recognitionRef = useRef<any>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pendingVoiceRef = useRef<string>('');
  const queryClient = useQueryClient();

  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['niroSessions', activeModule],
    queryFn: () => niroApi.getSessions(activeModule).then((r) => r.data),
  });

  const loadSession = async (sessionId: string) => {
    try {
      const response = await niroApi.getSession(sessionId);
      const mapped = response.data.session.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));
      setMessages(mapped);
      const ctx = response.data.session.context || {};
      setProfileData(ctx.profileData || null);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg('Failed to load session. Is the server running?');
    }
  };

  const refreshSessions = () => {
    queryClient.invalidateQueries({ queryKey: ['niroSessions', activeModule] });
  };

  const ensureSession = async () => {
    if (selectedSession) return selectedSession;
    const response = await niroApi.createSession(activeModule);
    const created = response.data.session.id as string;
    setSelectedSession(created);
    await loadSession(created);
    refreshSessions();
    return created;
  };

  const sendMessageAction = useCallback(async (rawMessage: string) => {
    const payload = rawMessage.trim();
    if (!payload) return;
    setErrorMsg('');
    let sessionId: string;
    try {
      sessionId = await ensureSession();
    } catch (err: any) {
      setErrorMsg('Cannot connect to server. Please make sure the backend is running.');
      return;
    }
    const optimistic = {
      id: `local-${Date.now()}`,
      role: 'USER' as const,
      content: payload,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setMessage('');
    setLoadingReply(true);
    try {
      const response = await niroApi.sendMessage({ sessionId, message: payload });
      setMessages((prev) => [...prev, response.data.message]);
      refreshSessions();
    } catch (err: any) {
      const errText = err.response?.data?.error || 'Failed to get response. Please try again.';
      setErrorMsg(errText);
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'ASSISTANT' as const, content: `⚠️ Error: ${errText}`, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setLoadingReply(false);
    }
  }, [selectedSession]);

  const createNewSession = async () => {
    try {
      const response = await niroApi.createSession(activeModule);
      setSelectedSession(response.data.session.id);
      setMessages([]);
      setProfileData(null);
      setErrorMsg('');
      refreshSessions();
    } catch (err: any) {
      setErrorMsg('Cannot connect to server. Please check backend.');
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await niroApi.deleteSession(sessionId);
      if (selectedSession === sessionId) {
        setSelectedSession(null);
        setMessages([]);
        setProfileData(null);
      }
      refreshSessions();
    } catch { /* ignore */ }
  };

  // ── TTS ──
  const extractHindiText = (text: string) => {
    const parts = text.split('---');
    return parts.length > 1 ? parts[parts.length - 1] : text;
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const targetText = extractHindiText(text);
    const cleanText = targetText.replace(/[#*_~`>|]/g, '').replace(/\[.*?\]/g, '').replace(/\n{2,}/g, '. ').replace(/\n/g, '. ').replace(/\s+/g, ' ').trim().slice(0, 1200);
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'hi-IN';
    const age = profileData?.age || 40;
    utterance.rate = age >= 60 ? 0.8 : 0.95;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const matchingVoice = voices.find((v) => v.lang.startsWith('hi') && v.lang.includes('IN')) || voices.find((v) => v.lang.startsWith('hi'));
      if (matchingVoice) utterance.voice = matchingVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };

  const lastSpokenMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoSpeak || messages.length === 0) return;
    const last = messages[messages.length - 1];
    
    // Check if it's a new message
    if (last.id === lastSpokenMessageIdRef.current) return;

    if (last.role === 'ASSISTANT' && !last.content.startsWith('⚠️ Error:')) {
      speakText(last.content);
      lastSpokenMessageIdRef.current = last.id;
      
      if (selectedSession) {
        niroApi.getSession(selectedSession).then(res => {
          setProfileData(res.data.session.context?.profileData || null);
        }).catch(() => {});
      }
    }
  }, [messages, autoSpeak, selectedSession]);

  // ── Voice Input — auto-send on stop ──
  useEffect(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) { setVoiceSupported(false); return; }
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN';
    let accumulatedTranscript = '';
    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) fullTranscript += event.results[i][0].transcript;
      }
      accumulatedTranscript = fullTranscript.trim();
      pendingVoiceRef.current = accumulatedTranscript;
      setMessage(accumulatedTranscript);
    };
    recognition.onend = () => {
      setIsListening(false);
      const captured = pendingVoiceRef.current.trim();
      if (captured) {
        pendingVoiceRef.current = '';
        setMessage(captured); // Populate input box but do NOT auto-send so user can edit.
      }
    };
    recognition.onerror = () => { setIsListening(false); };
    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      pendingVoiceRef.current = '';
      setMessage('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // ── PDF Download — Professional layout (no extra dependencies) ──
  const downloadReportPdf = async () => {
    if (!selectedSession || !profileData?.findings) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 18;

    const checkPage = (needed: number) => { if (y + needed > ph - 20) { doc.addPage(); y = 18; } };

    // ── Draw a simple grid table with text wrapping ──
    const drawGrid = (headers: string[], rows: string[][], colW: number[], sx: number) => {
      const tw = colW.reduce((a, b) => a + b, 0);
      
      // Header
      checkPage(12);
      doc.setFillColor(11, 107, 58);
      doc.rect(sx, y, tw, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      let cx = sx;
      headers.forEach((h, i) => { doc.text(h, cx + 2, y + 5.5); cx += colW[i]; });
      y += 8;
      
      // Rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      let tableStartY = y - 8;
      
      rows.forEach((row, ri) => {
        // Calculate dynamic row height
        let maxLines = 1;
        const cellLines: string[][] = [];
        row.forEach((cell, ci) => {
          const lines = doc.splitTextToSize(cell, colW[ci] - 4);
          cellLines.push(lines);
          if (lines.length > maxLines) maxLines = lines.length;
        });
        
        const rh = Math.max(8, maxLines * 4 + 4);
        checkPage(rh + 2);
        
        // If page broke, we need to redraw table top border starting point
        if (y === 18 && ri > 0) {
           doc.setDrawColor(11, 107, 58); doc.setLineWidth(0.4);
           doc.rect(sx, tableStartY, tw, y - tableStartY - 18);
           tableStartY = 18;
           // optionally redraw header here, but let's keep it simple
        }

        if (ri % 2 === 0) { doc.setFillColor(245, 250, 247); doc.rect(sx, y, tw, rh, 'F'); }
        
        cx = sx;
        cellLines.forEach((lines, ci) => {
          let ly = y + 5.5;
          for (const line of lines) {
            doc.text(line, cx + 2, ly);
            ly += 4.5;
          }
          cx += colW[ci];
        });
        
        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
        doc.line(sx, y + rh, sx + tw, y + rh);
        y += rh;
      });
      // Outer border
      doc.setDrawColor(11, 107, 58); doc.setLineWidth(0.4);
      doc.rect(sx, tableStartY, tw, y - tableStartY);
      y += 5;
    };

    // ── Draw patient details grid ──
    const drawPatientDetails = (data: [string, string, string, string][]) => {
      const rh = 9;
      const cw = [30, (pw - 28 - 60) / 2, 30, (pw - 28 - 60) / 2];
      const sx = 14;
      data.forEach((row) => {
        checkPage(rh + 2);
        let cx = sx;
        row.forEach((cell, ci) => {
          if (ci === 0 || ci === 2) {
            doc.setFillColor(237, 247, 240); doc.rect(cx, y, cw[ci], rh, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
          } else {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
          }
          doc.setTextColor(0, 0, 0);
          doc.text(cell, cx + 3, y + 6.5);
          cx += cw[ci];
        });
        doc.setDrawColor(37, 109, 133); doc.setLineWidth(0.25);
        cx = sx;
        for (let i = 0; i <= 4; i++) {
          const lx = i < 4 ? cx : sx + cw.reduce((a, b) => a + b, 0);
          doc.line(lx, y, lx, y + rh);
          if (i < 4) cx += cw[i];
        }
        const totalW = cw.reduce((a, b) => a + b, 0);
        doc.line(sx, y + rh, sx + totalW, y + rh);
        doc.line(sx, y, sx + totalW, y);
        y += rh;
      });
      y += 6;
    };

    // ── HEADER ──
    doc.setFillColor(11, 107, 58);
    doc.rect(0, 0, pw, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('AyurVedic Consultant Report', pw / 2, 14, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Generated by NirogaVerse', pw / 2, 22, { align: 'center' });
    doc.setFontSize(9);
    doc.text('Intelligent Ayurveda for Personalized Well-Being', pw / 2, 28, { align: 'center' });
    doc.setDrawColor(37, 109, 133); doc.setLineWidth(0.5);
    doc.line(14, 35, pw - 14, 35);
    y = 46;
    doc.setTextColor(0, 0, 0);

    // ── PATIENT DETAILS ──
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 107, 58);
    doc.text('Patient Details', 14, y); y += 5;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    drawPatientDetails([
      ['Name', profileData?.name || '-', 'Age', String(profileData?.age || '-')],
      ['Gender', profileData?.gender || '-', 'Weight', `${profileData?.weightKg || '-'} kg`],
      ['Mobile', profileData?.mobile || '-', 'Date', now],
    ]);

    // ── Parse report sections ──
    const finalMsg = messages[messages.length - 1]?.content || '';
    const englishPart = finalMsg.split('\u0939\u093f\u0902\u0926\u0940')[0] || finalMsg;

    const parseSection = (text: string, header: string): string => {
      const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('###?\\s*' + escaped + '[\\s\\S]*?(?=###|$)', 'i');
      const match = text.match(regex);
      if (!match) return '';
      return match[0].replace(new RegExp('###?\\s*' + escaped, 'i'), '').trim();
    };

    const cleanBullets = (text: string): string[] => {
      return text.split('\n').map(l => l.replace(/^[-\u2022*]\s*/, '').trim()).filter(l => l.length > 0 && !l.startsWith('|'));
    };

    const addTitle = (title: string) => {
      checkPage(18);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 109, 133);
      doc.text(title, 14, y); y += 7;
      doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    };

    const addPara = (text: string) => {
      if (!text) return;
      const clean = text.replace(/[#*_~`>|\u2014]/g, '').replace(/\[.*?\]/g, '').trim();
      if (!clean) return;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(clean, pw - 28);
      for (const line of lines) { checkPage(7); doc.text(line, 14, y); y += 6; }
      y += 3;
    };

    const addBullets = (items: string[]) => {
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      items.forEach(item => {
        const lines = doc.splitTextToSize('\u2022 ' + item, pw - 34);
        for (const line of lines) { checkPage(6); doc.text(line, 18, y); y += 6; }
      });
      y += 3;
    };

    // Previous Visit
    const prevVisitSection = parseSection(englishPart, 'Previous Visit (Most Recent)');
    if (prevVisitSection) {
       const prevLines = prevVisitSection.split('\n').filter(l => l.includes('|') && !l.includes('---'));
       if (prevLines.length > 1) {
         addTitle('Previous Visit (Most Recent)');
         const prevData = prevLines.slice(1).map(line => line.split('|').map(c => c.trim()).filter(c => c));
         drawGrid(['Problem', 'Date'], prevData, [pw - 28 - 40, 40], 14);
       }
    }

    // Main Problem
    addTitle('Main Problem');
    addPara(parseSection(englishPart, 'Main Problem') || profileData?.problem || '-');

    // Diagnosis
    addTitle('Diagnosis (Ayurvedic View)');
    addPara(parseSection(englishPart, 'Diagnosis (Ayurvedic View)'));

    // Gharelu Upchar
    addTitle('Gharelu Upchar (Home Remedies)');
    const ghItems = cleanBullets(parseSection(englishPart, 'Gharelu Upchar (Home Remedies)'));
    if (ghItems.length === 0) {
      // Fallback in case " (Home Remedies)" is omitted
      addBullets(cleanBullets(parseSection(englishPart, 'Gharelu Upchar')));
    } else {
      addBullets(ghItems);
    }

    // Medications table
    const medsSection = parseSection(englishPart, 'Charaka Samhita');
    const medsLines = medsSection.split('\n').filter(l => l.includes('|') && !l.includes('---'));
    if (medsLines.length > 1) {
      addTitle('Charaka Samhita\u2013Guided Medications');
      const medsData = medsLines.slice(1).map(line => line.split('|').map(c => c.trim()).filter(c => c));
      drawGrid(['Medicine', 'Dose', 'Frequency', 'Duration', 'Notes'], medsData, [45, 25, 30, 30, pw - 28 - 130], 14);
    }

    // Diet
    addTitle('Dietary Advice');
    const dItems = cleanBullets(parseSection(englishPart, 'Dietary Advice'));
    if (dItems.length > 0) addBullets(dItems);

    // Lifestyle
    addTitle('Lifestyle Advice');
    const lItems = cleanBullets(parseSection(englishPart, 'Lifestyle Advice'));
    if (lItems.length > 0) addBullets(lItems);

    // Precautions
    addTitle('Precautions / When to Seek Help');
    const pItems = cleanBullets(parseSection(englishPart, 'Precautions'));
    if (pItems.length > 0) addBullets(pItems);

    // Follow-up
    addTitle('Follow-up');
    addPara(parseSection(englishPart, 'Follow-up'));

    // ── Footer ──
    checkPage(20); y += 5;
    doc.setDrawColor(11, 107, 58); doc.setLineWidth(0.5);
    doc.line(14, y, pw - 14, y); y += 6;
    doc.setFontSize(8); doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'italic');
    const disc = 'Disclaimer: This is AI-generated feedback, not a substitute for in-person medical care. If symptoms are severe or persist, consult a registered physician immediately.';
    const dLines = doc.splitTextToSize(disc, pw - 28);
    for (const line of dLines) { doc.text(line, 14, y); y += 5; }

    const safeName = (profileData?.name || 'patient').replace(/\s+/g, '_').toLowerCase();
    const ds = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    doc.save(`prescription_${safeName}_${ds}.pdf`);
  };

  // ── Effects ──
  useEffect(() => { if (!selectedSession) return; void loadSession(selectedSession); }, [selectedSession]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loadingReply]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
    }
  }, []);

  return (
    <div className={`chat-container ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
      {/* ── Sidebar ── */}
      <div className="chat-sidebar">
        <div className="sidebar-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0' }}>
            <img src={ayurvaaniImg} alt="AyurVaani" style={{ width: 32, height: 32, borderRadius: 8 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent)' }}>AyurVaani</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AI Consultation</div>
            </div>
          </div>
          <button className="new-chat-btn" onClick={() => void createNewSession()}>
            <Plus size={18} /> New Session
          </button>
        </div>

        <div className="session-list">
          {loadingSessions ? (
            <div className="loading" style={{ padding: '1rem', fontSize: '0.85rem' }}>Loading sessions...</div>
          ) : (
            sessionsData?.sessions?.map((session: Session) => (
              <div key={session.id} className={`session-item ${selectedSession === session.id ? 'active' : ''}`} onClick={() => setSelectedSession(session.id)}>
                <div className="session-item-info">
                  <h4>{session.title || 'Session'}</h4>
                  <span>{new Date(session.createdAt).toLocaleString()}</span>
                </div>
                <button className="delete-session-btn" onClick={(e) => { e.stopPropagation(); void deleteSession(session.id); }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main Chat ── */}
      <div className="chat-main">
        <div className="ayur-chat-header">
          <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'static', marginRight: 8 }}>
            ☰
          </button>
          <Stethoscope size={22} style={{ color: 'var(--accent)' }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: 0, fontSize: '1.05rem', fontWeight: 700 }}>AyurVaani</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>Voice-enabled bilingual Ayurvedic consultation</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn"
              onClick={() => { if (autoSpeak) stopSpeaking(); setAutoSpeak((prev) => !prev); }}
              style={{ background: autoSpeak ? 'rgba(11, 107, 58, 0.08)' : 'var(--bg-tertiary)', color: autoSpeak ? 'var(--accent)' : 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
            >
              {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {autoSpeak ? ' Hindi' : ' Muted'}
            </button>
          </div>
        </div>

        <div className="chat-messages" ref={messagesContainerRef}>
          {!selectedSession && (
            <div className="chat-welcome">
              <img src={ayurvaaniImg} alt="AyurVaani" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 16 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <h2>AyurVaani</h2>
              <p>Create a session to begin your bilingual Ayurvedic consultation with voice support.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => void createNewSession()}>
                <Plus size={16} /> Start New Session
              </button>
            </div>
          )}

          {selectedSession && messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role.toLowerCase()}`}>
              {msg.role === 'ASSISTANT' && (
                <div className="msg-avatar assistant-avatar"><Bot size={16} /></div>
              )}
              <div className="message-body">
                <div className="message-content">
                  {msg.role === 'ASSISTANT' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  ) : (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  )}
                  {msg.role === 'ASSISTANT' && msg.content.includes('AyurVedic Consultant Report') && (
                    <div style={{ marginTop: 15, padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(134, 239, 172, 0.2)' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--accent)' }}>Your Comprehensive Report is Ready</h4>
                      <button onClick={() => void downloadReportPdf()} className="btn" style={{ background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '6px 12px' }}>
                        <Download size={14} /> Download Prescription PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loadingReply && (
            <div className="message assistant">
              <div className="msg-avatar assistant-avatar"><Bot size={16} /></div>
              <div className="message-body">
                <div className="message-content">
                  <div className="thinking-dots"><span></span><span></span><span></span></div>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ margin: '0.75rem 2rem', padding: '0.75rem 1rem', background: 'var(--error-bg)', borderRadius: 10, color: 'var(--error)' }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* ── Input Area ── */}
        <div className="ayur-input-area">
          <div className="ayur-input-box">
            {voiceSupported && (
              <button type="button" onClick={toggleListening} className={`ayur-mic-btn ${isListening ? 'listening' : ''}`} title={isListening ? 'Tap to stop & send' : 'Tap to speak'}>
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}
            <textarea
              className="ayur-text-input"
              placeholder={isListening ? "🎙 Listening... Tap mic to stop & send" : "Type your message or tap mic to speak..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessageAction(message); } }}
              rows={1}
              disabled={loadingReply}
            />
            <button className="ayur-send-btn" onClick={() => void sendMessageAction(message)} disabled={loadingReply || !message.trim()}>
              {loadingReply ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </div>
          {isListening && (
            <div className="ayur-listening-indicator">
              <span className="ayur-pulse-dot"></span>
              Listening... Speak freely, then tap mic to send
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
