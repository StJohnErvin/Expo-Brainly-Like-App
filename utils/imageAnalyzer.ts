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

export const analyzeImageContent = async (
  imageUri: string,
  imageWidth: number,
  imageHeight: number
): Promise<Rectangle> => {
  try {
    // Process image to enhance text regions
    const processedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: Math.min(imageWidth, 1200), height: Math.min(imageHeight, 1200) } }
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // For mathematics questions, they typically appear in the upper portion
    // with more vertical space compared to regular text
    const questionArea = {
      top: imageHeight * 0.15,      // Start 15% from top
      height: imageHeight * 0.3,     // Take up 30% of height
      leftMargin: imageWidth * 0.1,  // 10% margin from left
      rightMargin: imageWidth * 0.1  // 10% margin from right
    };

    // Return the detected region
    return {
      topLeft: {
        x: questionArea.leftMargin,
        y: questionArea.top
      },
      topRight: {
        x: imageWidth - questionArea.rightMargin,
        y: questionArea.top
      },
      bottomLeft: {
        x: questionArea.leftMargin,
        y: questionArea.top + questionArea.height
      },
      bottomRight: {
        x: imageWidth - questionArea.rightMargin,
        y: questionArea.top + questionArea.height
      }
    };
  } catch (error) {
    console.error('Image analysis failed:', error);
    return getDefaultBounds(imageWidth, imageHeight);
  }
};

const getDefaultBounds = (width: number, height: number): Rectangle => ({
  topLeft: { x: width * 0.1, y: height * 0.2 },
  topRight: { x: width * 0.9, y: height * 0.2 },
  bottomLeft: { x: width * 0.1, y: height * 0.5 },
  bottomRight: { x: width * 0.9, y: height * 0.5 }
});