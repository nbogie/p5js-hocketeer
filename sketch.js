//TODO: 
// TODO: increase threshold - let it be set by a slider on screen or the x position of a touch.
// TODO: debounce the shake detection so that it can't happen more than once per 0.5 second.
// TODO: choose note from scale and root pitch
// TODO: allow joining a group on firebase and having your note assigned by that group admin.
// TODO: allow random scrambling of a group's pitch-phone assignments, so that people have to figure it out
// TODO: allow rotate pitch-phone assignments so you're in the next group

var threshold = 30;
var accChangeX = 0; 
var accChangeY = 0;
var accChangeT = 0;

var timeSinceShake;
function setup() {
  timeSinceShake = 0;
  createCanvas(displayWidth, displayHeight);
}

function draw() {
  background(0);
  checkForShake();
  timeSinceShake ++;
 }
function mousePressed() {
  actUponShake();
}

function playOsc(f, a) {
  var osc = new p5.Oscillator();
  osc.setType('square');
  osc.freq(f, 0.05);
  var env = new p5.Env(0.01, a, 1);
  osc.amp(env);
  osc.start();
  env.play();
}
function actUponShake() {
  timeSinceShake = 0;
  playOsc(440, 0.3);
  console.log("shaken: " + accChangeX);
}
function checkForShake() {
  // Calculate total change in accelerationX and accelerationY
  accChangeX = abs(accelerationX - pAccelerationX);
  accChangeY = abs(accelerationY - pAccelerationY);
  accChangeT = accChangeX + accChangeY;
  // If shake
  if (accChangeT >= threshold) {
    actUponShake();

  } 
}