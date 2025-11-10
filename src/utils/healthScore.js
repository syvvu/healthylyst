// Advanced Health Score Calculator
// Integrates data from multiple sources to calculate a comprehensive health score

export const calculateHealthScore = (allData, selectedDate = null) => {
  if (!allData || !allData.sleep || !allData.sleep.data || allData.sleep.data.length === 0) {
    return { score: 0, breakdown: {}, insights: [] };
  }

  // Get data for specific date or use latest
  let sleepData, nutritionData, activityData, vitalsData, wellnessData;
  
  if (selectedDate) {
    const dateStr = selectedDate.toISOString().split('T')[0];
    sleepData = allData.sleep.data.find(d => d.date === dateStr);
    nutritionData = allData.nutrition.data.find(d => d.date === dateStr);
    activityData = allData.activity.data.find(d => d.date === dateStr);
    vitalsData = allData.vitals.data.find(d => d.date === dateStr);
    wellnessData = allData.wellness.data.find(d => d.date === dateStr);
  } else {
    // Use latest data
    sleepData = allData.sleep.data[allData.sleep.data.length - 1];
    nutritionData = allData.nutrition.data[allData.nutrition.data.length - 1];
    activityData = allData.activity.data[allData.activity.data.length - 1];
    vitalsData = allData.vitals.data[allData.vitals.data.length - 1];
    wellnessData = allData.wellness.data[allData.wellness.data.length - 1];
  }

  if (!sleepData) return { score: 0, breakdown: {}, insights: [] };

  const breakdown = {};
  const insights = [];

  // 1. Sleep Score (25% weight) - Multiple factors
  const sleepScore = calculateSleepScore(sleepData, allData.sleep.data);
  breakdown.sleep = {
    score: sleepScore,
    weight: 0.25,
    factors: {
      duration: sleepData.sleep_duration_hours || 0,
      quality: sleepData.sleep_quality_score || 0,
      efficiency: sleepData.sleep_efficiency || 0,
      hrv: sleepData.hrv_ms || 0
    }
  };

  // 2. Activity Score (20% weight) - Cross-correlated with sleep
  const activityScore = calculateActivityScore(activityData, sleepData, allData.activity.data);
  breakdown.activity = {
    score: activityScore,
    weight: 0.20,
    factors: {
      steps: activityData?.steps || 0,
      exercise: activityData?.exercise_minutes || 0,
      caloriesBurned: activityData?.calories_burned || 0
    }
  };

  // 3. Nutrition Score (20% weight) - Correlated with activity and sleep
  const nutritionScore = calculateNutritionScore(nutritionData, activityData, sleepData);
  breakdown.nutrition = {
    score: nutritionScore,
    weight: 0.20,
      factors: {
        calories: nutritionData?.calories || 0,
        protein: nutritionData?.protein_g || 0,
        water: nutritionData?.water_liters || ((nutritionData?.water_glasses || 0) * 0.25),
        sugar: nutritionData?.sugar_g || 0
      }
  };

  // 4. Vitals Score (20% weight) - Heart rate, BP, weight trends
  const vitalsScore = calculateVitalsScore(vitalsData, allData.vitals.data, sleepData);
  breakdown.vitals = {
    score: vitalsScore,
    weight: 0.20,
    factors: {
      heartRate: vitalsData?.resting_heart_rate || 0,
      bloodPressure: vitalsData?.blood_pressure_systolic || 0,
      weight: vitalsData?.weight_kg || 0,
      hrv: vitalsData?.hrv_ms || sleepData.hrv_ms || 0
    }
  };

  // 5. Wellness Score (15% weight) - Stress, energy, mood - highly correlated
  const wellnessScore = calculateWellnessScore(wellnessData, sleepData, activityData, allData.wellness.data);
  breakdown.wellness = {
    score: wellnessScore,
    weight: 0.15,
    factors: {
      stress: wellnessData?.stress_level || 0,
      energy: wellnessData?.energy_level || 0,
      mood: wellnessData?.mood_score || 0,
      screenTime: wellnessData?.screen_time_hours || 0
    }
  };

  // Calculate weighted total
  const totalScore = 
    breakdown.sleep.score * breakdown.sleep.weight +
    breakdown.activity.score * breakdown.activity.weight +
    breakdown.nutrition.score * breakdown.nutrition.weight +
    breakdown.vitals.score * breakdown.vitals.weight +
    breakdown.wellness.score * breakdown.wellness.weight;

  // Generate insights based on cross-source correlations
  if (sleepData.sleep_duration_hours < 6 && wellnessData?.energy_level < 5) {
    insights.push({
      type: 'correlation',
      message: 'Low sleep duration correlates with decreased energy levels',
      severity: 'warning'
    });
  }

  if (activityData?.steps < 5000 && wellnessData?.stress_level > 7) {
    insights.push({
      type: 'correlation',
      message: 'Low activity correlates with increased stress',
      severity: 'warning'
    });
  }

  if (nutritionData?.sugar_g > 80 && sleepData.sleep_quality_score < 70) {
    insights.push({
      type: 'correlation',
      message: 'High sugar intake may be affecting sleep quality',
      severity: 'info'
    });
  }

  if (vitalsData?.resting_heart_rate > 70 && wellnessData?.stress_level > 6) {
    insights.push({
      type: 'correlation',
      message: 'Elevated heart rate correlates with stress levels',
      severity: 'warning'
    });
  }

  return {
    score: Math.round(totalScore),
    breakdown,
    insights,
    dataSources: {
      sleep: !!sleepData,
      nutrition: !!nutritionData,
      activity: !!activityData,
      vitals: !!vitalsData,
      wellness: !!wellnessData
    }
  };
};

// Sleep Score: 0-100
const calculateSleepScore = (sleepData, allSleepData) => {
  if (!sleepData) return 0;

  const duration = sleepData.sleep_duration_hours || 0;
  const quality = sleepData.sleep_quality_score || 0;
  const efficiency = sleepData.sleep_efficiency || 0;
  const hrv = sleepData.hrv_ms || 0;

  // Optimal: 7-9 hours
  let durationScore = 0;
  if (duration >= 7 && duration <= 9) {
    durationScore = 100;
  } else if (duration >= 6 && duration < 7) {
    durationScore = 70;
  } else if (duration > 9 && duration <= 10) {
    durationScore = 80;
  } else if (duration >= 5 && duration < 6) {
    durationScore = 40;
  } else {
    durationScore = Math.max(0, 20);
  }

  // Quality score (0-100)
  const qualityScore = quality;

  // Efficiency (0-100)
  const efficiencyScore = efficiency;

  // HRV score (normalize 30-70ms to 0-100)
  const hrvScore = Math.min(100, Math.max(0, ((hrv - 30) / 40) * 100));

  // Weighted average
  return (durationScore * 0.35 + qualityScore * 0.30 + efficiencyScore * 0.20 + hrvScore * 0.15);
};

// Activity Score: 0-100
const calculateActivityScore = (activityData, sleepData, allActivityData) => {
  if (!activityData) return 0;

  const steps = activityData.steps || 0;
  const exercise = activityData.exercise_minutes || 0;
  const caloriesBurned = activityData.calories_burned || 0;

  // Steps score (target: 10,000)
  const stepsScore = Math.min(100, (steps / 10000) * 100);

  // Exercise minutes (target: 30+)
  const exerciseScore = Math.min(100, (exercise / 30) * 100);

  // Calories burned (target: 400+)
  const caloriesScore = Math.min(100, (caloriesBurned / 400) * 100);

  // Bonus: If good sleep, activity is more effective
  let sleepBonus = 1;
  if (sleepData && sleepData.sleep_duration_hours >= 7) {
    sleepBonus = 1.1; // 10% bonus
  }

  return Math.min(100, (stepsScore * 0.40 + exerciseScore * 0.35 + caloriesScore * 0.25) * sleepBonus);
};

// Nutrition Score: 0-100
const calculateNutritionScore = (nutritionData, activityData, sleepData) => {
  if (!nutritionData) return 0;

  const calories = nutritionData.calories || 0;
  const protein = nutritionData.protein_g || 0;
  // Support both water_liters and water_glasses (1 glass ≈ 0.25L)
  const waterLiters = nutritionData.water_liters || ((nutritionData.water_glasses || 0) * 0.25);
  const sugar = nutritionData.sugar_g || 0;

  // Calories (target: 2000-2500)
  let caloriesScore = 0;
  if (calories >= 2000 && calories <= 2500) {
    caloriesScore = 100;
  } else if (calories >= 1800 && calories < 2000) {
    caloriesScore = 80;
  } else if (calories > 2500 && calories <= 2800) {
    caloriesScore = 85;
  } else {
    caloriesScore = Math.max(0, 60);
  }

  // Protein (target: 100-150g)
  const proteinScore = Math.min(100, Math.max(0, ((protein - 50) / 100) * 100));

  // Water (target: 2-3L)
  const waterScore = Math.min(100, (waterLiters / 2.5) * 100);

  // Sugar penalty (target: <50g)
  const sugarScore = Math.max(0, 100 - ((sugar - 50) / 50) * 100);

  // Adjust based on activity level
  let activityMultiplier = 1;
  if (activityData && activityData.calories_burned > 400) {
    activityMultiplier = 1.05; // Slight bonus for active days
  }

  return Math.min(100, (caloriesScore * 0.30 + proteinScore * 0.25 + waterScore * 0.25 + sugarScore * 0.20) * activityMultiplier);
};

// Vitals Score: 0-100
const calculateVitalsScore = (vitalsData, allVitalsData, sleepData) => {
  if (!vitalsData) return 0;

  const heartRate = vitalsData.resting_heart_rate || 0;
  const systolic = vitalsData.blood_pressure_systolic || 0;
  const diastolic = vitalsData.blood_pressure_diastolic || 0;
  const hrv = vitalsData.hrv_ms || sleepData?.hrv_ms || 0;

  // Heart rate (optimal: 60-70)
  let hrScore = 0;
  if (heartRate >= 60 && heartRate <= 70) {
    hrScore = 100;
  } else if (heartRate > 70 && heartRate <= 75) {
    hrScore = 80;
  } else if (heartRate >= 55 && heartRate < 60) {
    hrScore = 85;
  } else if (heartRate > 75) {
    hrScore = Math.max(0, 100 - (heartRate - 75) * 4);
  } else {
    hrScore = Math.max(0, 70);
  }

  // Blood pressure (optimal: <120/80)
  let bpScore = 0;
  if (systolic < 120 && diastolic < 80) {
    bpScore = 100;
  } else if (systolic < 130 && diastolic < 85) {
    bpScore = 85;
  } else if (systolic < 140 && diastolic < 90) {
    bpScore = 70;
  } else {
    bpScore = Math.max(0, 50);
  }

  // HRV (normalize)
  const hrvScore = Math.min(100, Math.max(0, ((hrv - 30) / 40) * 100));

  return (hrScore * 0.40 + bpScore * 0.40 + hrvScore * 0.20);
};

// Wellness Score: 0-100
const calculateWellnessScore = (wellnessData, sleepData, activityData, allWellnessData) => {
  if (!wellnessData) return 0;

  const stress = wellnessData.stress_level || 0; // 0-10, lower is better
  const energy = wellnessData.energy_level || 0; // 0-10, higher is better
  const mood = wellnessData.mood_score || 0; // 0-10, higher is better
  const screenTime = wellnessData.screen_time_hours || 0; // lower is better

  // Stress (invert: 0 stress = 100, 10 stress = 0)
  const stressScore = (10 - stress) * 10;

  // Energy (0-10 to 0-100)
  const energyScore = energy * 10;

  // Mood (0-10 to 0-100)
  const moodScore = mood * 10;

  // Screen time (target: <6 hours)
  const screenScore = Math.max(0, 100 - ((screenTime - 6) / 6) * 100);

  // Cross-correlation bonuses/penalties
  let correlationBonus = 0;
  
  // Good sleep improves wellness
  if (sleepData && sleepData.sleep_duration_hours >= 7) {
    correlationBonus += 5;
  }
  
  // Activity improves wellness
  if (activityData && activityData.steps >= 7000) {
    correlationBonus += 5;
  }

  return Math.min(100, (stressScore * 0.30 + energyScore * 0.30 + moodScore * 0.25 + screenScore * 0.15) + correlationBonus);
};

// Generate AI-powered recommendations to reach a target health score
export const generateAIRecommendations = async (currentScore, targetScore, breakdown, todayData, allData) => {
  if (!breakdown || !todayData) return [];
  
  const scoreGap = targetScore - currentScore;
  if (scoreGap <= 0) return []; // Already at or above target
  
  // Import dependencies dynamically to avoid circular dependencies
  const { generateContent } = await import('./geminiClient');
  const { withCache } = await import('./aiCache');
  
  // Create cache key based on score and breakdown
  const dateKey = todayData.date || new Date().toISOString().split('T')[0];
  const cacheParams = {
    date: dateKey,
    currentScore,
    targetScore,
    breakdownHash: JSON.stringify({
      sleep: Math.round(breakdown.sleep?.score || 0),
      activity: Math.round(breakdown.activity?.score || 0),
      nutrition: Math.round(breakdown.nutrition?.score || 0),
      recovery: Math.round(breakdown.vitals?.score || 0),
      mental: Math.round(breakdown.wellness?.score || 0)
    })
  };
  
  // Use cache wrapper
  return await withCache('aiRecommendations', cacheParams, async () => {
  
  // Build context for AI
  const context = {
    currentScore,
    targetScore,
    scoreGap,
    breakdown: {
      sleep: { score: Math.round(breakdown.sleep?.score || 0), duration: todayData.sleep?.sleep_duration_hours || 0 },
      activity: { score: Math.round(breakdown.activity?.score || 0), steps: todayData.activity?.steps || 0 },
      nutrition: { score: Math.round(breakdown.nutrition?.score || 0), calories: todayData.nutrition?.calories || 0, sugar: todayData.nutrition?.sugar_g || 0, protein: todayData.nutrition?.protein_g || 0 },
      recovery: { score: Math.round(breakdown.vitals?.score || 0) },
      mental: { score: Math.round(breakdown.wellness?.score || 0), stress: todayData.wellness?.stress_level || 0, energy: todayData.wellness?.energy_level || 0 }
    },
    today: {
      caffeine: todayData.nutrition?.caffeine_cups || 0,
      caffeineTime: todayData.nutrition?.caffeine_last_time || null,
      water: todayData.nutrition?.water_glasses || 0
    }
  };
  
  const prompt = `You are a supportive health coach with a warm, empathetic approach. Generate exactly 3 short, actionable recommendations to help improve health score from ${currentScore}/100 to ${targetScore}/100.

Current Health Score Breakdown:
- Sleep: ${context.breakdown.sleep.score}% (${context.breakdown.sleep.duration.toFixed(1)} hrs)
- Activity: ${context.breakdown.activity.score}% (${context.breakdown.activity.steps.toLocaleString()} steps)
- Nutrition: ${context.breakdown.nutrition.score}% (${context.breakdown.nutrition.calories} cal, ${context.breakdown.nutrition.sugar}g sugar, ${context.breakdown.nutrition.protein}g protein)
- Recovery: ${context.breakdown.recovery.score}%
- Mental: ${context.breakdown.mental.score}% (stress: ${context.breakdown.mental.stress}/10, energy: ${context.breakdown.mental.energy}/10)

Today's Details:
- Caffeine: ${context.today.caffeine} cups${context.today.caffeineTime ? ` (last at ${context.today.caffeineTime})` : ''}
- Water: ${context.today.water} glasses

IMPORTANT GUIDELINES:
- Use a supportive, conversational coaching tone that balances empathy with insight
- Be encouraging and understanding - acknowledge that improving health is a journey
- Focus on the lowest scoring categories first, but frame suggestions positively
- Avoid technical jargon - use simple, easy-to-understand language
- Each recommendation should feel personalized and achievable

Generate exactly 3 recommendations. Each recommendation should be:
1. ONE short sentence (max 10 words)
2. Specific and actionable (include numbers when relevant)
3. Format: "Action (detail)" - e.g., "Add 3,800 steps (walk after dinner)" or "Keep sugar under 40g (12g remaining)"

Return ONLY the 3 recommendations, one per line, no numbering, no explanations, no extra text. Example format:
Add 3,800 steps (walk after dinner)
Keep sugar under 40g (12g remaining)
Aim for 8 hours sleep tonight (1.5 more hours needed)`;

  try {
    const response = await generateContent(prompt, { temperature: 0.8, maxTokens: 150, context: 'metrics' });
    if (response.success && response.text) {
      // Parse the AI response into recommendations
      const lines = response.text.trim().split('\n').filter(line => line.trim().length > 0);
      const recommendations = lines.slice(0, 3).map((line, idx) => {
        const trimmed = line.trim().replace(/^[-•*]\s*/, ''); // Remove bullet points
        const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
          return {
            category: 'general',
            type: 'ai',
            action: match[1].trim(),
            detail: match[2].trim(),
            impact: (scoreGap / 3) * (3 - idx), // Decreasing impact
            priority: idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low'
          };
        } else {
          // If no parentheses, use entire line as action
          return {
            category: 'general',
            type: 'ai',
            action: trimmed,
            detail: null,
            impact: (scoreGap / 3) * (3 - idx),
            priority: idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low'
          };
        }
      });
      
      return recommendations;
    }
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    // Fallback to logic-based recommendations if AI fails
    return calculateRecommendations(currentScore, targetScore, breakdown, todayData, allData);
  }
  });
};

// Calculate recommendations to reach a target health score (fallback logic-based method)
export const calculateRecommendations = (currentScore, targetScore, breakdown, todayData, allData) => {
  if (!breakdown || !todayData) return [];
  
  const scoreGap = targetScore - currentScore;
  if (scoreGap <= 0) return []; // Already at or above target
  
  const recommendations = [];
  const weights = {
    sleep: 0.25,
    activity: 0.20,
    nutrition: 0.20,
    vitals: 0.20,
    wellness: 0.15
  };
  
  // Calculate how much each category needs to improve to reach target
  const categoryImprovements = {};
  Object.keys(weights).forEach(category => {
    const currentCategoryScore = breakdown[category]?.score || 0;
    const categoryWeight = weights[category];
    const maxPossibleImprovement = (100 - currentCategoryScore) * categoryWeight;
    categoryImprovements[category] = {
      current: currentCategoryScore,
      weight: categoryWeight,
      maxImprovement: maxPossibleImprovement
    };
  });
  
  // Sort categories by improvement potential (highest first)
  const sortedCategories = Object.entries(categoryImprovements)
    .sort((a, b) => b[1].maxImprovement - a[1].maxImprovement);
  
  // Generate specific recommendations
  let remainingGap = scoreGap;
  let recommendationsGenerated = 0;
  
  for (const [category, info] of sortedCategories) {
    if (remainingGap <= 0 || recommendationsGenerated >= 3) break;
    
    const improvementNeeded = Math.min(remainingGap / info.weight, 100 - info.current);
    if (improvementNeeded <= 0 || info.current >= 100) continue;
    
    const targetCategoryScore = Math.min(100, info.current + improvementNeeded);
    
    switch (category) {
      case 'activity':
        const currentSteps = todayData.activity?.steps || 0;
        const currentActivityScore = info.current;
        
        // Calculate steps needed to improve activity score
        // Activity score formula: (stepsScore * 0.40 + exerciseScore * 0.35 + caloriesScore * 0.25) * sleepBonus
        // stepsScore = (steps / 10000) * 100
        if (targetCategoryScore > currentActivityScore && currentActivityScore < 100) {
          const scoreIncrease = targetCategoryScore - currentActivityScore;
          // Account for sleep bonus (if present, it multiplies the score)
          const sleepBonus = todayData.sleep?.sleep_duration_hours >= 7 ? 1.1 : 1.0;
          // Steps component needs to increase by: scoreIncrease / (0.40 * sleepBonus)
          const stepsScoreIncrease = scoreIncrease / (0.40 * sleepBonus);
          // Convert stepsScore increase to actual steps: stepsScore = (steps/10000)*100, so steps = stepsScore * 100
          const stepsNeeded = stepsScoreIncrease * 100;
          
          if (stepsNeeded > 100) { // Lower threshold to show more recommendations
            recommendations.push({
              category: 'activity',
              type: 'steps',
              action: `Add ${Math.round(stepsNeeded)} steps`,
              detail: stepsNeeded > 3000 ? 'walk after dinner' : stepsNeeded > 1000 ? 'take a 15-min walk' : 'take a short walk',
              impact: improvementNeeded * info.weight,
              priority: 'high'
            });
            recommendationsGenerated++;
            remainingGap -= improvementNeeded * info.weight;
          }
        }
        break;
        
      case 'nutrition':
        const nutritionData = todayData.nutrition;
        if (nutritionData && recommendationsGenerated < 3) {
          const currentSugar = nutritionData.sugar_g || 0;
          const currentCalories = nutritionData.calories || 0;
          const currentProtein = nutritionData.protein_g || 0;
          const currentWater = nutritionData.water_glasses || 0;
          
          // Sugar recommendation (if too high or approaching limit)
          const sugarLimit = 40;
          if (currentSugar >= sugarLimit * 0.7 && recommendationsGenerated < 3) {
            const sugarRemaining = Math.max(0, sugarLimit - currentSugar);
            recommendations.push({
              category: 'nutrition',
              type: 'sugar',
              action: `Keep sugar under ${sugarLimit}g`,
              detail: sugarRemaining > 0 ? `${Math.round(sugarRemaining)}g remaining` : 'limit exceeded',
              impact: improvementNeeded * info.weight * 0.3,
              priority: 'medium'
            });
            recommendationsGenerated++;
            remainingGap -= improvementNeeded * info.weight * 0.3;
          }
          
          // Caffeine recommendation
          const caffeineLastTime = nutritionData.caffeine_last_time;
          if (caffeineLastTime && recommendationsGenerated < 3) {
            let hour = null;
            // Handle different formats: string "14:30" or number 14.5 or "14"
            if (typeof caffeineLastTime === 'string') {
              if (caffeineLastTime.includes(':')) {
                hour = parseInt(caffeineLastTime.split(':')[0]);
              } else {
                hour = parseInt(caffeineLastTime);
              }
            } else if (typeof caffeineLastTime === 'number') {
              hour = Math.floor(caffeineLastTime);
            }
            
            if (hour !== null && hour >= 15) { // After 3 PM
              recommendations.push({
                category: 'nutrition',
                type: 'caffeine',
                action: 'Maintain caffeine cutoff before 3 PM',
                detail: 'helps improve sleep quality',
                impact: improvementNeeded * info.weight * 0.2,
                priority: 'low'
              });
              recommendationsGenerated++;
              remainingGap -= improvementNeeded * info.weight * 0.2;
            }
          }
          
          // Protein recommendation (if too low)
          if (currentProtein < 100 && targetCategoryScore > info.current && recommendationsGenerated < 3) {
            const proteinNeeded = 100 - currentProtein;
            if (proteinNeeded > 10) {
              recommendations.push({
                category: 'nutrition',
                type: 'protein',
                action: `Add ${Math.round(proteinNeeded)}g protein`,
                detail: 'include lean protein in next meal',
                impact: improvementNeeded * info.weight * 0.25,
                priority: 'medium'
              });
              recommendationsGenerated++;
              remainingGap -= improvementNeeded * info.weight * 0.25;
            }
          }
        }
        break;
        
      case 'sleep':
        const sleepData = todayData.sleep;
        if (sleepData && recommendationsGenerated < 3) {
          const currentDuration = sleepData.sleep_duration_hours || 0;
          const optimalDuration = 8;
          
          if (currentDuration < optimalDuration && targetCategoryScore > info.current) {
            const hoursNeeded = optimalDuration - currentDuration;
            recommendations.push({
              category: 'sleep',
              type: 'duration',
              action: `Aim for ${optimalDuration} hours tonight`,
              detail: `${hoursNeeded.toFixed(1)} more hours needed`,
              impact: improvementNeeded * info.weight,
              priority: 'high'
            });
            recommendationsGenerated++;
            remainingGap -= improvementNeeded * info.weight;
          }
        }
        break;
        
      case 'wellness':
        const wellnessData = todayData.wellness;
        if (wellnessData && recommendationsGenerated < 3) {
          const currentStress = wellnessData.stress_level || 0;
          const currentEnergy = wellnessData.energy_level || 0;
          
          if (currentStress > 5 && targetCategoryScore > info.current) {
            recommendations.push({
              category: 'wellness',
              type: 'stress',
              action: 'Take a 10-minute break',
              detail: 'practice deep breathing or meditation',
              impact: improvementNeeded * info.weight * 0.3,
              priority: 'medium'
            });
            recommendationsGenerated++;
            remainingGap -= improvementNeeded * info.weight * 0.3;
          }
        }
        break;
    }
  }
  
  // If no specific recommendations were generated, create generic ones based on lowest categories
  if (recommendations.length === 0 && scoreGap > 0) {
    const sortedByScore = Object.entries(breakdown)
      .filter(([cat, data]) => data && data.score < 100)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 3);
    
    sortedByScore.forEach(([category, data]) => {
      if (recommendations.length < 3) {
        const categoryLabels = {
          activity: 'Increase your activity level',
          sleep: 'Improve your sleep quality',
          nutrition: 'Balance your nutrition',
          vitals: 'Focus on recovery',
          wellness: 'Manage stress and energy'
        };
        
        const categoryActions = {
          activity: 'Add more steps or exercise',
          sleep: 'Aim for 8 hours of quality sleep',
          nutrition: 'Optimize your meal balance',
          vitals: 'Prioritize rest and recovery',
          wellness: 'Take breaks to manage stress'
        };
        
        recommendations.push({
          category,
          type: 'general',
          action: categoryActions[category] || categoryLabels[category] || `Improve ${category}`,
          detail: `Current: ${Math.round(data.score)}% - target: 100%`,
          impact: (100 - data.score) * weights[category],
          priority: 'medium'
        });
      }
    });
  }
  
  // Sort by impact and return top 3
  return recommendations
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);
};

// Calculate 7-day trend
export const calculateTrend = (allData, selectedDate) => {
  if (!allData) return { percent: 0, direction: 'stable', message: '' };
  
  const dates = getAvailableDates(allData);
  const dateStr = selectedDate ? (typeof selectedDate === 'string' ? selectedDate : selectedDate.toISOString().split('T')[0]) : dates[dates.length - 1];
  const dateIndex = dates.indexOf(dateStr);
  
  if (dateIndex < 6) return { percent: 0, direction: 'stable', message: 'Insufficient data' };
  
  const currentScore = calculateHealthScore(allData, new Date(dateStr));
  const weekAgoScore = calculateHealthScore(allData, new Date(dates[dateIndex - 7]));
  
  const percentChange = weekAgoScore.score > 0 
    ? ((currentScore.score - weekAgoScore.score) / weekAgoScore.score) * 100 
    : 0;
  
  let direction = 'stable';
  let message = '';
  
  if (Math.abs(percentChange) < 2) {
    direction = 'stable';
    message = 'Stable';
  } else if (percentChange > 0) {
    direction = 'up';
    message = `+${Math.round(percentChange)}% ↗️`;
  } else {
    direction = 'down';
    message = `${Math.round(percentChange)}% ↘️`;
  }
  
  return { percent: Math.abs(percentChange), direction, message };
};

// Get best days for comparison
export const getBestDays = (allData, currentScore, daysToCheck = 30) => {
  if (!allData) return { bestScore: 0, bestDate: null, percentage: 0 };
  
  const dates = getAvailableDates(allData);
  const recentDates = dates.slice(-daysToCheck);
  
  let bestScore = 0;
  let bestDate = null;
  
  recentDates.forEach(date => {
    const score = calculateHealthScore(allData, new Date(date));
    if (score.score > bestScore) {
      bestScore = score.score;
      bestDate = date;
    }
  });
  
  const percentage = bestScore > 0 ? Math.round((currentScore / bestScore) * 100) : 0;
  
  return { bestScore, bestDate, percentage };
};

// Helper function to get available dates (re-export from dataLoader if needed)
const getAvailableDates = (allData) => {
  const dates = new Set();
  [allData.sleep, allData.nutrition, allData.activity, allData.vitals, allData.wellness].forEach(source => {
    if (source?.data) {
      source.data.forEach(row => {
        if (row.date) dates.add(row.date);
      });
    }
  });
  return Array.from(dates).sort();
};

