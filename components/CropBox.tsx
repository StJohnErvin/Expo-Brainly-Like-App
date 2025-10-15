
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent, Platform } from 'react-native';
import { analyzeImageContent } from '../utils/imageAnalyzer';

interface ImageSize {
  uri: string;
  width: number;
  height: number;
}

interface CropBoxProps {
  imageSize: ImageSize;
  value: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onChange: (rect: { x: number; y: number; width: number; height: number }) => void;
}

export default function CropBox({ imageSize, value, onChange }: CropBoxProps) {
  const [layout, setLayout] = useState({ x:0,y:0,width:0,height:0 });
  const [rect, setRect] = useState(value);
  useEffect(() => {
    const detectQuestion = async () => {
      try {
        const detectedBounds = await analyzeImageContent(
          imageSize.uri,
          imageSize.width,
          imageSize.height
        );

        // Convert the detected rectangle to crop box format
        const newRect = {
          x: detectedBounds.topLeft.x,
          y: detectedBounds.topLeft.y,
          width: detectedBounds.topRight.x - detectedBounds.topLeft.x,
          height: detectedBounds.bottomLeft.y - detectedBounds.topLeft.y
        };

        setRect(newRect);
        onChange(newRect);
      } catch (error) {
        console.error('Failed to detect question:', error);
        setRect(value);
      }
    };

    detectQuestion();
  }, [imageSize.uri]);
  const onLayout = (e: LayoutChangeEvent) => setLayout(e.nativeEvent.layout);
  const fitted = useMemo(()=>{
    const containerRatio = (layout.width || 1) / Math.max(1, layout.height || 1);
    const imageRatio = imageSize.width / imageSize.height;
    let drawW=0, drawH=0, offsetX=0, offsetY=0;
    if (imageRatio > containerRatio) {
      drawW = layout.width; 
      drawH = drawW / imageRatio;
      offsetY = (layout.height - drawH) / 2;
    } else {
      drawH = layout.height;
      drawW = drawH * imageRatio;
      offsetX = (layout.width - drawW) / 2;
    }
    return { drawW, drawH, offsetX, offsetY };
  }, [layout, imageSize.width, imageSize.height]);
  const toScreen = (px: number, py: number) => ({
    sx: fitted.offsetX + (px / imageSize.width) * fitted.drawW,
    sy: fitted.offsetY + (py / imageSize.height) * fitted.drawH
  });
  const fromScreen = (sx: number, sy: number) => ({
    px: Math.max(0, Math.min(imageSize.width, ((sx - fitted.offsetX) / Math.max(1, fitted.drawW)) * imageSize.width)),
    py: Math.max(0, Math.min(imageSize.height, ((sy - fitted.offsetY) / Math.max(1, fitted.drawH)) * imageSize.height))
  });
  const [drag, setDrag] = useState<any>(null);
  const pan = useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder: ()=>true,
    onPanResponderGrant: (evt)=>{
      const { locationX, locationY } = evt.nativeEvent;
      const s = screenRect();
      const handles = handleRects(s);
      const which = Object.keys(handles).find(k => inRect({x:locationX,y:locationY}, handles[k])) || 'move';
      setDrag({ which, start: { x: locationX, y: locationY, rect } });
    },
    onPanResponderMove: (evt)=>{
      if (!drag) return;
      const { locationX, locationY } = evt.nativeEvent;
      const dx = locationX - drag.start.x;
      const dy = locationY - drag.start.y;
      const s = drag.start.rect;
      let next = { ...s };
      const minW = 40, minH = 40;
      if (drag.which === 'move') {
        const a = fromScreen(toScreen(s.x, s.y).sx + dx, toScreen(s.x, s.y).sy + dy);
        next.x = a.px; next.y = a.py;
      } else {
        const tl = toScreen(s.x, s.y);
        const br = toScreen(s.x + s.width, s.y + s.height);
        if (drag.which.includes('l')) tl.sx += dx;
        if (drag.which.includes('t')) tl.sy += dy;
        if (drag.which.includes('r')) br.sx += dx;
        if (drag.which.includes('b')) br.sy += dy;
        const p1 = fromScreen(tl.sx, tl.sy);
        const p2 = fromScreen(br.sx, br.sy);
        next = { x: Math.min(p1.px, p2.px), y: Math.min(p1.py, p2.py), width: Math.max(minW, Math.abs(p2.px - p1.px)), height: Math.max(minH, Math.abs(p2.py - p1.py)) };
      }
      setRect(next); onChange(next);
    },
    onPanResponderRelease: ()=> setDrag(null),
  }), [drag, imageSize.width, imageSize.height, layout]);

  const screenRect = () => {
    const tl = toScreen(rect.x, rect.y);
    const br = toScreen(rect.x + rect.width, rect.y + rect.height);
    return { x: tl.sx, y: tl.sy, width: br.sx - tl.sx, height: br.sy - tl.sy };
  };
  const handleRects = (r:any) => {
    const size = 36; // larger touch target for one-handed use
    return {
      tl: { x: r.x - size/2, y: r.y - size/2, width: size, height: size },
      tr: { x: r.x + r.width - size/2, y: r.y - size/2, width: size, height: size },
      bl: { x: r.x - size/2, y: r.y + r.height - size/2, width: size, height: size },
      br: { x: r.x + r.width - size/2, y: r.y + r.height - size/2, width: size, height: size },
      t: { x: r.x + r.width/2 - size/2, y: r.y - size/2, width: size, height: size },
      b: { x: r.x + r.width/2 - size/2, y: r.y + r.height - size/2, width: size, height: size },
      l: { x: r.x - size/2, y: r.y + r.height/2 - size/2, width: size, height: size },
      r: { x: r.x + r.width - size/2, y: r.y + r.height/2 - size/2, width: size, height: size },
    };
  };
  const inRect = (p:any, r:any) => p.x>=r.x && p.x<=r.x+r.width && p.y>=r.y && p.y<=r.y+r.height;

  const srect = screenRect();
  const handles = handleRects(srect);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} {...pan.panHandlers}>
      <View style={[styles.mask]} />
      <View style={[styles.box, { left: srect.x, top: srect.y, width: srect.width, height: srect.height }]} />

      {/* guide lines between corners */}
      {(() => {
        const corners = [
          { x: srect.x, y: srect.y },
          { x: srect.x + srect.width, y: srect.y },
          { x: srect.x + srect.width, y: srect.y + srect.height },
          { x: srect.x, y: srect.y + srect.height }
        ];
        return corners.map((c, i) => {
          const next = corners[(i + 1) % corners.length];
          const dx = next.x - c.x;
          const dy = next.y - c.y;
          const length = Math.sqrt(dx*dx + dy*dy);
          const angle = Math.atan2(dy, dx) + 'rad';
          return (
            <View
              key={`line-${i}`}
              style={[
                styles.guideLine,
                { left: c.x, top: c.y, width: length, transform: [{ rotate: angle }] }
              ]}
            />
          );
        });
      })()}

      {Object.entries(handles).map(([k,r]: any) => (
        <View key={k} style={[styles.handle, { left: r.x, top: r.y, width: r.width, height: r.height }]}> 
          <View style={styles.handleInner} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#1EAEDB',
    borderRadius: 8,
    backgroundColor: 'rgba(30,174,219,0.08)'
  },
  handle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1EAEDB',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
  ,
  guideLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#1EAEDB',
    opacity: 0.95,
  },
  handleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    alignSelf: 'center',
    marginTop: 6
  }
});
