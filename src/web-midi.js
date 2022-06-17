import WebMidi from 'webmidi'
export const webMidiInit = () => (new Promise((resolve, reject) => {
    WebMidi.enable(function (err) {

      if (err) {
        console.log("WebMidi could not be enabled.", err);
        reject(err);

      } else {
        console.log("WebMidi enabled!");
        resolve();
      }
    })
  }));

  