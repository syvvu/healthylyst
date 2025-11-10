// About / Responsible AI Tab
import React from 'react';
import TabNavigation, { PageHeader } from '../components/TabNavigation';
import { Shield, Eye, AlertCircle, Info, Mail, Github, Heart } from 'lucide-react';

const theme = {
  background: { primary: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef3c7 100%)', card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155', tertiary: '#64748b' },
  accent: { primary: '#0ea5e9', success: '#10b981' }
};

const AboutTab = ({ allHealthData, onOpenSettings }) => {
  return (
    <div className="min-h-screen pb-20" style={{ background: theme.background.primary }}>
      <PageHeader title="About & Responsible AI" onOpenSettings={onOpenSettings} allHealthData={allHealthData} />
      
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Our Mission */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
            <Heart className="w-6 h-6" style={{ color: theme.accent.primary }} />
            About HealthyLyst
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: theme.text.secondary }}>
            <strong>HealthyLyst</strong> helps users understand their health through responsible AI, not medical diagnosis.
          </p>
          <p className="mt-4 leading-relaxed" style={{ color: theme.text.secondary }}>
            Our platform uses machine learning to discover patterns and correlations in your health data, 
            empowering you with insights to make informed decisions about your wellness. We believe in 
            transparency, privacy, and putting you in control of your health journey.
          </p>
        </div>

        {/* How AI Works */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
            <Info className="w-6 h-6" style={{ color: theme.accent.primary }} />
            How AI Works
          </h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
              <p className="leading-relaxed" style={{ color: theme.text.secondary }}>
                <strong style={{ color: theme.text.primary }}>HealthyLyst</strong> is powered by <strong style={{ color: theme.text.primary }}>Gemini 2.5 Flash</strong>, 
                Google's advanced AI model, to provide intelligent health insights and pattern recognition.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2" style={{ color: theme.text.primary }}>
                Correlation Analysis
              </h3>
              <p className="leading-relaxed" style={{ color: theme.text.secondary }}>
                Our AI analyzes relationships between different health metrics over time. For example, 
                it might discover that poor sleep quality correlates with increased sugar intake the next day.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2" style={{ color: theme.text.primary }}>
                Anomaly Detection
              </h3>
              <p className="leading-relaxed" style={{ color: theme.text.secondary }}>
                The system learns your personal baseline for each metric and alerts you when values 
                deviate significantly from your normal patterns.
              </p>
            </div>
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 mt-0.5" style={{ color: theme.accent.success }} />
                <div>
                  <p className="font-semibold mb-1" style={{ color: theme.text.primary }}>
                    Your Data Stays Private
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: theme.text.secondary }}>
                    All analysis happens locally in your browser. Your data is encrypted, anonymized, 
                    and never shared with third parties. You own and control your data completely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Responsible AI */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
            <Shield className="w-6 h-6" style={{ color: theme.accent.primary }} />
            Responsible AI
          </h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: theme.text.primary }}>
                <AlertCircle className="w-5 h-5" style={{ color: theme.accent.primary }} />
                Ethical Use Disclaimer
              </h3>
              <p className="leading-relaxed" style={{ color: theme.text.secondary }}>
                <strong>Insights are for wellness awareness only.</strong> This platform is not a medical device 
                and does not provide medical advice, diagnosis, or treatment. Always consult healthcare professionals 
                for medical concerns.
              </p>
            </div>
            <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
              <h3 className="font-semibold mb-2" style={{ color: theme.text.primary }}>
                Data Security
              </h3>
              <ul className="space-y-2 text-sm" style={{ color: theme.text.secondary }}>
                <li className="flex items-start gap-2">
                  <span className="mt-1">🔒</span>
                  <span>All data is encrypted at rest and in transit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">👤</span>
                  <span>You own and control your data completely</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">🚫</span>
                  <span>No data is shared with third parties without your explicit consent</span>
                </li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
              <h3 className="font-semibold mb-2" style={{ color: theme.text.primary }}>
                Limitations
              </h3>
              <p className="leading-relaxed text-sm" style={{ color: theme.text.secondary }}>
                AI models may not be fully accurate. Patterns detected are correlations, not causations. 
                The system learns from your personal data, so accuracy improves over time. For medical advice, 
                always consult qualified healthcare professionals.
              </p>
            </div>
          </div>
        </div>

        {/* Transparency */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
            <Eye className="w-6 h-6" style={{ color: theme.accent.primary }} />
            Transparency
          </h2>
          <div className="space-y-3">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
              <p className="font-semibold mb-1" style={{ color: theme.text.primary }}>
                View Metrics Used in Each Insight
              </p>
              <p className="text-sm" style={{ color: theme.text.secondary }}>
                Every insight card shows which metrics were analyzed and the data sources used.
              </p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
              <p className="font-semibold mb-1" style={{ color: theme.text.primary }}>
                See Model Confidence and Data Sources
              </p>
              <p className="text-sm" style={{ color: theme.text.secondary }}>
                Click "See Evidence" on any insight to view statistical details, confidence scores, 
                and the underlying data that supports the finding.
              </p>
            </div>
          </div>
        </div>

        {/* Credits & Acknowledgements */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: theme.text.primary }}>
            Credits & Acknowledgements
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2" style={{ color: theme.text.primary }}>
                Developer
              </h3>
              <p className="leading-relaxed" style={{ color: theme.text.secondary }}>
                Developed by Sandy Wu for the Palo Alto Networks Hackathon.
              </p>
            </div>
            <div className="pt-4 border-t" style={{ borderColor: theme.border.primary }}>
              <h3 className="font-semibold mb-3" style={{ color: theme.text.primary }}>
                Contact & Feedback
              </h3>
              <div className="flex items-center gap-4">
                <a
                  href="sandywu0625@gmail.com"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-all"
                  style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">Send Feedback</span>
                </a>
                <a
                  href="https://github.com/syvvu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-all"
                  style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                >
                  <Github className="w-4 h-4" />
                  <span className="text-sm">GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutTab;

