class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      // Copy the frame so main-thread code receives a stable snapshot.
      this.port.postMessage(new Float32Array(input[0]));
    }
    return true;
  }
}
registerProcessor("audio-processor", AudioProcessor);
