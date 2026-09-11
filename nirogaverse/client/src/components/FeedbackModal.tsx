import { useState } from 'react';

const EMAILJS_CONFIG = {
    SERVICE_ID: 'service_8ujmv7v',
    FEEDBACK_TEMPLATE_ID: 'template_b95bqvh',
    PUBLIC_KEY: 'aCo2fdhUWDUmW7Jvp',
};

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const [name, setName] = useState('');
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!name.trim() || !feedbackMsg.trim() || rating === 0) return;
        setSending(true);
        setError('');

        try {
            const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: EMAILJS_CONFIG.SERVICE_ID,
                    template_id: EMAILJS_CONFIG.FEEDBACK_TEMPLATE_ID,
                    user_id: EMAILJS_CONFIG.PUBLIC_KEY,
                    template_params: {
                        from_name: name,
                        rating: `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)`,
                        message: feedbackMsg,
                        email: '3337.rohit64@gmail.com',
                        to_email: '3337.rohit64@gmail.com',
                    },
                }),
            });

            if (resp.ok || resp.status === 200) {
                setSent(true);
            } else {
                setError('Failed to send feedback. Please try again.');
            }
        } catch (e) {
            setError('Network error. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleClose = () => {
        setSent(false);
        setName('');
        setRating(0);
        setFeedbackMsg('');
        setError('');
        onClose();
    };

    return (
        <div className="feedback-overlay" onClick={handleClose}>
            <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
                {sent ? (
                    <div className="feedback-success">
                        <div className="check-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            Thank You!
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Your feedback has been sent successfully. We appreciate your input!
                        </p>
                        <button className="btn btn-primary" onClick={handleClose}>
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        <h2>Share Your Feedback</h2>
                        <p className="modal-subtitle">
                            Help us improve Nirogaverse
                        </p>

                        <div className="form-group">
                            <label className="form-label">Your Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Rating</label>
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        aria-label={`${star} star`}
                                    >
                                        {star <= (hoverRating || rating) ? '★' : '☆'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Your Message</label>
                            <textarea
                                placeholder="Tell us what you think..."
                                value={feedbackMsg}
                                onChange={(e) => setFeedbackMsg(e.target.value)}
                            />
                        </div>

                        {error && (
                            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>
                        )}

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={handleClose}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={!name.trim() || !feedbackMsg.trim() || rating === 0 || sending}
                            >
                                {sending ? 'Sending...' : 'Submit Feedback'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
