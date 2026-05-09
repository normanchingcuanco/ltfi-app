// TDEE Calculator using Mifflin-St Jeor formula

const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very active': 1.9
};

const calculateTDEE = ({ age, height, currentWeight, activityLevel, gender = 'male' }) => {
  // BMR calculation
  let bmr;
  if (gender === 'female') {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5;
  }

  const multiplier = activityMultipliers[activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
};

const calculateMacros = (calories) => {
  return {
    protein: Math.round((calories * 0.30) / 4),  // 30% protein, 4 cal/g
    carbs: Math.round((calories * 0.45) / 4),    // 45% carbs, 4 cal/g
    fat: Math.round((calories * 0.25) / 9)       // 25% fat, 9 cal/g
  };
};

module.exports = { calculateTDEE, calculateMacros };