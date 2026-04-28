const OCR = {
  async recognize(imageSource, onProgress) {
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
      }
    });
    const { data } = await worker.recognize(imageSource);
    await worker.terminate();
    return data.text;
  }
};
