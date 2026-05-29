import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#EDE8DF',
          borderTopColor: '#D9D3C8',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
        },
        tabBarActiveTintColor: '#F77E2D',
        tabBarInactiveTintColor: '#999',
        tabBarIcon: ({ color, size }) => {
          const icons = {
            dashboard: 'home',
            diary: 'book',
            recipes: 'restaurant',
            workout: 'barbell',
            health: 'heart',
            progress: 'stats-chart',
            profile: 'person',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
      <Tabs.Screen name="diary" options={{ title: 'Diary' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes' }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout' }} />
      <Tabs.Screen name="health" options={{ title: 'Health' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}