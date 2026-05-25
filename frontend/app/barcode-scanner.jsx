import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

function WebBarcodeScanner({ onScanned, loading }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    let codeReader;

    const startScanner = async () => {
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      codeReader = new BrowserMultiFormatReader();
      readerRef.current = codeReader;

      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const backCamera = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        ) || devices[devices.length - 1];

        const deviceId = backCamera?.deviceId;

        await codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (result) {
            onScanned(result.getText());
          }
        });
      } catch (err) {
        console.error('Camera error:', err);
      }
    };

    startScanner();

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        autoPlay
        playsInline
        muted
      />
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#F77E2D" />
          <Text style={styles.loadingText}>Looking up product...</Text>
        </View>
      )}
      <View style={styles.scanHint}>
        <Text style={styles.scanHintText}>Point camera at barcode</Text>
      </View>
    </View>
  );
}

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [facing, setFacing] = useState('back');
  const router = useRouter();
  const params = useLocalSearchParams();

  const handleScanned = async (data) => {
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
    return <WebBarcodeScanner onScanned={handleScanned} loading={loading} />;
  }

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

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        onBarcodeScanned={({ data }) => handleScanned(data)}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
      />
      <TouchableOpacity style={styles.flipBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
        <Text style={styles.flipText}>⇄ Flip</Text>
      </TouchableOpacity>
      {loading && (
        <View style={styles.overlay}>
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
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomBar: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  flipBtn: { position: 'absolute', top: 60, right: 24, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99 },
  flipText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  text: { fontSize: 16, color: '#1A1A1A', textAlign: 'center', marginBottom: 16 },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16 },
  button: { backgroundColor: '#F77E2D', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  scanHint: { position: 'absolute', bottom: 60, width: '100%', alignItems: 'center' },
  scanHintText: { color: '#fff', fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 99 }
});