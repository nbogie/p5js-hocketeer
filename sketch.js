"use strict";
//TODO: 
// TODO: increase threshold - let it be set by a slider on screen or the x position of a touch.
// TODO: debounce the shake detection so that it can't happen more than once per 0.5 second.
// TODO: choose note from scale and root pitch
// TODO: allow joining a group on firebase and having your note assigned by that group admin.
// TODO: allow random scrambling of a group's pitch-phone assignments, so that people have to figure it out
// TODO: allow rotate pitch-phone assignments so you're in the next group
// TODO: allow user to set shake sensitivity and time between shakes
// TODO: don't be redrawing all the time!  Most of the time there should be nothing to do!
var minTimeBetweenShakes;
var timeSinceShake;
var octaveMult;

var buttons;
var myNoteInfo;
var osc;
var env;

var clickCount;
var noteInfos;
var touchStartPos;
var msgs;

var colors = [
  "#FF0000",
  "#FF7F00",
  "#FFFF00",
  "#00FF00",
  "#0000FF",
  "#4B0082",
  "#8F00FF",
  "#FF0000"];

function setup() {
  //createCanvas(displayWidth, displayHeight);
  createCanvas(windowWidth, windowHeight);
  msgs = [];
  myNoteInfo = null;
  timeSinceShake = 0;
  minTimeBetweenShakes = 4;
  makeNoteInfos();
  makeButtons();
  setupOsc();
  octaveMult = 1;
  touchStartPos = null;
  clickCount = 0;
  setShakeThreshold(30);
}

function setupOsc() {
  osc = new p5.Oscillator();
  osc.setType('square');
  osc.amp(0);
  osc.freq(440);
  osc.start();

  env = new p5.Env(0.02, 0.4, 0.5);
}

function rectCentered(x, y, w, h){
  rect(x - w/2, y - h/2, w, h);
}

function draw() {
  background(0);
  //console.log(JSON.stringify(myNoteInfo));
  fill(255);
  textSize(56);
  buttons.forEach(function(btn) { btn.drawButton() ; });
  fill(myNoteInfo.color);
  var rX = width-width/4;
  var rY = height /2 ;
  rectCentered(rX, rY, width/2 - 1, height);
  fill(255);
  stroke(0);
  noStroke();
  textSize(96);
  text(myNoteInfo.name, width-width/4, height/2);
  drawTexts([], 
    width-width/4, height/2 - 100 );
  drawFlashMessages();
  timeSinceShake ++;
  cullFlashes();
}

function drawTexts(texts, x, y) {
  noStroke();
  textSize(24);
  texts.forEach(function (str, i) { 
   text(str, x, y+ 30*i);
  });
}

function drawFlashMessages() {
  drawTexts(msgs.map(function(o) { return o.msg;  }), width/2, height/2 + 100);
}

function mousePressed() {
  var clickPos = { x: mouseX, y: mouseY};
  delegatePressOrTouchToButtons(clickPos);
  return false;
}

function touchStarted() {
  var clickPos = { x: touchX, y: touchY};
  touchStartPos = touches[0];
  delegatePressOrTouchToButtons(clickPos);
  return false;
}
function touchMoved() {
}

function touchEnded() {
  var touchEndPos =  touches[0];
  var dX = touchEndPos.x - touchStartPos.x;
  var dY = touchEndPos.y - touchStartPos.y;
  if (abs(dX) > abs(dY) && abs(dX) > 10){
    if (dX > 0) {
      incNoteInfo();
    } else {
      decNoteInfo();
    }
  } else if (abs(dY) > abs(dX) && abs(dY) > 10){
    flash("vert swipe - change octave");
    cycleOctave();
  }
  touchStartPos = null;
}

function delegatePressOrTouchToButtons(clickPos) {
  clickCount++ ;
  //incNoteInfo();

  buttons.forEach(function(btn, i) {
    if(btn.shouldHandleTouch(clickPos)) {
      myNoteInfo = btn.noteInfo;
      btn.handleTouch();
    }
  });

  playCurrentNote();
}


function flash(msg) {
  msgs.push({ msg: msg, until: millis() + 1000 });
}

function cullFlashes() {
  msgs = msgs.filter(function(o) { return o.until > millis(); });
}

function freqs() { 
  return [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
}

function freqForTone() {
    return freqs()[i];
}

function within(v, mn, mx) {
  return ((v >= mn) && (v <= mx));
}

function Button(x0, y0, x1, y1, btnText, btnColor, btnNoteInfo, btnClickFn) {
  this.colr = btnColor;
  var txt = btnText;
  var clickFn = btnClickFn;
  var pTL = { x: x0, y: y0 };
  var pBR = { x: x1, y: y1 };
  
  this.noteInfo = btnNoteInfo;

  this.toString = function () {
    return JSON.stringify([pTL, pBR, txt, this.colr]);
  };
  this.shouldHandleTouch = function(pos) {
    var inX = within(pos.x, pTL.x, pBR.x);
    var inY = within(pos.y, pTL.y, pBR.y);
    return ( inX && inY);
  };
  
  var depth = function() {
    return pBR.y - pTL.y;
  };
  var bWidth = function () {
    return pBR.x - pTL.x;
  };
  this.drawButton = function (){
    strokeWeight(1);
    stroke(255);
    fill(this.colr);
    rect(pTL.x, pTL.y, bWidth(), depth());
    noStroke();
    fill(255);
    textAlign(CENTER);
    text(txt, pTL.x + (pBR.x - pTL.x)/2, pTL.y + depth()/2+10); 
  };

  this.handleTouch = function() {
    clickFn();
  };
}

function incNoteInfo() {
  var i = myNoteInfo.scaleDegree-1;
  if (i < noteInfos.length-1) {
    myNoteInfo = noteInfos[i+1];
  } else {
    myNoteInfo = noteInfos[0];
  }
  flash("next note (up)");
}

function decNoteInfo() {
  var i = myNoteInfo.scaleDegree-1;
  if (i > 0) {
    myNoteInfo = noteInfos[i-1];
  } else {
    myNoteInfo = noteInfos[noteInfos.length -1];
  }
  flash("prev note (down)");

}

function makeNoteInfos() {
  var names = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti", "Do"];
  var pitchOffsets = [0, 2, 3, 5, 7, 9, 11, 12];
  
  noteInfos = names.map(function(name, i) { 
    return { name: name, 
             pitchOffsetSemitones: pitchOffsets[i], 
             scaleDegree: i+1, 
             color: colors[i] };
  });  
}
  
function makeButtons() {
  myNoteInfo = noteInfos[0];
  
  var h = height;
  buttons = noteInfos.map(function(ni, i) {
    var depth = h / noteInfos.length;
    var y = i * depth;
    return new Button(0, y, width/2, y+depth, ni.name, ni.color, ni, function() {
      //console.log("my name is " + ni.name);
    });
  });

  var strs = buttons.map(function (b) {
    return b.toString();
  });
  //console.log(strs.join("\n"));
}

function playOsc(f, a) {
  //osc.setType('triangle');
  //osc.setType('sawtooth');
  
  osc.setType('square');
  osc.freq(f, 0.001);
  osc.amp(env);
  env.set(0.02, 0.4, 0.5);
  env.play();  
}


function playCurrentNote() {
  var f = freqs()[myNoteInfo.scaleDegree-1];
  playOsc(octaveMult * f, 0.6);
}

function actUponShake() {
  if (timeSinceShake < minTimeBetweenShakes) {
    return;
  }
  timeSinceShake = 0;

  playCurrentNote();
}
function cycleOctave() {
  var maxOctaveMult = 2;
  octaveMult += 1;
  if (octaveMult > maxOctaveMult) {
    octaveMult = 1;
  }
}
function member(str, sought) {
  return (str.split("").indexOf(sought) >= 0);
}
function keyTyped() {
  console.log("key pressed" + key);
  if (key === "n" || key === ">" || key === ".") {
    incNoteInfo();
    playCurrentNote();
  }
  if (key === "<" || key === ",") {
    decNoteInfo();
    playCurrentNote();
  }

  if (key === 'o') {
    cycleOctave();
    playCurrentNote();
  }
  if (key === ' ') {
    actUponShake();
  }
}
function deviceShaken() {
    actUponShake();
}