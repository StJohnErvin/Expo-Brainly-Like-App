import { useState, useEffect } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { loadOpenCV } from '../utils/opencv';

interface EdgeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useEdgeDetection = (imageUri: string, imageWidth: number, imageHeight: number) => {
  const [detectedEdges, setDetectedEdges] = useState<EdgeBox | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const detectEdges = async () => {
      setIsProcessing(true);
      try {
        // Resize image for faster processing while maintaining aspect ratio
        const maxDimension = 800;
        const scale = Math.min(maxDimension / imageWidth, maxDimension / imageHeight);
        const processWidth = Math.round(imageWidth * scale);
        const processHeight = Math.round(imageHeight * scale);

        const resized = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: processWidth, height: processHeight } }],
          { format: ImageManipulator.SaveFormat.JPEG }
        );

        const cv = await loadOpenCV();
        if (!cv) return;

        // Load image into OpenCV
        const img = await cv.imread(resized.uri);
        
        // Convert to grayscale
        const gray = new cv.Mat();
        cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);
        
        // Apply Gaussian blur
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
        
        // Apply Canny edge detection
        const edges = new cv.Mat();
        cv.Canny(blurred, edges, 75, 200);
        
        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        // Find the largest rectangular contour
        let maxArea = 0;
        let maxRect = { x: 0, y: 0, width: 0, height: 0 };
        
        for (let i = 0; i < contours.size(); ++i) {
          const cnt = contours.get(i);
          const rect = cv.boundingRect(cnt);
          const area = rect.width * rect.height;
          
          if (area > maxArea) {
            maxArea = area;
            maxRect = rect;
          }
        }

        // Scale back to original image dimensions
        const scaleBack = 1 / scale;
        const originalRect = {
          x: Math.round(maxRect.x * scaleBack),
          y: Math.round(maxRect.y * scaleBack),
          width: Math.round(maxRect.width * scaleBack),
          height: Math.round(maxRect.height * scaleBack),
        };

        setDetectedEdges(originalRect);

        // Clean up OpenCV objects
        img.delete();
        gray.delete();
        blurred.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();

      } catch (error) {
        console.error('Edge detection failed:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    if (imageUri && imageWidth && imageHeight) {
      detectEdges();
    }
  }, [imageUri, imageWidth, imageHeight]);

  return { detectedEdges, isProcessing };
};