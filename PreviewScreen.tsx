
import React, { useCallback, useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import CropBox from './components/CropBox';
import { PhotoLike, BBox } from './types';

interface PreviewScreenProps {
  photo: PhotoLike;
  guessedBox?: BBox;
  onRetake: () => void;
  onDone?: (croppedUri: string) => void;
}

export default function PreviewScreen({ photo, guessedBox, onRetake, onDone }: PreviewScreenProps) {
  const [box, setBox] = useState(guessedBox || { x: photo.width*0.1, y: photo.height*0.25, width: photo.width*0.8, height: photo.height*0.5 });
  const [cropped, setCropped] = useState<string | null>(null);

  const onConfirm = useCallback(async () => {
    try {
      // Optimize image manipulation for performance
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
          compress: Platform.select({ ios: 0.8, android: 0.7 }), // Balance quality vs performance
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false // Don't generate base64 for better performance
        }
      );
      setCropped(result.uri);
    } catch (error) {
      console.error('Failed to crop image:', error);
      // You might want to show an error message to the user here
    }
  }, [photo.uri, box]);

  return (
    <View style={styles.container}>
      {!cropped ? (
        <>
          <View style={styles.imageWrap}>
            <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
            <CropBox 
              imageSize={{ 
                uri: photo.uri,
                width: photo.width, 
                height: photo.height 
              }} 
              onChange={setBox} 
              value={box} 
            />
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={onRetake}>
              <Text style={[styles.btnTxt, styles.ghostTxt]}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={onConfirm}>
              <Text style={styles.btnTxt}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding: 16 }}>
          <Image source={{ uri: cropped }} style={{ width: '100%', height: undefined, aspectRatio: 1, borderRadius: 12 }} />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity 
              style={[styles.btn, styles.ghost]} 
              onPress={() => setCropped(null)}
            >
              <Text style={[styles.btnTxt, styles.ghostTxt]}>Adjust</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.btn} 
              onPress={() => {
                if (cropped && onDone) {
                  onDone(cropped);
                }
              }}
            >
              <Text style={styles.btnTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  imageWrap: { flex: 1, marginTop: 24, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden' },
  actions: { padding: 16, flexDirection: 'row', gap: 12 },
  btn: { flex: 1, backgroundColor: '#1EAEDB', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700' },
  ghost: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#343A40' },
  ghostTxt: { color: '#fff' }
});
