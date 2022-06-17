import React from 'react';
import WebMidi from 'webmidi';
import {get_index_tip_x, get_index_tip_y, get_index_tip_z, compute_spread, compute_yaw, compute_roll, get_index_tip_to_base_dist} from '../coordinateTransform.js';
import * as handpose from '@tensorflow-models/handpose';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
// TODO(annxingyuan): read version from tfjsWasm directly once
// https://github.com/tensorflow/tfjs/pull/2819 is merged.
import {version} from '@tensorflow/tfjs-backend-wasm/dist/version';
import * as tf from '@tensorflow/tfjs-core';
import Stats from "stats-js"
// import Paper from '@material-ui/core/Paper';
import VideoContainer from './VideoContainer';

tfjsWasm.setWasmPath(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
      version}/dist/tfjs-backend-wasm.wasm`);

let videoWidth, videoHeight,
 fingerLookupIndices = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20]
};  // for rendering each finger as a polyline

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 500;

class VideoFrame extends React.Component {

    constructor(props){ 
        super(props);
        this.state = {
          backend: 'webgl'
        }
        this.videoRef = React.createRef()
        this.canvasRef = React.createRef();
    }

    drawPoint(ctx, y, x, r) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
    }

    drawKeypoints(ctx, keypoints) {
      const keypointsArray = keypoints;

      for (let i = 0; i < keypointsArray.length; i++) {
        const y = keypointsArray[i][0];
        const x = keypointsArray[i][1];
        this.drawPoint(ctx, x - 2, y - 2, 3);
      }

      const fingers = Object.keys(fingerLookupIndices);
      for (let i = 0; i < fingers.length; i++) {
        const finger = fingers[i];
        const points = fingerLookupIndices[finger].map(idx => keypoints[idx]);
        this.drawPath(ctx, points, false);
      }
    }

    drawPath(ctx, points, closePath) {

      const region = new Path2D();
      region.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const point = points[i];
        region.lineTo(point[0], point[1]);
      }

      if (closePath) {
        region.closePath();
      }
      ctx.stroke(region);
    }

    async setupCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Browser API navigator.mediaDevices.getUserMedia not available');
      }

      const video = this.videoRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
          facingMode: 'user',
          // Only setting the video to a specified size in order to accommodate a
          // point cloud, so on mobile devices accept the default size.
          width: VIDEO_WIDTH,
          height: VIDEO_HEIGHT
        },
      });

      window.stream = stream;

      video.srcObject = stream;

      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve(video);
        };
      });
    }

    async loadVideo() {
      const video = await this.setupCamera();
      video.play();
      return video;
    }


    async componentDidMount(){
      await tf.setBackend(this.state.backend);
      const model = await handpose.load();
      await this.setState({model:model}) // is this async or not
      let video;


      try {
        video = await this.loadVideo();
        this.props.onInitComplete();
      } catch (e) {
        // let info = document.getElementById('info');
        // info.textContent = e.message;
        // info.style.display = 'block';
        console.error(e);
        throw e;
      }

      this.landmarksRealTime(video);
    }

    componentDidUpdate(){
      //It seems the drawing context is reset everytime the component updates
      const canvas = this.canvasRef.current;
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    async landmarksRealTime (video) {

      if (WebMidi.outputs.length === 0) {
        // https://medium.com/@keybaudio/virtual-midi-devices-on-macos-a45cdbdffdaf
        alert("No MIDI outputs are detected. Either connect a midi device, or create a virtual one. On Mac computers, open 'Audio Midi Setup' > 'MIDI Studio' > double-click IAC Driver > Enable 'Device is online' and refresh this page.");
      }

      const midi_output = WebMidi.outputs[0];
      console.log("midi_output in landmarks:  ", midi_output?.name);
      const {model} = this.state;
      //TODO: move stats instance creation up to parent
      const stats = new Stats();
      stats.showPanel(0);
      document.getElementById("control-area").appendChild(stats.dom);
      stats.domElement.style.position = "absolute"; 
      stats.domElement.style.bottom = "200px"; 
      stats.domElement.style.left = "8px"; 
      stats.domElement.style.top = ""; 

      videoWidth = video.videoWidth;
      videoHeight = video.videoHeight;

      const canvas = this.canvasRef.current;
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const ctx = canvas.getContext('2d');

      video.width = videoWidth;
      video.height = videoHeight;

      ctx.clearRect(0, 0, videoWidth, videoHeight);
      ctx.strokeStyle = 'red';
      ctx.fillStyle = 'red';

      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      const frameLandmarks = async () => {
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'red';
  
        const activeGestures = this.props.gestures;

        stats.begin();
        ctx.drawImage(
            video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width,
            canvas.height);

        // Run inference
        const predictions = await model.estimateHands(video, null, false);

        if (predictions.length > 0) {
          const result = predictions[0].landmarks;
          this.drawKeypoints(ctx, result, predictions[0].annotations);

          // Loop over gestures - if active, compute hand metrics and send midi message
          const midiChannel = 1
          const nordCutoffCC = 59;
          const nordResonanceCC = 60;
          const nordDrawbars1CC = 16;
          const nordDrawbars2CC = 17;
          const nordDrawbars3CC = 18;
          const nordDrawbars4CC = 19;
          const nordDrawbars5CC = 20;
          const nordDrawbars6CC = 21;
          const nordDrawbars7CC = 22;
          const nordDrawbars8CC = 23;
          const nordDrawbars9CC = 24;
          const expressionPedal = 11;
          const nordLeslieSpeedCC = 108;

          let midiVal;
          for (const [gestureType, isActive] of Object.entries(activeGestures)) {

            if (gestureType.localeCompare("xcontrol") === 0 && isActive) {
              midiVal = get_index_tip_x(predictions, VIDEO_WIDTH, VIDEO_HEIGHT);
              midi_output.sendControlChange(16, midiVal, midiChannel);
              console.log(gestureType, midiVal);
            }

            if (gestureType.localeCompare("ycontrol") === 0 && isActive) {
              midiVal = get_index_tip_y(predictions, VIDEO_WIDTH, VIDEO_HEIGHT);
              midi_output.sendControlChange(11, midiVal, midiChannel);
              console.log(gestureType, midiVal);
            }
            if (gestureType.localeCompare("spread") === 0 && isActive) {
              midiVal = compute_spread(predictions, VIDEO_WIDTH, VIDEO_HEIGHT);
              midi_output.sendControlChange(66, midiVal, midiChannel);
              console.log(gestureType, midiVal);
            }

            if (gestureType.localeCompare("rotation") === 0 && isActive) {
              console.log(gestureType);
            }

            if (gestureType.localeCompare("roll") === 0 && isActive) {
              midiVal = compute_roll(predictions, VIDEO_WIDTH, VIDEO_HEIGHT);
              midi_output.sendControlChange(15, midiVal, midiChannel);
              console.log(gestureType, midiVal);
            }

            if (gestureType.localeCompare("proximity") === 0 && isActive) {
              //midiVal = get_index_tip_z(predictions, VIDEO_WIDTH, VIDEO_HEIGHT);
              midiVal = get_index_tip_to_base_dist(predictions, VIDEO_WIDTH, VIDEO_HEIGHT);
              midi_output.sendControlChange(17, midiVal, midiChannel);
              console.log(gestureType, midiVal);
            }

            if (gestureType.localeCompare("pitch") === 0 && isActive) {
              console.log(gestureType);
            }

            if (gestureType.localeCompare("yaw") === 0 && isActive) {
              midiVal = compute_yaw(predictions, VIDEO_WIDTH, VIDEO_HEIGHT);
              midi_output.sendControlChange(16, midiVal, midiChannel);
              console.log(gestureType, midiVal);
            }

          }
        }
        stats.end();
        requestAnimationFrame(frameLandmarks);
      };

      frameLandmarks();
    };

    showDetections(predictions) {
        const ctx = this.canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        const font = "24px helvetica";
        ctx.font = font;
        ctx.textBaseline = "top";

        predictions.forEach(prediction => {
          const x = prediction.bbox[0];
          const y = prediction.bbox[1];
          const width = prediction.bbox[2];
          const height = prediction.bbox[3];
          // Draw the bounding box.
          ctx.strokeStyle = "#2fff00";
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, width, height);
          // Draw the label background.
          ctx.fillStyle = "#2fff00";
          const textWidth = ctx.measureText(prediction.class).width;
          const textHeight = parseInt(font, 10);
          // draw top left rectangle
          ctx.fillRect(x, y, textWidth + 10, textHeight + 10);
          // draw bottom left rectangle
          ctx.fillRect(x, y + height - textHeight, textWidth + 15, textHeight + 10);

          // Draw the text last to ensure it's on top.
          ctx.fillStyle = "#000000";
          ctx.fillText(prediction.class, x, y);
          ctx.fillText(prediction.score.toFixed(2), x, y + height - textHeight);
        });
      };

      render() {
        return (
            <div id="video-container">
              <video
                style={{
                  display:"none",
                  transform: "rotateY(180deg)"
                }}
                ref={this.videoRef}
                width={VIDEO_WIDTH}
                height={VIDEO_HEIGHT}
              />
              <VideoContainer>
                <canvas ref={this.canvasRef} width={videoWidth} height={videoHeight} />
              </VideoContainer>
            </div>
          );
      }

}

export default VideoFrame
