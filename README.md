
# Expo Question Cropper – Mobile + Web (Auto Box like Brainly)

Camera + crop-box flow with **auto-box (edge detection)** and manual adjust, inspired by Brainly/Gauth.  
Runs on **iOS, Android, and Web** (Expo for Web).

## Run
```bash
npm install
npm run start   # press i (iOS) or a (Android)
npm run web     # web tester
```

## How it works
- **Camera or Upload**: On web, you can toggle between webcam and upload.
- **Auto box**: When enabled, downscales the image and uses `jpeg-js` luminance to infer dark-ink region bounds.
- **Crop overlay**: Drag the rectangle or its handles; updates a precise crop region.
- **Preview**: Confirm to see only the selected region; Retake to shoot again.

## No external APIs
Everything runs client-side via Expo APIs.

## Test PDFs
- Questions: https://mmerevise.co.uk/app/uploads/2020/02/Prime-factor-trees-HCF-LCM-Questions-MME.pdf
- Answers:   https://mmerevise.co.uk/app/uploads/2020/02/Prime-factor-trees-HCF-LCM-Answers-MME.pdf

## Decisions & Tradeoffs
- Auto-box uses simple luminance thresholding (fast, robust for black text on white).
- PanResponder-based overlay works with touch + mouse.
- ImageManipulator avoids heavy pixel work in JS for cropping result.

## Deploy to Vercel (Web)

1. Build the static bundle:
   ```bash
   npm run build:web
   ```
   This creates the `web-build/` directory with `index.html`, `static/`, etc.

2. Deploy `web-build` on Vercel:
   - Keep `vercel.json` at the project root (already included).
   - Connect the repo to Vercel or upload; set output dir to `web-build` if prompted.

3. Make sure your site is on **HTTPS** (Vercel defaults to HTTPS) so the camera works.
