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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {!cropped ? (
        <>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: photo.uri }}
              style={styles.image}
              resizeMode="contain"
            />
            <CropBox
              imageSize={photo}
              value={box}
              onChange={setBox}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onRetake}
            >
              <Text style={styles.buttonTextSecondary}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleCrop}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonTextPrimary}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: cropped }}
            style={styles.croppedPreview}
            resizeMode="contain"
          />
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setCropped(null)}
            >
              <Text style={styles.buttonTextSecondary}>Adjust</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onRetake}
            >
              <Text style={styles.buttonTextPrimary}>Done</Text>
            </TouchableOpacity>
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