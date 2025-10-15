let opencv: any = null;

export const loadOpenCV = async () => {
  if (opencv) return opencv;

  try {
    // Load OpenCV.js from CDN only if 'document' is available
    if (typeof document !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.5.5/opencv.js';
      document.body.appendChild(script);

      return new Promise((resolve) => {
        script.onload = () => {
          opencv = (globalThis as any).cv;
          resolve(opencv);
        };
      });
    } else {
      throw new Error("'document' is not available in this environment.");
    }
  } catch (error) {
    console.error('Failed to load OpenCV:', error);
    return null;
  }
};