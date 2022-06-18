import React from 'react';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import Switch from '@material-ui/core/Switch';
import ReactTooltip from 'react-tooltip';
import { makeStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  appBar: {
    backgroundColor: "#673ab7"
  },
  title: {
    flexGrow: 1,
  },
}));


export default function GestureControl({onGestureToggle, gestures}) {
  const classes = useStyles();
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">
        <Typography variant="h5" >
          Guestures
        </Typography>
      </FormLabel>
      <ReactTooltip place="right" type="success" effect="solid" />
      <FormGroup>
        <FormControlLabel
          control={<Switch checked={gestures.xcontrol} onChange={onGestureToggle} name="xcontrol" />}
          label="X Control"
          labelPlacement="start"
          data-tip="Send CC#16 using the horizontal position of your hand"
        />
        <FormControlLabel
          control={<Switch checked={gestures.ycontrol} onChange={onGestureToggle} name="ycontrol" />}
          label="Y Control"
          labelPlacement="start"
          data-tip="Send CC#11 using the vertical position of your hand"
        />
        <FormControlLabel
          control={<Switch checked={gestures.spread} onChange={onGestureToggle} name="spread" />}
          label="Spread"
          labelPlacement="start"
          data-tip="Send CC#66 using the spread of your fingers"
        />
        <FormControlLabel
          control={<Switch checked={gestures.rotation} onChange={onGestureToggle} name="rotation" />}
          label="Rotation"
          labelPlacement="start"
          data-tip="Inactive"
        />
        <FormControlLabel
          control={<Switch checked={gestures.roll} onChange={onGestureToggle} name="roll" />}
          label="Roll"
          labelPlacement="start"
          data-tip="Send CC#15 using the roll of your hand"
        />
         <FormControlLabel
          control={<Switch checked={gestures.proximity} onChange={onGestureToggle} name="proximity" />}
          label="Proximity"
          labelPlacement="start"
          data-tip="Send CC#17 using the distance of your hand to the camera"
        />
        <FormControlLabel
          control={<Switch checked={gestures.pitch} onChange={onGestureToggle} name="pitch" />}
          label="Pitch"
          labelPlacement="start"
          data-tip="Inactive"
        />
         <FormControlLabel
          control={<Switch checked={gestures.yaw} onChange={onGestureToggle} name="yaw" />}
          label="Yaw"
          labelPlacement="start"
          data-tip="Send CC#16 using the yaw of your hand"
        />
      </FormGroup>
      <FormHelperText>Use this control what midi signals are generated</FormHelperText>
    </FormControl>
  );
}


// rotation: false,
// spread: false,
// proximity: false,
// roll: false,
// pitch: false,
// yaw: false 
