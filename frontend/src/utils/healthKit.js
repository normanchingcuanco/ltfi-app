import { Platform } from 'react-native';

let AppleHealthKit = null;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch (e) {
    AppleHealthKit = null;
  }
}

const PERMISSIONS = AppleHealthKit ? {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.BloodOxygen,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.Workout,
    ]
  }
} : null;

export const initHealthKit = () => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve(false);
      return;
    }
    AppleHealthKit.initHealthKit(PERMISSIONS, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(true);
    });
  });
};

export const getStepsToday = () => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) { resolve(0); return; }
    const options = { date: new Date().toISOString() };
    AppleHealthKit.getStepCount(options, (err, result) => {
      if (err) { resolve(0); return; }
      resolve(result.value || 0);
    });
  });
};

export const getHeartRateToday = () => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) { resolve(null); return; }
    const options = {
      startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      endDate: new Date().toISOString(),
      ascending: false,
      limit: 1
    };
    AppleHealthKit.getHeartRateSamples(options, (err, results) => {
      if (err || !results.length) { resolve(null); return; }
      resolve(Math.round(results[0].value));
    });
  });
};

export const getActiveCaloriesToday = () => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) { resolve(0); return; }
    const options = {
      startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      endDate: new Date().toISOString()
    };
    AppleHealthKit.getActiveEnergyBurned(options, (err, results) => {
      if (err || !results.length) { resolve(0); return; }
      const total = results.reduce((sum, r) => sum + r.value, 0);
      resolve(Math.round(total));
    });
  });
};

export const getSleepLastNight = () => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) { resolve(null); return; }
    const options = {
      startDate: new Date(new Date().setHours(0, 0, 0, 0) - 86400000).toISOString(),
      endDate: new Date().toISOString()
    };
    AppleHealthKit.getSleepSamples(options, (err, results) => {
      if (err || !results.length) { resolve(null); return; }
      const asleep = results.filter(r => r.value === 'ASLEEP');
      const totalMs = asleep.reduce((sum, r) => {
        return sum + (new Date(r.endDate) - new Date(r.startDate));
      }, 0);
      resolve(Math.round(totalMs / 3600000 * 10) / 10);
    });
  });
};

export const getDistanceToday = () => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) { resolve(0); return; }
    const options = {
      startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      endDate: new Date().toISOString(),
      unit: 'kilometer'
    };
    AppleHealthKit.getDistanceWalkingRunning(options, (err, result) => {
      if (err) { resolve(0); return; }
      resolve(Math.round((result.value || 0) * 10) / 10);
    });
  });
};