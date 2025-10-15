
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';

export default function CropBox({ imageSize, value, onChange }: any) {
  const [layout, setLayout] = useState({ x:0,y:0,width:0,height:0 });
  const [rect, setRect] = useState(value);
  useEffect(()=>setRect(value),[value.x,value.y,value.width,value.height]);
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
    const size = 20;
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
      {Object.entries(handles).map(([k,r]: any) => (
        <View key={k} style={[styles.handle, { left: r.x, top: r.y, width: r.width, height: r.height }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mask: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  box: { position: 'absolute', borderWidth: 2, borderColor: '#1EAEDB', borderRadius: 8, backgroundColor: 'rgba(30,174,219,0.08)' },
  handle: { position: 'absolute', borderRadius: 10, backgroundColor: '#1EAEDB' }
});
