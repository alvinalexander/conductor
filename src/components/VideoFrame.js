import React from 'react';
import * as THREE from 'three';
import WebMidi from 'webmidi'
import * as handpose from '@tensorflow-models/handpose';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
// TODO(annxingyuan): read version from tfjsWasm directly once
// https://github.com/tensorflow/tfjs/pull/2819 is merged.
import {version} from '@tensorflow/tfjs-backend-wasm/dist/version';
import * as tf from '@tensorflow/tfjs-core';
import {ScatterGL} from 'scatter-gl';
import Stats from "stats-js"
tfjsWasm.setWasmPath(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
      version}/dist/tfjs-backend-wasm.wasm`);

let videoWidth, videoHeight,
scatterGLHasInitialized = false, scatterGL, fingerLookupIndices = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20]
};  // for rendering each finger as a polyline

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 500;
const renderPointcloud = false;

class VideoFrame extends React.Component {

    constructor(props){
        super(props);
        this.state = {
          backend: 'webgl'
        }
        this.videoRef = React.createRef();
        this.canvasRef = React.createRef();
        this.styles = {
            position: 'fixed',
            top: 150,
            left: 150,
        }
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

      // window.stream = stream;
      
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
      } catch (e) {
        let info = document.getElementById('info');
        info.textContent = e.message;
        info.style.display = 'block';
        throw e;
      }
    
      this.landmarksRealTime(video);
    }

    async landmarksRealTime (video) {
      const {model} = this.state;
      const stats = new Stats();
      stats.showPanel(0);
      document.body.appendChild(stats.dom);
      stats.domElement.style = {
        top: 500,
        left: 500,
      };
    
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
    
      // These anchor points allow the hand pointcloud to resize according to its
      // position in the input.
      const ANCHOR_POINTS = [
        [0, 0, 0], [0, -VIDEO_HEIGHT, 0], [-VIDEO_WIDTH, 0, 0],
        [-VIDEO_WIDTH, -VIDEO_HEIGHT, 0]
      ];
    
      const frameLandmarks = async () => {
        stats.begin();
        ctx.drawImage(
            video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width,
            canvas.height);
        const predictions = await model.estimateHands(video);
        if (predictions.length > 0) {
          const result = predictions[0].landmarks;
          this.drawKeypoints(ctx, result, predictions[0].annotations);
    
          if (renderPointcloud === true && scatterGL != null) {
            const pointsData = result.map(point => {
              return [-point[0], -point[1], -point[2]];
            });
    
            const dataset =
                new ScatterGL.Dataset([...pointsData, ...ANCHOR_POINTS]);
    
            if (!scatterGLHasInitialized) {
              scatterGL.render(dataset);
    
              const fingers = Object.keys(fingerLookupIndices);
    
              scatterGL.setSequences(
                  fingers.map(finger => ({indices: fingerLookupIndices[finger]})));
              scatterGL.setPointColorer((index) => {
                if (index < pointsData.length) {
                  return 'steelblue';
                }
                return 'white';  // Hide.
              });
            } else {
              scatterGL.updateDataset(dataset);
            }
            scatterGLHasInitialized = true;
          }
        }
        stats.end();
        requestAnimationFrame(frameLandmarks);
      };
    
      frameLandmarks();
    
      if (renderPointcloud) {
        document.querySelector('#scatter-gl-container').style =
            `width: ${VIDEO_WIDTH}px; height: ${VIDEO_HEIGHT}px;`;
    
        scatterGL = new ScatterGL(
            document.querySelector('#scatter-gl-container'),
            {'rotateOnStart': false, 'selectEnabled': false});
      }
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
            <div> 
              <video
                style={this.styles}
                autoPlay
                muted
                ref={this.videoRef}
                width={VIDEO_WIDTH}
                height={VIDEO_HEIGHT}
              />
              <canvas style={this.styles} ref={this.canvasRef} width={videoWidth} height={videoHeight} />
            </div>
          );
      }


}


export default VideoFrame;