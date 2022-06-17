/**
 * Scale an input value from input range [min_val, max_val]
 * to char range [0, 127].
 * Works with negative values as well.
 * Inputs:
 *    :val:      Input value to scale
 *    :max_val:  Max value :val: can take
 *    :min_val:  Min value :val: can take
 * Return a float value, scaled to [0, 127]
 */
export function scale_to_char(val, max_val, min_val) {
  let mapped_val = Math.round((val - min_val) * 127 / (max_val - min_val));
  mapped_val = Math.min(127, Math.max(0, mapped_val));
  return mapped_val;
}

/**
 * Scale an input value from input range [inMin, inMax] to output range
 * [outMin, outMax]
 * Works with negative values as well.
 * Inputs:
 *    :val:      Input value to scale
 *    :inMin:    Min value :val: can take
 *    :inMax:    Max value :val: can take
 *    :outMin:   Min value the output of mapping :val: can take
 *    :outMax:   Max value the output of mapping :val: can take
 * Return a float value, scaled to [outMin, outMax]
 */
export function scale(val, inMin, inMax, outMin, outMax) {
  return Math.min(outMax, Math.max(0, (val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin));
}

/**
 * Retrieve position of the tip of the index finger, convert to midi range
 *    :hand_prediction:       Object returned from model.estimateHands()
 *    :video_width:           Width of video
 *    :video_height:          Height of video
 */
export function get_index_tip_x(hand_prediction, video_width, video_height) {
  // Each finger has 4 joints, from palm to tip: 0 to 3
  let finger_joint = 3;
  let x = 0

  try {
    let index_tip_x = hand_prediction[0]["annotations"]["indexFinger"][finger_joint][x];

    return scale_to_char(index_tip_x, video_width, 0);
    //return scale(index_tip_x, 290, 230, 10, 110);

  } catch (error) {
    console.error(error);
  }
}

/**
 * Idem as get_index_tip_x, but for the y axis
 */
export function get_index_tip_y(hand_prediction, video_width, video_height) {
  // Each finger has 4 joints, from palm to tip: 0 to 3
  let finger_joint = 3;
  let y = 1

  try {
    let index_tip_y = hand_prediction[0]["annotations"]["indexFinger"][finger_joint][y];

    return 127 - scale_to_char(index_tip_y, video_height, 0);

  } catch (error) {
    console.error(error);
  }
}

/**
 * Idem as get_index_tip_x, but for the z axis
 */
export function get_index_tip_z(hand_prediction, video_width, video_height) {
  // Each finger has 4 joints, from palm to tip: 0 to 3
  let finger_joint = 3;
  let z = 2

  try {
    let index_tip_z = hand_prediction[0]["annotations"]["indexFinger"][finger_joint][z];

    return 127 - scale_to_char(-index_tip_z, 0, 100);

  } catch (error) {
    console.error(error);
  }
}

export function get_index_tip_to_base_dist(hand_prediction, video_width, video_height) {
  // Each finger has 4 joints, from palm to tip: 0 to 3
  let finger_joint = 3;
  let z = 2

  try {
    // Each finger has 4 joints, from palm to tip: 0 to 3
    let tip_joint = 3;
    let index3D = hand_prediction[0]["annotations"]["indexFinger"][tip_joint];
    let palmBase3D = hand_prediction[0]["annotations"]["palmBase"][0];
    let index_to_base_dist = Math.sqrt((palmBase3D[0] - index3D[0])  ** 2 + (palmBase3D[1] - index3D[1])  ** 2)

    return scale_to_char(index_to_base_dist, 100, 500);

  } catch (error) {
    console.error(error);
  }
}


/**
 * Compute spread of hand
 *    :hand_prediction:       Object returned from model.estimateHands()
 *    :video_width:           Width of video
 *    :video_height:          Height of video
 * Get a measure of hand spread, convert to midi range
 * Note: To mitigate the effect of scale (for a given hand opening, the spread looks to be
 * larger as the hand comes closer to the camera, though it may not have actually spread wider),
 * we normalize using the distance between the palm base and the based of each finger.
 */
export function compute_spread(hand_prediction, video_width, video_height) {
  // Each finger has 4 joints, from palm to tip: 0 to 3
  let tip_joint = 3;
  try {
    let thumb3D = hand_prediction[0]["annotations"]["thumb"][tip_joint];
    let index3D = hand_prediction[0]["annotations"]["indexFinger"][tip_joint];
    let middle3D = hand_prediction[0]["annotations"]["middleFinger"][tip_joint];
    let ring3D = hand_prediction[0]["annotations"]["ringFinger"][tip_joint];
    let pinky3D = hand_prediction[0]["annotations"]["pinky"][tip_joint];
    let palmBase3D = hand_prediction[0]["annotations"]["palmBase"][0];

    // Use distance between palm base and middle finger base as normalizer
    let norm = (Math.sqrt((palmBase3D[0] - thumb3D[0])  ** 2 + (palmBase3D[1] - thumb3D[1])  ** 2) +
                Math.sqrt((palmBase3D[0] - index3D[0])  ** 2 + (palmBase3D[1] - index3D[1])  ** 2) +
                Math.sqrt((palmBase3D[0] - middle3D[0]) ** 2 + (palmBase3D[1] - middle3D[1]) ** 2) +
                Math.sqrt((palmBase3D[0] - ring3D[0])   ** 2 + (palmBase3D[1] - ring3D[1])   ** 2) +
                Math.sqrt((palmBase3D[0] - pinky3D[0])  ** 2 + (palmBase3D[1] - pinky3D[1])  ** 2)) / 5.;

    let centerOfMass_x = (thumb3D[0] + index3D[0] + middle3D[0] + ring3D[0] + pinky3D[0]) / 5.;
    let centerOfMass_y = (thumb3D[1] + index3D[1] + middle3D[1] + ring3D[1] + pinky3D[1]) / 5.;

    let sumSquare = ((thumb3D[0]    - centerOfMass_x) / norm) ** 2 + ((thumb3D[1]    - centerOfMass_y) / norm) ** 2 +
                    ((index3D[0]    - centerOfMass_x) / norm) ** 2 + ((index3D[1]    - centerOfMass_y) / norm) ** 2 +
                    ((middle3D[0]   - centerOfMass_x) / norm) ** 2 + ((middle3D[1]   - centerOfMass_y) / norm) ** 2 +
                    ((ring3D[0]     - centerOfMass_x) / norm) ** 2 + ((ring3D[1]     - centerOfMass_y) / norm) ** 2 +
                    ((pinky3D[0]    - centerOfMass_x) / norm) ** 2 + ((pinky3D[1]    - centerOfMass_y) / norm) ** 2;

    sumSquare = Math.sqrt(sumSquare / 5.);
    return scale_to_char(sumSquare, 0.55, 0.1);

  } catch (error) {
    console.error(error);
  }
}


/**
 * Compute rotation: yaw
 *    :hand_prediction:       Object returned from model.estimateHands()
 *    :video_width:           Width of video
 *    :video_height:          Height of video
 * Compute angle between {thumb & pinky} and {x axis} in the xz plane, using depth of the finger tips
 */
export function compute_yaw(hand_prediction, video_width, video_height) {
  // Each finger has 4 joints, from palm to tip: 0 to 3
  let tip_joint = 3;

  try {
    let thumb3D = hand_prediction[0]["annotations"]["thumb"][tip_joint];
    let pinky3D = hand_prediction[0]["annotations"]["pinky"][tip_joint];

    let dist_x = Math.abs(thumb3D[0] - pinky3D[0]);
    let dist_z = thumb3D[2] - pinky3D[2];

    let angle = Math.atan(dist_z / dist_x);

    return scale_to_char(angle, 1.57, -0.2);    // Max: 0.5 * PI
  } catch (error) {
    console.error(error);
  }
}

/**
 * Compute rotation: roll
 *    :hand_prediction:       Object returned from model.estimateHands()
 *    :video_width:           Width of video
 *    :video_height:          Height of video
 * Compute angle between {thumb & pinky} and {x axis} in the xy plane, using (x, y) of the finger tips
 */
export function compute_roll(hand_prediction, video_width, video_height) {
  // Each finger has 4 joints, from palm to tip: 0 to 3
  let tip_joint = 3;

  try {
    let thumb3D = hand_prediction[0]["annotations"]["thumb"][tip_joint];
    let pinky3D = hand_prediction[0]["annotations"]["pinky"][tip_joint];

    let dist_x = Math.abs(thumb3D[0] - pinky3D[0]);
    let dist_y = thumb3D[1] - pinky3D[1];

    let angle = Math.atan(dist_y / dist_x);

    return scale_to_char(angle, 1.57, -0.2);    // Max: 0.5 * PI
  } catch (error) {
    console.error(error);
  }
}
