import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Dimensions
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';
import CropBox from '../components/CropBox';
import { analyzeImageContent } from '../utils/imageAnalyzer';

interface PhotoLike {
  uri: string;
  width: number;
  height: number;
}

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PreviewScreenProps {
  photo: PhotoLike;
  guessedBox?: BBox;
  onRetake: () => void;
  onComplete?: (croppedUri: string) => void;
}

export default function PreviewScreen({ photo, guessedBox, onRetake, onComplete }: PreviewScreenProps) {
  // Initialize state with optimized default crop area
  const [box, setBox] = useState<BBox>(() => {
    const screenWidth = Dimensions.get('window').width;
    const scale = screenWidth / photo.width;
    const defaultWidth = photo.width * 0.8;
    const defaultHeight = photo.height * 0.3; // Optimized for question-like content

    return guessedBox || {
      x: photo.width * 0.1,
      y: (photo.height - defaultHeight) / 2,
      width: defaultWidth,
      height: defaultHeight
    };
  });

  const [cropped, setCropped] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleCrop = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Optimize crop operation
      const result = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{
          crop: {
            originX: Math.round(box.x),
            originY: Math.round(box.y),
            width: Math.round(box.width),
            height: Math.round(box.height)
          }
        }],
        {
          compress: Platform.select({ ios: 0.8, android: 0.7 }),
          format: ImageManipulator.SaveFormat.JPEG
        }
      );
      
      setCropped(result.uri);
      if (onComplete) {
        onComplete(result.uri);
      }
    } catch (error) {
      console.error('Failed to crop image:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsProcessing(false);
    }
  }, [photo.uri, box, onComplete, isProcessing]);

  // Run basic auto-detection on mount if no guessedBox provided
  React.useEffect(() => {
    if (guessedBox) return;
    let mounted = true;
    const runDetect = async () => {
      setIsDetecting(true);
      try {
        const rect = await analyzeImageContent(photo.uri, photo.width, photo.height);
        if (!mounted) return;
        const newBox = { x: rect.topLeft.x, y: rect.topLeft.y, width: rect.topRight.x - rect.topLeft.x, height: rect.bottomLeft.y - rect.topLeft.y };
        setBox(newBox);
      } catch (e) {
        console.warn('Auto-detect failed', e);
      } finally {
        setIsDetecting(false);
      }
    };
    runDetect();
    return () => { mounted = false; };
  }, [photo.uri]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header row: back, pill, help */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={onRetake}>
          <Text style={styles.iconText}>⟵</Text>
        </TouchableOpacity>

        <View style={styles.pill}>
          <Text style={styles.pillText}>🎁  Get pro</Text>
        </View>

        <TouchableOpacity style={styles.iconButton}>
          <Text style={styles.iconText}>?</Text>
        </TouchableOpacity>
      </View>

      {!cropped ? (
        <>
          {/* Large rounded white card to mimic the screenshot */}
          <View style={styles.whiteCardWrap}>
            <View style={styles.whiteCard}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.whiteImage}
                resizeMode="contain"
              />
              <CropBox imageSize={{ uri: photo.uri, width: photo.width, height: photo.height }} value={box} onChange={setBox} />
              {isDetecting && (
                <View style={styles.detectingOverlay} pointerEvents="none">
                  <ActivityIndicator size="large" color="#1EAEDB" />
                  <Text style={{ color:'#fff', marginTop: 8 }}>Detecting question...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom action bar with large camera circle and actions */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={[styles.actionBtn, styles.ghostBtn]} onPress={onRetake}>
              <Text style={styles.ghostTxt}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={handleCrop}>
              {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmTxt}>Confirm</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.resultWrap}>
          <Image source={{ uri: cropped }} style={styles.resultImage} resizeMode="contain" />

          <View style={styles.subjectSheet}>
            <Text style={styles.sheetTitle}>What is the question related to?</Text>
            <View style={styles.sheetOptions}>
              <TouchableOpacity style={styles.sheetOption}><Text style={styles.sheetOptionText}>Math</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption}><Text style={styles.sheetOptionText}>Biology</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption}><Text style={styles.sheetOptionText}>Physics</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption}><Text style={styles.sheetOptionText}>Chemistry</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption}><Text style={styles.sheetOptionText}>History</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption}><Text style={styles.sheetOptionText}>Geography</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: '#fff', fontSize: 18 },
  pill: {
    backgroundColor: '#ffffff20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: { color: '#fff', fontWeight: '700' },
  imageContainer: {
    flex: 1,
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  whiteCardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteCard: {
    width: '94%',
    height: '82%',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteImage: {
    width: '96%',
    height: '96%'
  },
  detectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000',
  },
  croppedPreview: {
    flex: 1,
    width: '100%',
    borderRadius: 12,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  actionBtn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ghostBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#343A40'
  },
  ghostTxt: { color: '#fff', fontWeight: '700' },
  confirmBtn: { backgroundColor: '#1EAEDB' },
  confirmTxt: { color: '#fff', fontWeight: '700' },
  resultWrap: { flex: 1, backgroundColor: '#0B0B0F', alignItems: 'center' },
  resultImage: { width: '100%', height: '40%', borderRadius: 12 },
  subjectSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  sheetTitle: { textAlign: 'center', fontWeight: '700', marginBottom: 12 },
  sheetOptions: { },
  sheetOption: { paddingVertical: 14, backgroundColor: '#f2f2f2', borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  sheetOptionText: { fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#1EAEDB',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#343A40',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});