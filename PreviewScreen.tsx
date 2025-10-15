
import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import CropBox from './components/CropBox';

type PhotoLike = { uri: string; width: number; height: number };
type BBox = { x: number; y: number; width: number; height: number };

export default function PreviewScreen({ photo, guessedBox, onRetake }:{ photo: PhotoLike; guessedBox?: BBox; onRetake: ()=>void; }) {
  const [box, setBox] = useState(guessedBox || { x: photo.width*0.1, y: photo.height*0.25, width: photo.width*0.8, height: photo.height*0.5 });
  const [cropped, setCropped] = useState<string | null>(null);

  const onConfirm = async () => {
    const result = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ crop: { originX: box.x, originY: box.y, width: box.width, height: box.height }}],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );
    setCropped(result.uri);
  };

  return (
    <View style={styles.container}>
      {!cropped ? (
        <>
          <View style={styles.imageWrap}>
            <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
            <CropBox imageSize={{ width: photo.width, height: photo.height }} onChange={setBox} value={box} />
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
            <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={()=> setCropped(null)}>
              <Text style={[styles.btnTxt, styles.ghostTxt]}>Adjust</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={onRetake}>
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
