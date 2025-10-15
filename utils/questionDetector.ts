import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export const detectQuestionBounds = async (
  imageUri: string,
  imageWidth: number,
  imageHeight: number
): Promise<Rectangle> => {
  try {
    // Calculate proportional dimensions for processing
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
        format: ImageManipulator.SaveFormat.JPEG
      }
    );

    // For the initial version, we'll return a rectangle that's likely to contain
    // the question, based on typical question paper layouts
    const questionBounds = calculateQuestionBounds(imageWidth, imageHeight);
    return questionBounds;

  } catch (error) {
    console.error('Failed to detect question bounds:', error);
    return getDefaultBounds(imageWidth, imageHeight);
  }
};

export const calculateQuestionBounds = (
  imageWidth: number,
  imageHeight: number
): Rectangle => {
  // Calculate margins that typically contain a question
  const horizontalMargin = imageWidth * 0.1;  // 10% margin from sides
  const topMargin = imageHeight * 0.2;        // 20% margin from top
  const bottomMargin = imageHeight * 0.2;     // 20% margin from bottom

  return {
    topLeft: {
      x: horizontalMargin,
      y: topMargin
    },
    topRight: {
      x: imageWidth - horizontalMargin,
      y: topMargin
    },
    bottomLeft: {
      x: horizontalMargin,
      y: imageHeight - bottomMargin
    },
    bottomRight: {
      x: imageWidth - horizontalMargin,
      y: imageHeight - bottomMargin
    }
  };
};

export const getDefaultBounds = (
  imageWidth: number,
  imageHeight: number
): Rectangle => {
  return {
    topLeft: { x: imageWidth * 0.1, y: imageHeight * 0.2 },
    topRight: { x: imageWidth * 0.9, y: imageHeight * 0.2 },
    bottomLeft: { x: imageWidth * 0.1, y: imageHeight * 0.8 },
    bottomRight: { x: imageWidth * 0.9, y: imageHeight * 0.8 }
  };
};