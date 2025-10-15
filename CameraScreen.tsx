
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Platform, ActivityIndicator } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
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
  const cameraRef = useRef<Camera | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [autoBox, setAutoBox] = useState(autoBoxDefault);
  const [isBusy, setIsBusy] = useState(false);
  const [useWebcam, setUseWebcam] = useState(true); // for web: toggle webcam vs upload

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        try { const { status } = await Camera.requestCameraPermissionsAsync(); setHasPermission(status === 'granted'); }
        catch { setHasPermission(false); }
      } else {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      }
    })();
  }, []);

  const performAutoBox = async (photo: PhotoLike) => {
    if (!autoBox) return undefined;
    let guessed: BBox | undefined = undefined;
    try {
      const small = await ImageManipulator.manipulateAsync(
        photo.uri, [{ resize: { width: 256 } }],
        { compress: 0.5, base64: true, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (small.base64) {
        const raw = Buffer.from(small.base64, 'base64');
        // @ts-ignore
        const decoded = jpeg.decode(raw, { useTArray: true });
        const { data, width, height } = decoded;
        let minX = width, minY = height, maxX = 0, maxY = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            const L = 0.299*r + 0.587*g + 0.114*b; // luminance
            if (L < 200) { // darker ink
              if (x < minX) minX = x; if (y < minY) minY = y;
              if (x > maxX) maxX = x; if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX > minX && maxY > minY) {
          const pad = 8;
          minX = Math.max(0, minX - pad);
          minY = Math.max(0, minY - pad);
          maxX = Math.min(width - 1, maxX + pad);
          maxY = Math.min(height - 1, maxY + pad);
          const scale = (photo.width) / width;
          guessed = { x: minX * scale, y: minY * scale, width: (maxX - minX) * scale, height: (maxY - minY) * scale };
        }
      }
    } catch (e) { console.warn('auto box failed', e); }
    return guessed;
  };

  const proceed = async (photo: PhotoLike) => {
    const guessed = await performAutoBox(photo);
    onNext(photo, guessed);
  };

  const onTakeMobile = async () => {
    if (!cameraRef.current || isBusy) return;
    setIsBusy(true);
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: true });
    await proceed(photo as any);
    setIsBusy(false);
  };

  const onPickWeb = async () => {
    setIsBusy(true);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1, base64: false
    });
    if (!res.canceled && res.assets && res.assets[0]) {
      const a = res.assets[0];
      const photo = { uri: a.uri, width: a.width ?? 1200, height: a.height ?? 1600 };
      await proceed(photo);
    }
    setIsBusy(false);
  };

  if (Platform.OS !== 'web') {
    if (hasPermission === null) return <View style={{flex:1, backgroundColor:'#000'}} />;
    if (hasPermission === false) return <View style={styles.center}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        useWebcam && hasPermission ? (
          <Camera style={styles.camera} ref={cameraRef} type={CameraType.back} ratio="4:3" />
        ) : (
          <View style={[styles.camera, styles.center]}>
            <Text style={{ color:'#adb5bd', marginBottom: 12, textAlign:'center' }}>
              {useWebcam ? 'Webcam unavailable. You can upload an image instead.' : 'Upload a worksheet photo to test.'}
            </Text>
            <TouchableOpacity onPress={onPickWeb} style={styles.uploadBtn}>
              <Text style={{ color:'#fff', fontWeight:'700' }}>{isBusy ? 'Loading…' : 'Choose Image'}</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <Camera style={styles.camera} ref={cameraRef} type={CameraType.back} ratio="4:3" />
      )}

      <View style={styles.controls}>
        <View style={styles.row}>
          <Text style={styles.label}>Auto box</Text>
          <Switch value={autoBox} onValueChange={setAutoBox} />
          {Platform.OS === 'web' && (
            <>
              <Text style={[styles.label, { marginLeft: 16 }]}>Use webcam</Text>
              <Switch value={!!useWebcam} onValueChange={setUseWebcam} />
            </>
          )}
        </View>

        {Platform.OS === 'web' && !useWebcam ? (
          <TouchableOpacity style={styles.shutter} onPress={onPickWeb} disabled={isBusy} activeOpacity={0.8}>
            {isBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.shutterTxt}>Upload</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.shutter} onPress={onTakeMobile} disabled={isBusy} activeOpacity={0.8}>
            {isBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.shutterTxt}>●</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  controls: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', marginRight: 8, fontSize: 16 },
  shutter: {
    minWidth: 120, height: 76, borderRadius: 48, backgroundColor: '#1EAEDB',
    justifyContent: 'center', alignItems: 'center', marginTop: 12, paddingHorizontal: 20
  },
  shutterTxt: { color: '#fff', fontSize: 22, lineHeight: 22, fontWeight: '800' },
  center: { flex: 1, alignItems:'center', justifyContent:'center' },
  uploadBtn: { backgroundColor:'#1EAEDB', paddingHorizontal:16, paddingVertical:12, borderRadius:12 }
});
