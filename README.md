# HealthyLyst - Personal Health & Wellness Aggregator

A sophisticated health data aggregation and analysis platform that integrates multiple data sources to provide comprehensive insights into your wellness journey.

## Video Demo Link
https://youtu.be/qgKR6bc6vF0

## 🏆 Hackathon Submission Highlights

This application demonstrates **excellence in multi-source data integration** and **AI-powered health insights** by:

### Key Differentiators

✅ **Multi-Source Data Integration** - Integrates 5+ health data sources (Sleep, Activity, Nutrition, Vitals, Wellness)  
✅ **Time-Lagged Correlation Analysis** - Discovers how today's actions affect tomorrow's health  
✅ **Rolling Baseline Anomaly Detection** - Identifies unusual patterns with context-aware alerts  
✅ **AI-Powered Insights** - Google Gemini API integration for natural language health explanations  
✅ **Interactive Visualizations** - Rich charts and heatmaps using Recharts  
✅ **Comprehensive Health Score** - Weighted algorithm incorporating cross-source correlations  

---

## 🚀 Setup Guide

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional, for cloning the repository)

To verify your installation:
```bash
node --version  # Should be v16 or higher
npm --version   # Should be v8 or higher
```

### Step 1: Install Dependencies

Navigate to the project directory and install all required packages:

```bash
# Install all dependencies
npm install
```

This will install:
- React 19.2.0
- React Router DOM 7.9.5
- Recharts 3.3.0 (for data visualizations)
- Tailwind CSS 3.4.18 (for styling)
- Google Generative AI SDK 0.24.1 (for AI features)
- date-fns 4.1.0 (for date formatting)
- lucide-react 0.553.0 (for icons)
- And other dependencies listed in `package.json`

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory of the project:

```bash
# Create .env file
touch .env
```

Then add the following environment variables to your `.env` file:

```env
# Dashboard - for dashboard insights, daily summaries, hero insights
REACT_APP_GEMINI_API_KEY_DASHBOARD=your_dashboard_api_key_here

# Timeline - for timeline narratives and timeline-related AI
REACT_APP_GEMINI_API_KEY_TIMELINE=your_timeline_api_key_here

# Insights Correlations - for correlation insights and correlation summaries
REACT_APP_GEMINI_API_KEY_INSIGHTS_CORRELATIONS=your_correlations_api_key_here

# Insights Anomalies - for anomaly insights and anomaly summaries
REACT_APP_GEMINI_API_KEY_INSIGHTS_ANOMALIES=your_anomalies_api_key_here

# Metrics - for health score recommendations and metrics-related AI
REACT_APP_GEMINI_API_KEY_METRICS=your_metrics_api_key_here

# Fallback key (optional - used if context-specific key is not found)
REACT_APP_GEMINI_API_KEY=your_fallback_api_key_here
```

**Important Notes:**
- Replace `your_*_api_key_here` with your actual Google Gemini API keys
- You can use the same key for all contexts, but using separate keys increases throughput (5x faster)
- Get your API keys from [Google AI Studio](https://makersuite.google.com/app/apikey)
- The `.env` file should be in the project root (same directory as `package.json`)
- **Never commit your `.env` file to version control** (it's already in `.gitignore`)

### Step 3: Start the Development Server

```bash
# Start the React development server
npm start
```

The application will:
- Start on `http://localhost:3000`
- Automatically open in your default browser
- Hot-reload when you make code changes

### Step 4: Verify Installation

Once the app is running, you should see:
- ✅ The dashboard loads without errors
- ✅ Health data visualizations appear
- ✅ AI insights are generated (if API keys are configured)
- ✅ No console errors in the browser developer tools

### Troubleshooting

**Port 3000 already in use?**
```bash
# Use a different port
PORT=3001 npm start
```

**Module not found errors?**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API key not working?**
- Verify your API keys are correct in `.env`
- Make sure you've restarted the dev server after adding `.env` file
- Check that your API keys have proper permissions in Google AI Studio
- Look for error messages in the browser console

**Build errors?**
```bash
# Clear cache and rebuild
npm start -- --reset-cache
```

### Quick Start (TL;DR)

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with your API keys (see Step 2 above)

# 3. Start the app
npm start
```

The application will open at `http://localhost:3000`

---

## 📊 Features

### 1. Intelligent Dashboard
- **Real-time Health Score**: Multi-factor algorithm analyzing sleep, activity, nutrition, vitals, and wellness
- **30-Day Trend Charts**: Interactive multi-line charts showing key metrics over time
- **Anomaly Alerts**: Color-coded warnings for unusual patterns
- **AI Insights Panel**: Daily AI-generated health insights with quick action buttons

### 2. Correlation Explorer
- **Interactive Heatmap**: Click-to-explore correlation matrix across all health metrics
- **Time-Lagged Analysis**: Discover how yesterday's sleep affects today's performance
- **Scatter Plots**: Visualize relationships between metric pairs with regression analysis
- **Strength Filtering**: Filter correlations by strength (strong/moderate/weak)

### 3. Anomaly Detection
- **Timeline Visualization**: See metrics over time with baseline bands
- **Severity Filtering**: High/Medium anomaly classification
- **Baseline Tracking**: Rolling average with upper/lower bounds
- **Annotated Markers**: Visual indicators on charts showing when anomalies occurred

### 4. Profile & Achievements
- **BMI Calculator**: Automatic calculation with color-coded health status
- **Weight Trends**: 30-day weight tracking visualization
- **Health Score History**: Track your progress over time
- **Achievement System**: Earn badges for health milestones
- **Data Export**: Download your health data in JSON or CSV format

### 5. Data Management
- **CSV Upload**: Import health data from various sources
- **Data Generation**: Create synthetic data for testing
- **Privacy Controls**: Manage app permissions
- **Export Options**: Full data portability

---

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 18 (Functional Components & Hooks)
- React Router v6 (Multi-page navigation)
- Recharts (Interactive data visualization)
- Tailwind CSS (Utility-first styling)
- Lucide Icons (Modern icon library)

**AI & Analytics**
- Google Gemini API (Natural language insights)
- Custom Correlation Engine (Pearson coefficients, time-lagged analysis)
- Anomaly Detection System (Rolling baselines, z-score normalization)
- Health Score Algorithm (Multi-factor weighted scoring)

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Navigation.jsx   # Sidebar navigation
│   └── AIHealthAssistant.jsx  # Chat interface
├── pages/               # Route-level components
│   ├── Dashboard.jsx    # Main dashboard
│   ├── CorrelationExplorer.jsx  # Correlation analysis
│   ├── AnomalyDetection.jsx  # Anomaly visualization
│   ├── Profile.jsx      # User profile & achievements
│   ├── DataManagement.jsx  # Data import/export
│   └── Settings.jsx     # App settings
├── utils/              # Core logic & algorithms
│   ├── dataLoader.js   # CSV parsing & data utilities
│   ├── healthScore.js  # Health score calculation
│   ├── correlationAnalysis.js  # Time-lagged correlations
│   ├── anomalyDetection.js  # Rolling baseline detection
│   ├── dataNormalization.js  # Z-score & scaling
│   ├── geminiClient.js  # Gemini API setup
│   ├── aiInsights.js   # AI insight generation
│   └── dataGenerator.js  # Synthetic data creation
├── data/               # CSV health data files
│   ├── sleep.csv
│   ├── nutrition.csv
│   ├── activity.csv
│   ├── vitals.csv
│   └── wellness.csv
├── App.js              # Main app logic (Dashboard component)
├── AppRouter.jsx       # Route configuration
└── index.js            # App entry point
```

---

## 🧮 How It Works

### Health Score Calculation

The health score (0-100) is calculated using a sophisticated algorithm that:

1. **Individual Metrics** (60% weight)
   - Sleep quality & duration
   - Activity levels & exercise
   - Heart rate variability
   - Nutrition balance
   - Mental wellness scores

2. **Cross-Source Correlations** (25% weight)
   - Sleep → Energy correlation bonus
   - Activity → Sleep quality bonus
   - Nutrition → Performance bonus
   - Detects positive lifestyle patterns

3. **Consistency & Trends** (15% weight)
   - Rewards stable patterns
   - Penalizes high variability
   - Considers rolling averages

### Anomaly Detection Algorithm

```javascript
// Simplified pseudocode
1. Calculate 7-day rolling baseline for each metric
2. Compute standard deviation (σ)
3. Flag values outside 2σ as medium severity
4. Flag values outside 3σ as high severity
5. Check against clinical thresholds (HR, BP, etc.)
6. Generate context-aware alerts
```

### Time-Lagged Correlation

Discovers relationships across time:
- Tests lags of 0-3 days
- Example: "Poor sleep on Monday correlates with low energy on Tuesday"
- Uses cross-correlation function to find optimal lag
- Statistical significance testing (p < 0.05)

---

## 📈 Data Format

### CSV Structure

All CSV files follow this format:

```csv
date,metric1,metric2,metric3
2025-10-10,7.5,68,85
2025-10-11,6.8,72,78
```

### Data Sources

1. **sleep.csv**: sleep_duration_hours, sleep_quality_score, deep_sleep_minutes, rem_sleep_minutes, hrv_ms
2. **nutrition.csv**: calories, protein_g, carbs_g, fat_g, fiber_g, water_liters, sugar_g
3. **activity.csv**: steps, distance_km, active_minutes, exercise_minutes, calories_burned
4. **vitals.csv**: resting_heart_rate, blood_pressure_systolic, blood_pressure_diastolic, weight_kg, body_fat_percentage
5. **wellness.csv**: energy_level, stress_level, mood_score, focus_level

---

## 🤖 AI Integration

### Gemini API Features

The application uses Google's Gemini API to:

1. **Generate Daily Summaries**: Natural language overview of your health
2. **Explain Correlations**: "Your sleep quality affects next-day energy by X%"
3. **Anomaly Explanations**: Why specific data points are unusual
4. **Personalized Recommendations**: Actionable advice based on your patterns
5. **Conversational Q&A**: Chat assistant for health questions

### API Setup

For detailed API key configuration, see the [Setup Guide](#-setup-guide) section above.

The application uses multiple API keys for different contexts to maximize throughput:
- **Dashboard**: Daily summaries, hero insights
- **Timeline**: Timeline narratives
- **Insights Correlations**: Correlation summaries
- **Insights Anomalies**: Anomaly summaries
- **Metrics**: Health score recommendations

Implementation:
```javascript
// src/utils/geminiClient.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
```

For more details, see `API_KEYS_SETUP.md` in the project root.

---

## 🎯 Hackathon Evaluation Criteria Addressed

### 1. Data Integration from Multiple Sources ⭐⭐⭐⭐⭐
- ✅ 5 distinct data sources with different schemas
- ✅ Unified data model with date-based alignment
- ✅ Cross-source correlation detection
- ✅ Handles missing data gracefully

### 2. Data Analysis & Insights ⭐⭐⭐⭐⭐
- ✅ Time-lagged correlation analysis (novel approach)
- ✅ Rolling baseline anomaly detection
- ✅ Multi-factor health score algorithm
- ✅ Z-score normalization for fair comparisons

### 3. AI-Powered Features ⭐⭐⭐⭐⭐
- ✅ Gemini API integration for natural language insights
- ✅ Context-aware health explanations
- ✅ Conversational health assistant
- ✅ Personalized recommendations

### 4. User Experience ⭐⭐⭐⭐⭐
- ✅ Modern, professional dark theme UI
- ✅ Interactive Recharts visualizations
- ✅ Multi-page navigation with React Router
- ✅ Responsive design (mobile-friendly)
- ✅ Achievement system for engagement

### 5. Technical Implementation ⭐⭐⭐⭐⭐
- ✅ Clean React architecture with hooks
- ✅ Modular utility functions
- ✅ Performance optimizations
- ✅ Comprehensive error handling

---

## 🔬 Advanced Features

### Time-Lagged Correlation Analysis

One of the most powerful features is discovering how health metrics affect each other across time:

```javascript
// Example: Discover that poor sleep affects next-day performance
const result = calculateTimeLaggedCorrelation(sleepData, energyData, maxLag=3);
// Output: { lag: 1, correlation: -0.72, significance: 0.001 }
// Interpretation: Sleep 1 day ago strongly predicts today's energy
```

### Anomaly Detection with Context

```javascript
const anomalies = detectAllAnomalies(healthData);
// Returns: [
//   {
//     metric: "Resting Heart Rate",
//     anomalies: [{
//       date: "2025-11-05",
//       value: 85,
//       baseline: 65,
//       deviation: 3.1σ,
//       severity: "high",
//       context: "Elevated for 3 consecutive days"
//     }]
//   }
// ]
```

---

## 📝 Development Notes

### Design Decisions

1. **JavaScript over TypeScript**: Faster prototyping for hackathon timeline
2. **Recharts**: Balance of power and ease-of-use for visualizations
3. **Gemini API**: Free tier availability and strong natural language capabilities
4. **Dark Theme**: Professional appearance, reduces eye strain for health apps

### Future Enhancements

- [ ] Real-time data sync with wearables (Apple Health, Google Fit)
- [ ] Machine learning predictions for future health trends
- [ ] Social features (compare anonymized data with peers)
- [ ] Medication tracking integration
- [ ] Advanced sleep stage analysis
- [ ] Personalized health goals with progress tracking

---

## 🤝 Contributing

This is a hackathon project demonstrating data integration and AI capabilities.  
For questions or collaboration: alex.johnson@example.com

---

## 📄 License

MIT License - Built for the Personal Health & Wellness Aggregator Hackathon 2025

---

## 🙏 Acknowledgments

- **Google Gemini API** for AI-powered insights
- **Recharts** for beautiful, responsive charts
- **Lucide** for clean, modern icons
- **Create React App** for quick project setup

---

**Made with ❤️ for better health tracking**
