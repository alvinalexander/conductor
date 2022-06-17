import React from 'react';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';

const Loader = ({open}) => {
  return (
      <Backdrop open={open} style={{
          zIndex: 20,
          backgroundColor: "#673ab7",
          color:"white"
      }}>
          <div style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: 500
          }}>

        <CircularProgress color="inherit" size="m" style={{
            marginBottom: "4em",
        }}/>
        <Typography variant="h6" gutterBottom>
            Initializing Conductor...
        </Typography>
          </div>
      </Backdrop>
  );
}

export default Loader;