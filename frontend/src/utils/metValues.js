export const MET_TABLE = [
  // Cardio
  { name: 'Running 6 km/h', met: 6.0, category: 'Cardio' },
  { name: 'Running 8 km/h', met: 8.3, category: 'Cardio' },
  { name: 'Running 10 km/h', met: 10.0, category: 'Cardio' },
  { name: 'Running 12 km/h', met: 11.5, category: 'Cardio' },
  { name: 'Running 14 km/h', met: 13.5, category: 'Cardio' },
  { name: 'Jump Rope moderate', met: 11.8, category: 'Cardio' },
  { name: 'Jump Rope fast', met: 12.3, category: 'Cardio' },
  { name: 'Cycling moderate', met: 8.0, category: 'Cardio' },
  { name: 'Cycling vigorous', met: 12.0, category: 'Cardio' },
  { name: 'Walking 5 km/h', met: 3.5, category: 'Cardio' },
  { name: 'Walking 6.5 km/h', met: 4.5, category: 'Cardio' },
  { name: 'Swimming moderate', met: 6.0, category: 'Cardio' },
  { name: 'Swimming vigorous', met: 9.8, category: 'Cardio' },
  { name: 'Rowing moderate', met: 7.0, category: 'Cardio' },
  { name: 'Rowing vigorous', met: 12.0, category: 'Cardio' },
  { name: 'Stair climbing', met: 9.0, category: 'Cardio' },
  { name: 'Elliptical moderate', met: 5.0, category: 'Cardio' },
  { name: 'Elliptical vigorous', met: 8.0, category: 'Cardio' },

  // HIIT / Calisthenics
  { name: 'Burpees', met: 10.0, category: 'HIIT' },
  { name: 'Mountain Climbers', met: 8.0, category: 'HIIT' },
  { name: 'Box Jumps', met: 10.0, category: 'HIIT' },
  { name: 'High Knees', met: 8.0, category: 'HIIT' },
  { name: 'Jump Squats', met: 7.5, category: 'HIIT' },
  { name: 'Jumping Jacks', met: 8.0, category: 'HIIT' },
  { name: 'Sprint intervals', met: 14.0, category: 'HIIT' },
  { name: 'Battle Ropes', met: 10.0, category: 'HIIT' },

  // Calisthenics / Bodyweight
  { name: 'Push Ups', met: 3.8, category: 'Calisthenics' },
  { name: 'Pull Ups', met: 4.0, category: 'Calisthenics' },
  { name: 'Squats bodyweight', met: 5.0, category: 'Calisthenics' },
  { name: 'Lunges', met: 4.0, category: 'Calisthenics' },
  { name: 'Dips', met: 3.8, category: 'Calisthenics' },
  { name: 'Plank', met: 3.0, category: 'Calisthenics' },
  { name: 'Sit Ups', met: 3.8, category: 'Calisthenics' },
  { name: 'Calisthenics vigorous', met: 8.0, category: 'Calisthenics' },

  // Strength Training
  { name: 'Strength Training moderate', met: 3.5, category: 'Strength' },
  { name: 'Strength Training vigorous', met: 6.0, category: 'Strength' },
  { name: 'Deadlift', met: 6.0, category: 'Strength' },
  { name: 'Bench Press', met: 3.5, category: 'Strength' },
  { name: 'Squat barbell', met: 5.0, category: 'Strength' },
  { name: 'Overhead Press', met: 3.5, category: 'Strength' },
  { name: 'Kettlebell swings', met: 9.0, category: 'Strength' },
  { name: 'Clean and Press', met: 6.0, category: 'Strength' },

  // Martial Arts / Sports
  { name: 'Boxing sparring', met: 12.0, category: 'Sports' },
  { name: 'Boxing bag work', met: 9.0, category: 'Sports' },
  { name: 'MMA training', met: 10.0, category: 'Sports' },
  { name: 'Basketball', met: 8.0, category: 'Sports' },
  { name: 'Football', met: 8.0, category: 'Sports' },
  { name: 'Tennis', met: 7.3, category: 'Sports' },
  { name: 'Yoga', met: 3.0, category: 'Sports' },
  { name: 'Pilates', met: 3.0, category: 'Sports' },

  // Rest
  { name: 'Rest / Active Recovery', met: 1.0, category: 'Rest' },
];

export const searchMET = (query) => {
  if (!query) return MET_TABLE;
  return MET_TABLE.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase()) ||
    e.category.toLowerCase().includes(query.toLowerCase())
  );
};

export const getMET = (name) => {
  const match = MET_TABLE.find(e => e.name === name);
  return match ? match.met : 5.0;
};