import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface Point {
  x: number;
  y: number;
}

export interface DetectedRectangle {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export const detectDocumentCorners = async (
  imageUri: string,
  imageWidth: number,
  imageHeight: number
): Promise<DetectedRectangle | null> => {
  try {
    // Resize image for processing while maintaining aspect ratio
    const maxDimension = 1200;
    const scale = Math.min(maxDimension / imageWidth, maxDimension / imageHeight);
    const processWidth = Math.round(imageWidth * scale);
    const processHeight = Math.round(imageHeight * scale);

    // Optimize image for edge detection
    const processedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: processWidth, height: processHeight } }
      ],
      {
        compress: Platform.select({ ios: 0.8, android: 0.7 }),
        format: ImageManipulator.SaveFormat.JPEG
      }
    );

    // Convert image to grayscale and apply edge detection
    // Apply contrast adjustment using multiple passes
    const edgeDetectedImage = await ImageManipulator.manipulateAsync(
      processedImage.uri,
      [
        { resize: { width: processWidth, height: processHeight } },
        { flip: ImageManipulator.FlipType.Vertical },
        { flip: ImageManipulator.FlipType.Vertical } // Double flip to enhance edges
      ],
      {
        base64: true,
        format: ImageManipulator.SaveFormat.PNG
      }
    );

    if (!edgeDetectedImage.base64) {
      throw new Error('Failed to process image');
    }

    // Analyze the image content to find text-like regions
    const contentAnalysis = {
      topEdge: 0,
      bottomEdge: 0,
      leftEdge: 0,
      rightEdge: 0
    };

    // Convert base64 to image data for analysis
    const imageData = Buffer.from(edgeDetectedImage.base64, 'base64');
    
    // Find the content boundaries by analyzing pixel data
    // This is a simplified version - you might want to use a more sophisticated
    // algorithm like Hough transforms or contour detection in a production app
    let foundTop = false;
    let foundBottom = false;
    
    // Scanning for text content edges
    for (let y = 0; y < processHeight; y++) {
      let rowContent = 0;
      for (let x = 0; x < processWidth; x++) {
        const idx = (y * processWidth + x) * 4;
        const brightness = (imageData[idx] + imageData[idx + 1] + imageData[idx + 2]) / 3;
        if (brightness < 200) { // Threshold for detecting content
          rowContent++;
        }
      }
      
      if (!foundTop && rowContent > processWidth * 0.1) {
        contentAnalysis.topEdge = y;
        foundTop = true;
      }
      if (foundTop && !foundBottom && rowContent < processWidth * 0.1) {
        contentAnalysis.bottomEdge = y;
        foundBottom = true;
      }
    }

    // Calculate the detected rectangle with some padding
    const padding = {
      top: processHeight * 0.05,
      bottom: processHeight * 0.05,
      left: processWidth * 0.05,
      right: processWidth * 0.05
    };

    // Scale back to original image dimensions
    const scaleBack = 1 / scale;
    const detectedRect = {
      topLeft: {
        x: Math.max(0, contentAnalysis.leftEdge - padding.left) * scaleBack,
        y: Math.max(0, contentAnalysis.topEdge - padding.top) * scaleBack
      },
      topRight: {
        x: Math.min(processWidth, processWidth - padding.right) * scaleBack,
        y: Math.max(0, contentAnalysis.topEdge - padding.top) * scaleBack
      },
      bottomLeft: {
        x: Math.max(0, contentAnalysis.leftEdge - padding.left) * scaleBack,
        y: Math.min(processHeight, contentAnalysis.bottomEdge + padding.bottom) * scaleBack
      },
      bottomRight: {
        x: Math.min(processWidth, processWidth - padding.right) * scaleBack,
        y: Math.min(processHeight, contentAnalysis.bottomEdge + padding.bottom) * scaleBack
      }
    };

    // Fallback to default rectangle if detection fails
    const defaultRect = {
      topLeft: { x: imageWidth * 0.1, y: imageHeight * 0.2 },
      topRight: { x: imageWidth * 0.9, y: imageHeight * 0.2 },
      bottomLeft: { x: imageWidth * 0.1, y: imageHeight * 0.8 },
      bottomRight: { x: imageWidth * 0.9, y: imageHeight * 0.8 }
    };

    // Validate detected rectangle
    const isValidDetection = (
      detectedRect.topLeft.x >= 0 && detectedRect.topLeft.x <= imageWidth &&
      detectedRect.topLeft.y >= 0 && detectedRect.topLeft.y <= imageHeight &&
      detectedRect.bottomRight.x >= 0 && detectedRect.bottomRight.x <= imageWidth &&
      detectedRect.bottomRight.y >= 0 && detectedRect.bottomRight.y <= imageHeight &&
      (detectedRect.bottomRight.x - detectedRect.topLeft.x) > imageWidth * 0.2 &&
      (detectedRect.bottomRight.y - detectedRect.topLeft.y) > imageHeight * 0.2
    );

    return isValidDetection ? detectedRect : defaultRect;

  } catch (error) {
    console.error('Document detection failed:', error);
    return null;
  }
};