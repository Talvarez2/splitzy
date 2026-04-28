const OCR = {
  preprocess(imageSource) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Scale up small images for better OCR
        const scale = Math.max(1, 2000 / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;

        // Grayscale
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = d[i + 1] = d[i + 2] = gray;
        }

        // Adaptive threshold: compare each pixel to local average
        // Use a simplified approach: global Otsu-like threshold + contrast boost
        const hist = new Array(256).fill(0);
        for (let i = 0; i < d.length; i += 4) hist[d[i]]++;
        const total = canvas.width * canvas.height;
        let sum = 0, sumB = 0, wB = 0, max = 0, threshold = 128;
        for (let i = 0; i < 256; i++) sum += i * hist[i];
        for (let i = 0; i < 256; i++) {
          wB += hist[i];
          if (!wB) continue;
          const wF = total - wB;
          if (!wF) break;
          sumB += i * hist[i];
          const mB = sumB / wB, mF = (sum - sumB) / wF;
          const between = wB * wF * (mB - mF) * (mB - mF);
          if (between > max) { max = between; threshold = i; }
        }

        // Apply contrast stretch + threshold blend
        // Instead of hard B&W, boost contrast toward threshold
        for (let i = 0; i < d.length; i += 4) {
          let v = d[i];
          // Contrast stretch
          if (v < threshold) {
            v = Math.max(0, v - 40);
          } else {
            v = Math.min(255, v + 40);
          }
          d[i] = d[i + 1] = d[i + 2] = v;
        }

        ctx.putImageData(imageData, 0, 0);

        // Gentle sharpen
        const sharpened = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const src = new Uint8ClampedArray(d);
        const w = canvas.width;
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            const val = 3 * src[idx]
              - 0.5 * src[idx - 4] - 0.5 * src[idx + 4]
              - 0.5 * src[idx - w * 4] - 0.5 * src[idx + w * 4];
            sharpened.data[idx] = sharpened.data[idx + 1] = sharpened.data[idx + 2] =
              Math.min(255, Math.max(0, val));
          }
        }
        ctx.putImageData(sharpened, 0, 0);

        resolve(canvas);
      };
      img.src = imageSource;
    });
  },

  async recognize(imageSource, onProgress) {
    if (onProgress) onProgress(0);
    const canvas = await this.preprocess(imageSource);

    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
      }
    });
    const { data } = await worker.recognize(canvas);
    await worker.terminate();
    return data.text;
  }
};
