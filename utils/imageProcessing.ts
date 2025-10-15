import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

interface Point {
  x: number;
  y: number;
}

interface Rectangle {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export const detectEdges = async (
  imageUri: string,
  imageWidth: number,
  imageHeight: number
): Promise<Rectangle> => {
  try {
    // Resize image for faster processing while maintaining aspect ratio
    const maxDimension = 1200;
    const scale = Math.min(maxDimension / imageWidth, maxDimension / imageHeight);
    const processWidth = Math.round(imageWidth * scale);
    const processHeight = Math.round(imageHeight * scale);

    // Process the image to enhance edges
    const processedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: processWidth, height: processHeight } }
      ],
      {
        compress: Platform.select({ ios: 0.8, android: 0.7 }),
        format: ImageManipulator.SaveFormat.PNG
      }
    );

    // For now, return a default rectangle around the likely question area
    // You can enhance this with ML Kit Text Recognition or other mobile-friendly
    // solutions for better edge detection
    const padding = {
      horizontal: imageWidth * 0.1,
      vertical: imageHeight * 0.1
    };

    return {
      topLeft: {
        x: padding.horizontal,
        y: padding.vertical
      },
      topRight: {
        x: imageWidth - padding.horizontal,
        y: padding.vertical
      },
      bottomLeft: {
        x: padding.horizontal,
        y: imageHeight - padding.vertical
      },
      bottomRight: {
        x: imageWidth - padding.horizontal,
        y: imageHeight - padding.vertical
      }
    };
  } catch (error) {
    console.error('Edge detection failed:', error);
    // Return a fallback rectangle covering most of the image
    return {
      topLeft: { x: imageWidth * 0.1, y: imageHeight * 0.1 },
      topRight: { x: imageWidth * 0.9, y: imageHeight * 0.1 },
      bottomLeft: { x: imageWidth * 0.1, y: imageHeight * 0.9 },
      bottomRight: { x: imageWidth * 0.9, y: imageHeight * 0.9 }
    };
  }
};

export const getQuestionBounds = (
  imageWidth: number,
  imageHeight: number
): Rectangle => {
  // Calculate a reasonable default rectangle for a question
  // Usually questions appear in the center-top portion of the image
  const margin = {
    top: imageHeight * 0.15,
    bottom: imageHeight * 0.4,
    left: imageWidth * 0.1,
    right: imageWidth * 0.1
  };

  return {
    topLeft: {
      x: margin.left,
      y: margin.top
    },
    topRight: {
      x: imageWidth - margin.right,
      y: margin.top
    },
    bottomLeft: {
      x: margin.left,
      y: margin.bottom
    },
    bottomRight: {
      x: imageWidth - margin.right,
      y: margin.bottom
    }
  };
};