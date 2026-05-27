import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/utils/api';

const compressImageWeb = (uri) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      resolve(dataUrl.split(',')[1]);
    };
    img.src = uri;
  });
};

export default function AIFoodScanScreen() {
  const router = useRouter();
  const { mealType, date } = useLocalSearchParams();
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const pickImage = async (useCamera) => {
    const source = useCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });

    if (!source.canceled) {
      const asset = source.assets[0];
      setImage({ uri: asset.uri });
      setResult(null);

      let base64 = asset.base64;
      if (Platform.OS === 'web') {
        base64 = await compressImageWeb(asset.uri);
      }

      analyzeImage(base64);
    }
  };

  const analyzeImage = async (base64) => {
    setLoading(true);
    try {
      const res = await api.post('/ai-scan', {
        imageBase64: base64,
        mimeType: 'image/jpeg'
      });
      setResult(res.data);
    } catch (err) {
      alert('Could not analyze image. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const addFood = async () => {
    setAdding(true);
    try {
      await api.post('/meals', {
        date,
        mealType,
        food: {
          name: result.name,
          quantity: 100,
          unit: result.servingUnit || 'g',
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          fiber: result.fiber,
          sodium: result.sodium,
          sugar: result.sugar
        }
      });
      router.replace('/(tabs)/diary');
    } catch (err) {
      alert('Failed to add food.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>AI Food Scan</Text>
      <Text style={styles.subtitle}>Take a photo or upload one to identify food and get nutrition estimates.</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(true)}>
          <Text style={styles.actionBtnText}>📷 Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(false)}>
          <Text style={styles.actionBtnText}>🖼 Gallery</Text>
        </TouchableOpacity>
      </View>

      {image && (
        <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
      )}

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#F77E2D" size="large" />
          <Text style={styles.loadingText}>Analyzing food...</Text>
        </View>
      )}

      {result && !loading && (
        <View style={styles.resultCard}>
          <Text style={styles.foodName}>{result.name}</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{result.calories}</Text>
              <Text style={styles.macroLabel}>kcal</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{result.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{result.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{result.fat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
          <Text style={styles.disclaimer}>Estimates per 100g. Tap add to log this food.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addFood} disabled={adding}>
            <Text style={styles.addBtnText}>{adding ? 'Adding...' : 'Add to Diary'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  back: { color: '#F77E2D', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', marginBottom: 24 },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionBtn: { flex: 1, borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnText: { color: '#F77E2D', fontWeight: '700' },
  preview: { width: '100%', height: 220, borderRadius: 16, marginBottom: 24 },
  loadingBox: { alignItems: 'center', marginTop: 20 },
  loadingText: { color: '#888', marginTop: 10, fontSize: 14 },
  resultCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20 },
  foodName: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 16 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '800', color: '#F77E2D' },
  macroLabel: { fontSize: 11, color: '#888', marginTop: 2, textTransform: 'uppercase' },
  disclaimer: { fontSize: 11, color: '#aaa', marginBottom: 16 },
  addBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});