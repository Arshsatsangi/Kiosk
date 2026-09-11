import { useState } from 'react';
import { usePrakritiStore } from '../store/chatStore';
import { niroApi } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2 } from 'lucide-react';
import prakritiImg from '../store/img/prakriti.png';

const prakritiQuestions = [
  { label: 'Body Build', options: ['Thin, finds it hard to gain weight', 'Medium build', 'Broad, gains weight easily'] },
  { label: 'Skin Texture', options: ['Dry/rough/cool', 'Warm/soft/redness', 'Oily/thick/smooth'] },
  { label: 'Eyes', options: ['Small/dry/active', 'Medium/sharp/intense', 'Large/calm/moist'] },
  { label: 'Hair Type', options: ['Dry/frizzy/brittle', 'Fine/early grey', 'Thick/oily/wavy'] },
  { label: 'Walking Style', options: ['Fast/restless', 'Purposeful', 'Slow/steady'] },
  { label: 'Appetite Pattern', options: ['Irregular', 'Strong & sharp', 'Low hunger'] },
  { label: 'Digestion', options: ['Gas/bloating/constipation', 'Strong but acidity', 'Slow/heavy digestion'] },
  { label: 'Body Temperature', options: ['Cold hands/feet', 'Feels warm', 'Neutral/cool'] },
  { label: 'Sweating', options: ['Minimal sweating', 'Sweats a lot', 'Moderate sweating'] },
  { label: 'Sleep Pattern', options: ['Light/fragmented', 'Moderate', 'Long/heavy'] },
  { label: 'Stress Response', options: ['Anxiety/overthinking', 'Anger/irritation', 'Withdrawal/lethargy'] },
  { label: 'Decision Making', options: ['Quick but uncertain', 'Fast & confident', 'Slow but thorough'] },
  { label: 'Memory', options: ['Good short-term', 'Sharp & analytical', 'Slow but excellent long-term'] },
  { label: 'Communication', options: ['Fast & expressive', 'Direct & clear', 'Calm & gentle'] },
  { label: 'Weather Preference', options: ['Warm & humid', 'Cool climate', 'Dry & warm'] },
];

export default function PrakritiPratibimbaPage() {
  const { answers, result, setAnswers, setResult } = usePrakritiStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const submitAssessment = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const assessmentText = prakritiQuestions
        .map((q) => {
          const selectedIndex = answers[q.label];
          const selected = typeof selectedIndex === 'number' ? q.options[selectedIndex] : 'Not answered';
          return `${q.label}: ${selected}`;
        })
        .join('\n');

      const sessionRaw = await niroApi.createSession('PRAKRITIPRATIBIMBA');
      const sessionId = sessionRaw.data.session.id;

      const response = await niroApi.sendMessage({
        sessionId,
        message: `Prakriti questionnaire responses:\n${assessmentText}`
      });

      setResult(response.data.message.content);
    } catch (err: any) {
      setErrorMsg('Failed to process. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="main-content">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="prakriti-hero-strip">
          <img src={prakritiImg} alt="PrakritiPratibimba" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#fff' }}>PrakritiPratibimba</h1>
            <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9 }}>AI-Assisted Ayurvedic Constitution Assessment</p>
          </div>
        </div>
        
        <div style={{ marginBottom: '2rem', fontSize: '0.9rem' }} className="text-secondary">
          <h3 className="card-title" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>🌿 Understand Your Doshas</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>According to Ayurveda, every person is a mix of <strong>three doshas</strong> — energies that shape body and mind.</p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid var(--border)' }}>Dosha</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid var(--border)' }}>Elements</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid var(--border)' }}>Personality</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid var(--border)' }}>When Imbalanced</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)', fontWeight: 'bold' }}>Vata</td>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)' }}>Air + Ether</td>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)' }}>Creative, energetic, quick-thinking</td>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)' }}>Anxiety, dryness, irregular habits</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)', fontWeight: 'bold' }}>Pitta</td>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)' }}>Fire + Water</td>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)' }}>Focused, ambitious, confident</td>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)' }}>Anger, overheating, irritability</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)', fontWeight: 'bold' }}>Kapha</td>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)' }}>Earth + Water</td>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)' }}>Calm, stable, compassionate</td>
                <td style={{ padding: '8px 12px', border: '1px solid var(--border)' }}>Lethargy, heaviness, attachment</td>
              </tr>
            </tbody>
          </table>
          <p>Take a moment to read each dosha's essence above 🌸<br/>
          Then answer the questions below by choosing which description fits you best.<br/><br/>
          Answer 15 questions across physical, physiological & psychological aspects.
          </p>
        </div>

        {errorMsg && (
          <div className="error-message">
            ⚠️ {errorMsg}
          </div>
        )}

        {result ? (
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Ayurvedic Constitution Analysis</h2>
            <div className="message-content" style={{ color: 'var(--text-primary)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            </div>
            <button 
              onClick={reset} 
              className="btn btn-primary"
              style={{ marginTop: '2rem' }}>
              Take Assessment Again
            </button>
          </div>
        ) : (
          <div className="card">
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {prakritiQuestions.map((question) => (
                <div key={question.label}>
                  <div style={{ 
                    display: 'inline-block', 
                    background: 'var(--accent)', 
                    color: '#fff', 
                    padding: '2px 8px', 
                    borderRadius: 4, 
                    fontSize: '0.85rem', 
                    fontWeight: 600, 
                    marginBottom: '0.5rem' 
                  }}>
                    {question.label}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {question.options.map((option, idx) => {
                      const isSelected = answers[question.label] === idx;
                      return (
                        <button
                          key={option}
                          onClick={() => setAnswers((prev) => ({ ...prev, [question.label]: idx }))}
                          style={{
                            background: isSelected ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                            color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                            border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ 
                            width: 14, 
                            height: 14, 
                            borderRadius: '50%', 
                            background: isSelected ? 'var(--accent)' : 'var(--bg-tertiary)',
                            border: '2px solid transparent'
                          }} />
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              <button 
                onClick={reset}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Clear
              </button>
              <button 
                onClick={() => void submitAssessment()} 
                disabled={loading}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {loading ? <Loader2 className="spin" size={20} /> : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
