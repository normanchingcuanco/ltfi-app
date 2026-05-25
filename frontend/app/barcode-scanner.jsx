import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [facing, setFacing] = useState('back');
  const router = useRouter();
  const params = useLocalSearchParams();
  const videoRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      startWebCamera();
    }
    return () => {
      if (Platform.OS === 'web') stopWebCamera();
    };
  }, []);

  const startWebCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: 'environment' } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      // fallback to any camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        console.error(e);
      }
    }
  };

  const stopWebCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera access is required to scan barcodes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const res = await api.get(`/food/barcode/${data}`);
      router.replace({ pathname: '/add-food', params: { ...params, prefillFood: JSON.stringify(res.data) } });
    } catch (err) {
      alert('Product not found. Try adding it manually.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <View style={styles.overlay}>
          <Text style={styles.webScanText}>Point rear camera at barcode</Text>
          <Text style={styles.webScanSub}>Barcode scanning on web is limited. Use AI Scan or Custom entry for best results.</Text>
        </View>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#F77E2D" />
            <Text style={styles.loadingText}>Looking up product...</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
      />
      <TouchableOpacity style={styles.flipBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
        <Text style={styles.flipText}>⇄ Flip</Text>
      </TouchableOpacity>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F77E2D" />
          <Text style={styles.loadingText}>Looking up product...</Text>
        </View>
      )}
      {scanned && !loading && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.button} onPress={() => setScanned(false)}>
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF', padding: 24 },
  overlay: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center', padding: 24 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomBar: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  flipBtn: { position: 'absolute', top: 60, right: 24, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99 },
  flipText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  webScanText: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  webScanSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center' },
  text: { fontSize: 16, color: '#1A1A1A', textAlign: 'center', marginBottom: 16 },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16 },
  button: { backgroundColor: '#F77E2D', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 }
});