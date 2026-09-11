import { useState } from 'react';
import FeedbackModal from './FeedbackModal';
import { Phone, Mail, X } from 'lucide-react';

function ContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div className="feedback-overlay" onClick={onClose}>
            <div className="feedback-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Contact Us</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={20} />
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
                        <Phone size={18} style={{ color: '#22c55e' }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phone</div>
                            <a href="tel:8475043164" style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>8475043164</a>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
                        <Mail size={18} style={{ color: '#3B82F6' }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</div>
                            <a href="mailto:3337.rohit64@gmail.com" style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>3337.rohit64@gmail.com</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AboutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div className="feedback-overlay" onClick={onClose}>
            <div className="feedback-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>About</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0B6B3A, #25A76D)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: '1.3rem',
                    }}>R</div>
                    <div>
                        <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Rohit</h3>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Creator & Developer</span>
                    </div>
                </div>

                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.92rem' }}>
                    <p style={{ marginBottom: '0.75rem' }}>
                        <strong>Nirogaverse</strong> is an AI-powered Ayurvedic wellness platform built to bring
                        personalized, classical Ayurvedic healthcare to everyone through intelligent technology.
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>
                        The platform integrates three specialized modules — <strong>AyurVaani</strong> for bilingual
                        AI-driven consultations with home remedies, <strong>PrakritiPratibimba</strong> for tri-dosha
                        constitution assessment, and <strong>VaidyaViveka</strong> for clinical case-based learning.
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>
                        All guidance is grounded in the <strong>Charaka Samhita</strong> — one of the foundational
                        texts of Ayurveda — using RAG (Retrieval-Augmented Generation) to ensure classical authenticity
                        in every recommendation.
                    </p>
                    <p>
                        Built with React, TypeScript, Node.js, Prisma, PostgreSQL, and OpenAI — designed to make
                        Ayurvedic wisdom accessible, personalized, and evidence-backed.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Footer() {
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);

    return (
        <>
            <footer className="footer">
                <div className="footer-content">
                    <div>
                        <div className="footer-brand">Nirogaverse</div>
                        <div className="footer-copyright">
                            © {new Date().getFullYear()} Nirogaverse. All rights reserved.
                        </div>
                    </div>
                    <div className="footer-links">
                        <button onClick={() => setFeedbackOpen(true)}>Feedback</button>
                        <button onClick={() => setContactOpen(true)}>Contact</button>
                        <button onClick={() => setAboutOpen(true)}>About</button>
                    </div>
                </div>
            </footer>

            <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
            <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
            <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
        </>
    );
}
