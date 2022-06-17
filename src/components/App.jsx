import React from 'react';
import VideoFrame from './VideoFrame';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import GestureControl from './GestureControl'
import Loader from './Loader';
import Header from './Header';


const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 500

class App extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      video: {
        width: VIDEO_WIDTH,
        heigh: VIDEO_HEIGHT,
        element: undefined
      },
      tf : {
        backend: "webgl",
        model: undefined,
      },
      initializing: true,
      predictions: [],
      gestures: {
        xcontrol: false,
        ycontrol: false,
        spread: false,
        rotation: false,
        proximity: false,
        roll: false,
        pitch: false,
        yaw: false 
      }
    }
    this.toggleMapping = this.toggleMapping.bind(this);
    this.handleGestureToggle = this.handleGestureToggle.bind(this);
    this.completeInit = this.completeInit.bind(this);
    this.videoRef = React.createRef();
  }

  async componentDidMount(){
   
  }

  toggleMapping(){
    const{mapping} = this.state;
    this.setState({mapping: !mapping})
    console.log("Mapping is now: ", !mapping);
  }

  handleGestureToggle(event){
    console.log("toggle event", event)
    this.setState( {gestures: { ...this.state.gestures, [event.target.name]: event.target.checked }});
  }

  completeInit(){
    this.setState({initializing:false})
  }

  render() {
    const classes = {
      root: {
        flexGrow: 1,
        backgroundColor: "#53446E",
        height: "100vh"
      },
      paper: {
        padding: 32,
        height: "100%",
        textAlign: 'center',
        position: "relative"
      },

      videoArea: {
        textAlign: 'center',
      }
    }
    const {gestures, initializing } = this.state;
    return ( 
     <div>
      <Loader open={initializing}/> 
      <Header/>
      <Grid container style={classes.root}>
          <Grid item xs={3} container>
            <Paper style={classes.paper} elevation={0} variant="outlined" square id="control-area">
              <GestureControl onGestureToggle={this.handleGestureToggle} gestures={gestures}/>
            </Paper>
          </Grid>
          <Grid container id="videoframe-area" item xs={9} 
          style={classes.videoArea} 
          justify="center" 
          alignItems="center">
            <VideoFrame gestures={gestures} onInitComplete={this.completeInit}></VideoFrame>
          </Grid>
      </Grid>
     </div> 
      );
  }
}
export default App;
