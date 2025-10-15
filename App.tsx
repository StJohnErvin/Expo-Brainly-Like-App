import React, { useState } from 'react';
import { View, StatusBar, Platform } from 'react-native';
import CameraScreen from './CameraScreen';
import PreviewScreen from './PreviewScreen';

export type PhotoLike = { uri: string; width: number; height: number };
export type BBox = { x: number; y: number; width: number; height: number };

export default function App(){
  const [route, setRoute] = useState<'camera' | 'preview'>('camera');
  const [photo, setPhoto] = useState<PhotoLike | null>(null);
  const [box, setBox] = useState<BBox | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#0B0B0F' : '#000' }}>
      <StatusBar barStyle="light-content" />
      {route === 'camera' && (
        <CameraScreen
          autoBoxDefault={true}
          onNext={(p: PhotoLike, guessed?: BBox) => { setPhoto(p); setBox(guessed || null); setRoute('preview'); }}
        />
      )}
      {route === 'preview' && photo && (
        <PreviewScreen
          photo={photo}
          guessedBox={box || undefined}
          onRetake={()=>{ setRoute('camera'); }}
        />
      )}
    </View>
  );
}