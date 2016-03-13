var debug = 0;
var svguri = "http://www.w3.org/2000/svg";

// svg has, from left to right:
// position map | stash | tree

// and from top to bottom:
// title 1
// title 2 
// title 3 
// content (blocks of position map or stash or tree buckets)

var startX = 0; // start coordinates of drawing on canvas
var startY = 0;

var numBlocks; // set in form
var blocksPerTreeBucket; // set in form

var title1Height = 30;
var title2Height = 20;
var title3Height = 25;
var bigPadding = 16; // padding between client and server
var padding = 8; // other padding

// CLIENT

var clientX = startX + bigPadding;
var clientY = startY + padding + title1Height + padding;
var clientBlockHeight = 25;

// position map

var posMap = [];
var posMapTitle = "Position map";
var posMapX = clientX + padding;
var posMapY = clientY + padding;
var blockIDTitle      = ["Block", "ID"]; // multi-line
var blockIDWidth      = 75;
var assignedLeafTitle = ["Assigned", "leaf"];
var assignedLeafWidth = 75;
var posMapWidth = blockIDWidth + padding + assignedLeafWidth;

// stash

var stash = [];
var stashTitle = "Stash";
var stashItemWidth = 100;
var stashWidth = stashItemWidth;
var stashX = posMapX + posMapWidth + padding;
var stashY = clientY + padding;

var clientWidth = padding + posMapWidth + padding + stashWidth + padding;
var clientHeight; // depends on form values

// SERVER

var serverX = clientX + clientWidth + bigPadding;
var serverY = clientY;

var serverWidth; // depends on form values
var serverHeight;

// tree

var treeTitle = "Tree";
var treeBlockWidth  = 95;
var treeBlockHeight = 25;
var vertLevelDistance   = 20;
var horizBucketDistance = 10; // on lowest level

var treeBucketHeight;
var treeBucketWidth  = treeBlockWidth + 2 * padding;
var treeX = serverX + padding;
var treeY = serverY + padding;

var totalTreeHeight; // depend on form values
var totalTreeWidth;
var numLevels;
var numLeaves;

// redraws the whole picture
function updateORAM() {
  
  // get form input
  initialize();

  // draw new position map, stash, and tree
  drawPosMap();
  drawStash();
  drawTree();
  fillTree();
}

// remove old elements of SVG, compute new dimensions
function initialize() {

  // update number of data blocks
  numBlocks = Number( $("#numBlocks").val() );

  // update number of blocks per bucket
  blocksPerTreeBucket = Number( $("#blocksPerTreeBucket").val() );
  treeBucketHeight = padding + blocksPerTreeBucket * 
    (treeBlockHeight + padding);

  // update number of levels in tree, number of leaves, 
  // total height and width
  numLevels = 1 + Math.ceil(Math.log2(numBlocks));
  numLeaves = Math.pow(2, numLevels - 1);
  totalTreeHeight = (treeBucketHeight + vertLevelDistance) * numLevels - 
    vertLevelDistance;
  totalTreeWidth = Math.pow(2, numLevels - 1) * (treeBucketWidth + 
    horizBucketDistance) - horizBucketDistance;
  serverWidth = totalTreeWidth + 2 * padding;
  serverHeight = padding + title2Height + padding + title3Height + padding + 
    totalTreeHeight + padding;

  // remove old position map, stash, and tree
  posMap = [];
  stash = [];
  $("#oramcontainer").empty();

  // update the position map, fill it with random numbers
  clientHeight = padding + title2Height + padding + title3Height + padding + 
    numBlocks * (clientBlockHeight + padding);
  for (var i = 0; i < numBlocks; i++) {
    posMap.push(Math.floor(Math.random() * numLeaves));
  }

  // update SVG to fit tree and position map
  $("#oram").width(serverX + serverWidth + bigPadding);
  $("#oram").height(clientY + Math.max(clientHeight, serverHeight) + bigPadding);


  // add client and server titles
  writeCenteredText("clienttitle",
    clientX + 0.5 * clientWidth,
    clientY - 0.5 * title1Height - padding,
    "Client",
    "title1");

  writeCenteredText("servertitle",
    serverX + 0.5 * serverWidth,
    serverY - 0.5 * title1Height - padding,
    "Server",
    "title1");

  // update backgrounds of client and server
  $("#clientbackground").width(clientWidth).height(clientHeight).attr("x", clientX).attr("y", clientY);
  $("#serverbackground").width(serverWidth).height(serverHeight).attr("x", serverX).attr("y", serverY);
}

// initial filling of the tree, done by simulating accessing each block
function fillTree() {

  for (var i = 0; i < numBlocks; i++) {
      stash.push(i);
      drawStash();
      readPath(posMap[i]);
      writePath(posMap[i]);
      clearHighlightedPaths();
  }
}

function drawPosMap() {

  writeCenteredText("posmaptitle", 
    posMapX + 0.5 * posMapWidth, 
    posMapY + 0.5 * title2Height, 
    posMapTitle, 
    "title2");

  // find point between blockID column and assignedLeaf column 
  // so that both are centered within position map
  var currX = posMapX + 0.5 * posMapWidth - 0.5 * 
    (assignedLeafWidth - blockIDWidth);
  var currY = posMapY + title2Height + padding;

  // table header
  for (var word = 0; word < blockIDTitle.length; word++) {
    writeCenteredText("blockidsubtitle", 
      currX - 0.5 * (padding + blockIDWidth), 
      currY + (0.25 + 0.5 * word) * title3Height, 
      blockIDTitle[word], 
      "title3");
  }

  for (var word = 0; word < assignedLeafTitle.length; word++) {
    writeCenteredText("assignedleafsubtitle", 
      currX + 0.5 * (padding + assignedLeafWidth), 
      currY + (0.25 + 0.5 * word) * title3Height, 
      assignedLeafTitle[word], 
      "title3");
  }

  // leave some space below table heading
  currY += title3Height + padding;
  
  // create position map
  for (var item = 0; item < numBlocks; item++) {

    // block ID column
    createBlock("blockid" + item.toString(), 
      currX - (0.5 * padding + blockIDWidth), 
      currY , 
      blockIDWidth, 
      clientBlockHeight, 
      "clientblock blockid datablock" + item.toString());
    
    writeCenteredText("blockid" + item.toString() + "text", 
      currX - 0.5 * padding - 0.5 * blockIDWidth, 
      currY + 0.5 * clientBlockHeight, 
      item.toString(), 
      // "clienttext datablock" + item.toString());
      "clienttext");
    
    // add new event listener for the block ID
    document.getElementById("blockid" + item.toString()).addEventListener('click', accessBlock);

    // assigned leaf column
    createBlock("assignedleaf" + item.toString(), 
      currX + 0.5 * padding, 
      currY, 
      assignedLeafWidth, 
      clientBlockHeight, 
      "clientblock");

    writeCenteredText("assignedleaf" + item.toString() + "text", 
      currX + 0.5 * padding + 0.5 * assignedLeafWidth, 
      currY + 0.5 * clientBlockHeight, 
      (posMap[item]).toString(), 
      "clienttext");

    currY += (clientBlockHeight + padding);
  }
}

function drawStash() {

  // remove old stash
  $("#stashcontainer").empty();

  writeCenteredText("stashtitle", 
    stashX + 0.5 * stashWidth, 
    stashY + 0.5 * title2Height, 
    stashTitle, 
    "title2");

  var currX = stashX + 0.5 * stashWidth - 0.5 * stashItemWidth;
  // start of stash is horizontally aligned with start of position map
  var currY = stashY + title2Height + padding + title3Height + padding;

  for (var i = 0; i < stash.length; i++) {
    createBlock("stash" + i.toString(), 
      currX, 
      currY + i * (clientBlockHeight + padding), 
      stashItemWidth, 
      clientBlockHeight, 
      "clientblock datablock" + stash[i]);
    
    writeCenteredText("stash" + i.toString() + "text", 
      currX + 0.5 * stashItemWidth, 
      currY + 0.5 * clientBlockHeight + i * (clientBlockHeight + padding), 
      "(" + stash[i].toString() + ",data)" , 
      "clienttext");
  }
}

function drawTree() {

  writeCenteredText("treetitle", 
    treeX + 0.5 * totalTreeWidth, 
    treeY + 0.5 * title2Height, 
    treeTitle, 
    "title2");

  // draw the tree, starting at leaves
  var currRowX = treeX;
  var currRowY = treeY + title2Height + padding + title3Height + padding + 
    totalTreeHeight - treeBucketHeight;
  var currBucketDistance = horizBucketDistance;
  
  for (var level = numLevels - 1; level >= 0; level--) {

    // draw blocks from left to right
    for (var blockNum = 0; blockNum < Math.pow(2, level); blockNum++) {
      createBucket("treebucket-" + level.toString() + "-" + blockNum.toString(), 
        currRowX + blockNum * (treeBucketWidth + currBucketDistance), 
        currRowY, 
        "treebucket", 
        "treeblock");
    }

    // prepare to start next row
    currRowX += 0.5 * (treeBucketWidth + currBucketDistance);
    currRowY -= (treeBucketHeight + vertLevelDistance);
    currBucketDistance = 2 * currBucketDistance + treeBucketWidth;
  }
}

// highlight the path to the given leaf
function highlightPath(leaf) {

  if (leaf >= numLeaves || leaf < 0) { return; }

  var currLeaf = leaf;

  // start at the bottom of the tree
  for (var currLevel = numLevels-1; currLevel >= 0; currLevel--) {
    var currBucketName = "treebucket-" + currLevel.toString() + "-" + 
      currLeaf.toString();
    $("#" + currBucketName).addClass("highlighted");
  
    // shift bits to the right
    // kth node on level i is (k>>1)th node on level i-1
    currLeaf = currLeaf>>1;
  }
}

// clear all highlighted paths in the tree
function clearHighlightedPaths() {

  for (var currLevel = 0; currLevel < numLevels; currLevel++) {
    for (var currLeaf = 0; currLeaf < Math.pow(2, currLevel); currLeaf++) {
      var currBucketName = "treebucket-" + currLevel.toString() + "-" + 
        currLeaf.toString();
      $("#" + currBucketName).removeClass("highlighted");
    }
  }
}

// simulates a read or write
function accessBlock() {

  if (debug) { console.log("accessBlock called from ID " + this.id); }

  // this.id should have the form blockid###
  // so get chars from position 7 to end to simulate "decrypting" it
  var bID = Number(this.id.substring(7));
  if ( bID < 0 || bID >= numBlocks) { return; }
  var oldPosMapIndex = posMap[bID];

  highlightPath(oldPosMapIndex);
  readPath(oldPosMapIndex);
  updatePosMap(bID);
  writePath(oldPosMapIndex);

  setTimeout(clearHighlightedPaths, 1010);
}

// read a path into the stash, ignoring dummy blocks
function readPath(leaf) {

  if (debug) { console.log("readPath: leaf " + leaf); }

  if (leaf >= numLeaves || leaf < 0) { return; }
  var currLeaf = leaf;

  // start at the bottom of the tree
  for (var currLevel = numLevels-1; currLevel >= 0; currLevel--) {
    
    var currBucketName = "treebucket-" + currLevel.toString() + "-" + 
      currLeaf.toString();
    $("#" + currBucketName).addClass("highlighted");

    // read blocks in the current bucket from top to bottom
    for (var currBlock = 0; currBlock < blocksPerTreeBucket; currBlock++){

      var currBlockName = currBucketName + "-" + currBlock.toString();
      
      // class should be either "treeblock" or "treeblock datablock##"
      if ($("#" + currBlockName).attr("class").length > 9) {
        blockData = $("#" + currBlockName).attr("class").substring(19);

        // if it's not dummy data, add it to the stash
        if (Number(blockData) < 0 || Number(blockData) >= numBlocks) { return; }
        stash.push(Number(blockData));
        drawStash();
      }

      // "empty" the block, removing all classes in case it contained real data
      $("#" + currBlockName + "text").text("00000000");
      $("#" + currBlockName).removeClass().addClass("treeblock");
    }

    // shift bits to the right
    // kth node on level i is (k>>1)th node on level i-1
    currLeaf = currLeaf>>1;
  }
}

// remap the block with the given block ID
function updatePosMap(blockID) {

  if (debug) { console.log("updatePosMap: block ID " + blockID); }

  // highlight entry in posmap
  $("#assignedleaf" + blockID).addClass("highlighted");
  // remap the block
  posMap[blockID] = Math.floor(Math.random() * numLeaves);
  $("#assignedleaf" + blockID + "text").text(posMap[blockID]);

  // remove highlight from entry in posmap
  setTimeout(function () {
    $("#assignedleaf" + blockID).removeClass("highlighted");
  }, 1000, blockID);
}

// using blocks from the stash, write a path back to the tree
function writePath(leaf) {

  if (debug) { 
    console.log("writePath: leaf " + leaf); 
    console.log("writePath: START stash is " + stash); 
  }

  if (leaf >= numLeaves || leaf < 0) { 
    console.log("ERROR: leaf " + leaf); 
    return; 
  }

  // start at the bottom of the tree
  for (var currLevel = numLevels-1; currLevel >= 0; currLevel--) {

    var eligibleBlocks = []; // list of stash indices
    var stashElementsToRemove = [];

    // check if any elements in the stash intersect this path at this level
    for (var i = 0; i < stash.length; i++) {
      if ( leaf>>(numLevels-1-currLevel) ==
           ( (posMap[stash[i]])>>(numLevels-1-currLevel) ) ) {
          eligibleBlocks.push(i);
      }
    }

    // fill the bucket at the current level with eligible or dummy blocks
    for (var currBlock = 0; currBlock < blocksPerTreeBucket; currBlock++){

      var currBlockName = "treebucket-" + currLevel.toString() + "-" + 
        (leaf>>(numLevels-1-currLevel)).toString() + "-" +
          currBlock.toString();
      var encBlockValue = randomHex();
      
      if (eligibleBlocks.length > 0) {
        // real data block
        var indexBlockToWrite = eligibleBlocks.shift();
        stashElementsToRemove.push(indexBlockToWrite);
        var blockToWrite = stash[indexBlockToWrite];
        $("#" + currBlockName).addClass("datablock" + blockToWrite);
      } else {
        // dummy data block
        $("#" + currBlockName).addClass("treeblock");
      }

      $("#" + currBlockName + "text").addClass("treetext").text(encBlockValue);
    } // bucket is now full

    // update stash--remove elements that were written
    // first sort indices in descending order so they can be removed "correctly"
    stashElementsToRemove.sort(function(a, b){return b-a;});
    while (stashElementsToRemove.length > 0) {
      stash.splice(stashElementsToRemove.shift(), 1);
    }
    drawStash();
  }
  if (debug) { console.log("writePath: END stash is " + stash); }
  if (stash.length > 0) { 
    console.log("writePath: wrote path to leaf " + leaf + 
      " and stash was non-empty after: " + stash); 
  }
}

// blocks are in each column of the position map, in the stash, 
// and in all tree buckets
// coordinates are upper left
function createBlock(blockID, blockX, blockY, blockWidth, blockHeight, 
  blockClass) {

  var newBlock = document.createElementNS(svguri, "rect"); 
  newBlock.setAttributeNS(null, "id", blockID);
  newBlock.setAttributeNS(null, "x", blockX);
  newBlock.setAttributeNS(null, "y", blockY);
  newBlock.setAttributeNS(null, "rx", 4);
  newBlock.setAttributeNS(null, "ry", 4);
  newBlock.setAttributeNS(null, "width", blockWidth);
  newBlock.setAttributeNS(null, "height", blockHeight);
  newBlock.setAttributeNS(null, "class", blockClass);

  // if this block is part of the stash, put it in the stash container
  if (blockID.substring(0, 5) == "stash") {
    document.getElementById("stashcontainer").appendChild(newBlock);  
  } else {
    document.getElementById("oramcontainer").appendChild(newBlock);
  }
}

// buckets are nodes in the tree
function createBucket(bucketID, x, y) {

  var newBucket = document.createElementNS(svguri, "rect"); 
  newBucket.setAttributeNS(null, "id", bucketID);
  newBucket.setAttributeNS(null, "x", x);
  newBucket.setAttributeNS(null, "y", y);
  newBucket.setAttributeNS(null, "rx", 4);
  newBucket.setAttributeNS(null, "ry", 4);
  newBucket.setAttributeNS(null, "width", treeBucketWidth);
  newBucket.setAttributeNS(null, "height", treeBucketHeight);
  newBucket.setAttributeNS(null, "class", "treebucket");

  document.getElementById("oramcontainer").appendChild(newBucket);

  // there's padding around the blocks in each bucket
  x += padding;
  y += padding;

  for (var i = 0; i < blocksPerTreeBucket; i++) {
    createBlock(bucketID + "-" + i.toString(),
      x,
      y + i * (treeBlockHeight + padding),
      treeBlockWidth,
      treeBlockHeight,
      "treeblock");

    writeCenteredText(bucketID + "-" + i.toString() + "text",
      x + 0.5 * treeBlockWidth,
      y + 0.5 * treeBlockHeight + i * (treeBlockHeight + padding),
      randomHex(), "treetext");
  }
}

// position is given by coords of center
function writeCenteredText (textID, centerX, centerY, text, textClass) {

  var newText = document.createElementNS(svguri, "text"); 
  var theText = document.createTextNode(text);
  newText.setAttributeNS(null, "id", textID);
  newText.setAttributeNS(null, "text-anchor", "middle");
  newText.setAttributeNS(null, "dominant-baseline", "central");
  newText.setAttributeNS(null, "x", centerX);
  newText.setAttributeNS(null, "y", centerY);
  newText.setAttributeNS(null, "class", textClass);
  newText.setAttributeNS(null, "stroke", textClass);
  newText.appendChild(theText);

  // if this text is part of the stash, put it in the stash container
  if (textID.substring(0, 5) == "stash") {
    document.getElementById("stashcontainer").appendChild(newText);  
  } else {
    document.getElementById("oramcontainer").appendChild(newText);
  }
}

// generate a random 8-digit hex string (to simulate randomized encryption)
function randomHex() {

  var hexString = "";
  for (var i = 0; i < 8; i++) {
    hexString = hexString + (Math.floor(Math.random() * 16)).toString(16);
  }
  return hexString;
}

// start!
updateORAM();