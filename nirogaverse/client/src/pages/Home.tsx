import { Link } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';

import leafBgImg from '../store/img/leaf_bg.png';
import ayurvaaniImg from '../store/img/ayurvaani.png';
import prakritiImg from '../store/img/prakriti.png';
import vivekaImg from '../store/img/viveka.png';

export default function Home() {
  return (
    <div className="home-page page-enter">
      {/* Hero Section — leaf_bg.png as immersive full-width banner */}
      <div className="hero-banner">
        <img src={leafBgImg} alt="NirogaVerse Banner" className="hero-banner-img" />
        <div className="hero-banner-overlay">
          <div className="hero-banner-content">
            <h1>
              <span className="hero-banner-title">NirogaVerse</span>
            </h1>
            <p className="hero-banner-tagline">
              AI-Powered Ayurvedic Wellness Ecosystem for Modern Living
            </p>
            <p className="hero-banner-subtitle">
              <em>Holistic Health • Ancient Wisdom • Modern Intelligence</em>
            </p>
          </div>
        </div>
      </div>

      {/* Welcome Text */}
      <div className="section-container" style={{ paddingTop: '2.5rem', paddingBottom: '1rem' }}>
        <div className="section-header">
          <h2 style={{ color: 'var(--accent)' }}>Welcome to NirogaVerse</h2>
          <p>
            NirogaVerse is a next-generation Ayurvedic Intelligence Platform combining{' '}
            <strong>Charaka Samhita</strong> wisdom, <strong>AI-powered analysis</strong>, and{' '}
            <strong>natural healing</strong>. Explore our three flagship tools designed to guide you
            toward balanced well-being.
          </p>
        </div>
      </div>

      {/* Three Pillars Section with actual logos */}
      <div className="section-container" style={{ paddingTop: 0 }}>
        <div className="features-grid">
          <Link to="/modules/ayurvaani" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="feature-card feature-card-ayurvaani">
              <div className="feature-logo-wrap">
                <img src={ayurvaaniImg} alt="AyurVaani" className="feature-logo-img" />
              </div>
              <h3>AyurVaani</h3>
              <p className="feature-card-subtitle">AI Ayurvedic Consultation</p>
              <p>
                Get bilingual Ayurvedic guidance through Voice + Chat. Generates home remedies, diet
                plans, lifestyle adjustments &amp; Ayurvedic assessment reports.
              </p>
              <span className="feature-link">
                Start Consultation <ArrowRight size={14} />
              </span>
            </div>
          </Link>

          <Link to="/modules/prakriti" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="feature-card feature-card-prakriti">
              <div className="feature-logo-wrap">
                <img src={prakritiImg} alt="PrakritiPratibimba" className="feature-logo-img" />
              </div>
              <h3>Prakriti Pratibimba</h3>
              <p className="feature-card-subtitle">Know Your Body–Mind Type</p>
              <p>
                Identify your Ayurvedic Prakriti (Vata, Pitta, Kapha) using AI-driven analysis for
                personalized health recommendations.
              </p>
              <span className="feature-link">
                Assess Prakriti <ArrowRight size={14} />
              </span>
            </div>
          </Link>

          <Link to="/modules/vaidya" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="feature-card feature-card-vaidya">
              <div className="feature-logo-wrap">
                <img src={vivekaImg} alt="VaidyaViveka" className="feature-logo-img" />
              </div>
              <h3>Vaidya Viveka</h3>
              <p className="feature-card-subtitle">Clinical Reasoning Engine</p>
              <p>
                A decision-support tool for Ayurvedic practitioners. Helps analyze symptoms and
                provide evidence-based Ayurvedic reasoning.
              </p>
              <span className="feature-link">
                Train Now <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Platform Overview & Objectives */}
      <div className="section-container">
        <div className="section-header">
          <h2 style={{ color: 'var(--accent)' }}>Platform Overview &amp; Objectives</h2>
        </div>
        <div className="features-grid">
          <div className="overview-card">
            <h4>
              <span className="overview-dot" style={{ background: '#86EFAC' }}></span>
              AyurVaani – How It Works
            </h4>
            <ul>
              <li>Speak or type your health concerns</li>
              <li>AI asks 5 diagnostic questions</li>
              <li>Generates Ayurvedic analysis</li>
              <li>Provides Home Remedies, Diet, Lifestyle, Precautions</li>
              <li>Creates Prescription report</li>
            </ul>
          </div>

          <div className="overview-card">
            <h4>
              <span className="overview-dot" style={{ background: '#FDE68A' }}></span>
              Prakriti Pratibimba – Objective
            </h4>
            <ul>
              <li>Identify your dominant Dosha (Vata/Pitta/Kapha)</li>
              <li>Provide personalized wellness guidelines</li>
              <li>Helps understand your natural constitution</li>
              <li>Supports food, lifestyle &amp; emotional balance</li>
            </ul>
          </div>

          <div className="overview-card">
            <h4>
              <span className="overview-dot" style={{ background: '#C4A882' }}></span>
              Vaidya Viveka – Purpose
            </h4>
            <ul>
              <li>Designed for students &amp; practitioners</li>
              <li>Offers clinical reasoning from Ayurvedic texts</li>
              <li>Generates differential diagnosis</li>
              <li>Suggests Ayurvedic management guidelines</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="cta-card">
          <Shield size={36} style={{ marginBottom: 16, opacity: 0.9 }} />
          <h2>Grounded in Classical Ayurveda</h2>
          <p>
            Every recommendation is validated against the Charaka Samhita — ensuring authenticity
            and safety in all guidance. AI meets ancient wisdom.
          </p>
          <Link className="btn btn-lg" to="/modules/ayurvaani">
            Begin Your Ayurvedic Journey
          </Link>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer-bar">
        <p>
          <strong>Disclaimer:</strong> This is an AI-generated Ayurvedic guidance. Use it only for
          supportive home-remedies. Not suitable for individuals below 16 years of age. For serious,
          severe, or persistent symptoms, consult a registered physician immediately.
        </p>
      </div>
    </div>
  );
}
