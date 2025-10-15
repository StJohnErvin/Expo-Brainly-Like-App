import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Switch } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
// @ts-ignore
import jpeg from 'jpeg-js';

type PhotoLike = { uri: string; width: number; height: number };
type BBox = { x: number; y: number; width: number; height: number };

export default function CameraScreen({
  autoBoxDefault = true,
  onNext
}: {
  autoBoxDefault?: boolean;
  onNext: (photo: PhotoLike, guessed?: BBox) => void;
}) {
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [autoBox, setAutoBox] = useState(autoBoxDefault);
  const [isBusy, setIsBusy] = useState(false);
  const [useWebcam, setUseWebcam] = useState(true);

  // ✅ ask for camera permission
  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  const performAutoBox = async (photo: PhotoLike) => {
    if (!autoBox || Platform.OS !== 'web') return undefined;
    try {
      const small = await ImageManipulator.manipulateAsync(
        photo.uri, [{ resize: { width: 256 } }],
        { compress: 0.5, base64: true, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (small.base64 && typeof Buffer !== 'undefined') {
        const raw = Buffer.from(small.base64, 'base64');
        // @ts-ignore
        const decoded = jpeg.decode(raw, { useTArray: true });
        const { data, width, height } = decoded;
        let minX = width, minY = height, maxX = 0, maxY = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const L = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (L < 200) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX > minX && maxY > minY) {
          const pad = 8;
          const scale = photo.width / width;
          return {
            x: (minX - pad) * scale,
            y: (minY - pad) * scale,
            width: (maxX - minX + 2 * pad) * scale,
            height: (maxY - minY + 2 * pad) * scale,
          };
        }
      }
    } catch (e) {
      console.warn('auto box failed', e);
    }
    return undefined;
  };

  const proceed = async (photo: PhotoLike) => {
    const guessed = await performAutoBox(photo);
    onNext(photo, guessed);
  };

  const onTakeMobile = async () => {
    if (!cameraRef.current || isBusy) return;
    setIsBusy(true);
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    await proceed(photo);
    setIsBusy(false);
  };

  const onPickWeb = async () => {
    setIsBusy(true);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      const photo = { uri: a.uri, width: a.width ?? 1200, height: a.height ?? 1600 };
      await proceed(photo);
    }
    setIsBusy(false);
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!permission.granted)
    return (
      <View style={styles.center}>
        <Text style={{ color: '#fff' }}>Camera access needed</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.uploadBtn}>
          <Text style={{ color: '#fff' }}>Grant access</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        useWebcam ? (
          <CameraView style={styles.camera} ref={cameraRef} facing="back" />
        ) : (
          <View style={[styles.camera, styles.center]}>
            <Text style={{ color: '#adb5bd', marginBottom: 12 }}>Upload a worksheet photo</Text>
            <TouchableOpacity onPress={onPickWeb} style={styles.uploadBtn}>
              <Text style={{ color: '#fff' }}>{isBusy ? 'Loading…' : 'Choose Image'}</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <CameraView style={styles.camera} ref={cameraRef} facing="back" />
      )}

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.headerIcon}><Text style={styles.headerIconTxt}>⟲</Text></TouchableOpacity>
          <View style={styles.getProPill}><Text style={styles.getProText}>🎁 Get Pro</Text></View>
          <TouchableOpacity style={styles.headerIcon}><Text style={styles.headerIconTxt}>?</Text></TouchableOpacity>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.shutterRow}>
          <TouchableOpacity style={styles.smallIcon} onPress={onPickWeb}><Text style={styles.smallIconTxt}>🖼️</Text></TouchableOpacity>
          <TouchableOpacity style={styles.bigShutter} onPress={onTakeMobile} disabled={isBusy}>
            <View style={styles.shutterOuter}>
              <View style={styles.shutterInner}>{isBusy && <ActivityIndicator color="#fff" />}</View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallIcon}><Text style={styles.smallIconTxt}>🎤</Text></TouchableOpacity>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Auto-box</Text>
          <Switch value={autoBox} onValueChange={setAutoBox} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  uploadBtn: { backgroundColor: '#1EAEDB', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },

  headerRow: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '90%', alignSelf: 'center' },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerIconTxt: { color: '#fff', fontSize: 18 },
  getProPill: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  getProText: { color: '#000', fontWeight: '700' },

  controls: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  shutterRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', paddingHorizontal: 24 },
  smallIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  smallIconTxt: { fontSize: 20, color: '#fff' },
  bigShutter: { alignItems: 'center', justifyContent: 'center' },
  shutterOuter: { width: 94, height: 94, borderRadius: 47, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#6CC0C9' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  switchLabel: { color: '#fff', marginRight: 8, fontSize: 16 },
});
