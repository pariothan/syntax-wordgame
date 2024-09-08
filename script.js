// script.js
let lastwords = [];
fetch("words_dictionary.json")
  .then((response) => response.json())
  .then((data) => {
    window.dictionary = Object.keys(data).map((word) => word.toUpperCase());
    // Now dictionary is loaded, initialize event listeners
    toggleHoveredAndParentNodes();
  });

const wordsList = document.getElementById("wordsListContent");
const wordDisplay = document.getElementById("wordDisplay");
let words = new Set();

// Function to play sound
function playSound(path) {
  const audio = new Audio(path); // Specify the path to your sound effect file
  audio.play();
}

function collectAllWordsFromTree() {
  const nodes = document.querySelectorAll(".node");
  const words = [];

  nodes.forEach((node) => {
    const input = node.querySelector("input");
    if (input && input.value !== "") {
      let currentNode = node;
      let word = "";
      while (currentNode) {
        const input = currentNode.querySelector("input");
        if (input && input.value !== "")
          word = input.value.toUpperCase() + word;
        currentNode = currentNode.parentElement.closest(".node");
      }
      words.push(word);
    }
  });

  return words;
}

function updateLines() {
  const svg = document.querySelector("svg");
  svg.innerHTML = ""; // Clear existing lines for redrawing
  document.querySelectorAll(".child").forEach((child) => {
    const parent = child.closest(".children-container").parentNode;
    drawLine(parent, child);
  });
  checkCollisions(); // Check for collisions after updating lines
}

function drawLine(fromNode, toNode) {
  const svg = document.querySelector("svg");
  const fromRect = fromNode.getBoundingClientRect();
  const toRect = toNode.getBoundingClientRect();

  const offsetX = window.scrollX + svg.getBoundingClientRect().left;
  const offsetY = window.scrollY + svg.getBoundingClientRect().top;

  const fromX = fromRect.left + fromRect.width / 2 + window.scrollX - offsetX;
  const fromY = fromRect.top + fromRect.height / 2 + window.scrollY - offsetY;
  const toX = toRect.left + toRect.width / 2 + window.scrollX - offsetX;
  const toY = toRect.top + toRect.height / 2 + window.scrollY - offsetY;

  const angle = Math.atan2(toY - fromY, toX - fromX);
  const r = 18; // radius of the circle (half of the diameter)

  const fromEdgeX = fromX + r * Math.cos(angle);
  const fromEdgeY = fromY + r * Math.sin(angle);
  const toEdgeX = toX - r * Math.cos(angle);
  const toEdgeY = toY - r * Math.sin(angle);

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", fromEdgeX);
  line.setAttribute("y1", fromEdgeY);
  line.setAttribute("x2", toEdgeX);
  line.setAttribute("y2", toEdgeY);
  line.setAttribute("stroke", "black");

  svg.appendChild(line);
}

function updateContainerSize() {
  const svg = document.querySelector("svg");
  const maxHeight = Math.max(
    ...Array.from(document.querySelectorAll(".node")).map(
      (el) => el.getBoundingClientRect().bottom,
    ),
  );
  const currentHeight = window.innerHeight;

  if (maxHeight > currentHeight) {
    svg.style.height = `${maxHeight + 100}px`;
  }
}

function addChildNode(element) {
  const parent = element.closest(".node");
  let childrenContainer = parent.querySelector(".children-container");

  // Check if the parent can have more children
  if (!childrenContainer) {
    childrenContainer = document.createElement("div");
    childrenContainer.className = "children-container";
    parent.appendChild(childrenContainer);
  } else if (childrenContainer.children.length >= 2) {
    // Prevent adding more than two children
    alert("A node can only have two children.");
    return;
  }

  const buttonClickSound = new Audio("buttonclick.wav");
  buttonClickSound.play();

  const containerDiv = document.createElement("div");
  containerDiv.className = "node child";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "_";
  input.maxLength = 1;
  input.oninput = function () {
    updateDisplayWord(this);
  };

  const addButton = document.createElement("button");
  addButton.className = "add-btn";
  addButton.textContent = "+";
  addButton.onclick = function () {
    addChildNode(this);
  };

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-btn"; // Reference to delete-btn CSS
  
  deleteButton.textContent = "-";
  deleteButton.onclick = function () {
    deleteNode(this);
  };
  deleteButton.style.right = "28px";
  deleteButton.style.top = "-2px";
  deleteButton.style.width = "15px";
  deleteButton.style.height = "15px";
  deleteButton.style.background = "red";
  deleteButton.style.fontSize = "10px";
  console.log(containerDiv);
  containerDiv.appendChild(input);
  containerDiv.appendChild(addButton);
  containerDiv.appendChild(deleteButton);

  childrenContainer.appendChild(containerDiv);

  updateLines();

  // If children limit is reached, hide the addButton
  if (childrenContainer.children.length >= 2) {
    element.style.display = "none";

    updateContainerSize();
  } else if (childrenContainer.children.length === 1) {
    //insanity edge case for if the node somehow has zero children and is hidden, probably will never apply
    element.style.display = "";
    element.textContent = "⅄"; // Change to upside down Y
  }
}

function deleteNode(element) {
  const nodeToDelete = element.closest(".node");
  const parent = nodeToDelete.parentElement.closest(".node");

  // Remove the node
  nodeToDelete.parentNode.removeChild(nodeToDelete);

  // Find the add button in the parent node
  const addButton = parent.querySelector(".add-btn");

  // Make the add button visible
  addButton.style.display = "";

  // Log the updated parent for debugging
  console.log(parent.innerHTML);
  console.log(parent.getElementsByTagName("*"));

  // Update the lines to reflect the new structure
  updateLines();
}

function getLastCommonAncestor(node1, node2) {
  const path1 = getPathToRoot(node1);
  const path2 = getPathToRoot(node2);

  let lca = null;

  for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
    if (path1[i] === path2[i]) {
      lca = path1[i];
    } else {
      break;
    }
  }

  return lca;
}

function getPathToRoot(node) {
  const path = [];
  while (node) {
    path.push(node);
    node = node.parentElement.closest(".node");
  }
  return path.reverse();
}

// Function to get the closest node to a given point
function getClosestNode(x, y) {
  const nodes = document.querySelectorAll(".node");
  let closestNode = null;
  let closestDistance = Infinity;

  nodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    const nodeX = rect.left + rect.width / 2;
    const nodeY = rect.top + rect.height / 2;
    const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);

    if (distance < closestDistance) {
      closestNode = node;
      closestDistance = distance;
    }
  });

  return closestNode;
}

let lastHoveredNode = null;

function toggleHoveredAndParentNodes() {
  document.addEventListener("mousemove", function (event) {
    const hoveredNode = getClosestNode(event.clientX, event.clientY);
    const bubbleSound = new Audio("bubble.wav");
    if (hoveredNode !== lastHoveredNode) {
      bubbleSound.play();
      lastHoveredNode = hoveredNode;
    }

    document.querySelectorAll(".node").forEach((node) => {
      node.classList.add("shrunk");
      node.classList.remove("grown", "gradient-grow", "gradient-shrink");
    });

    if (hoveredNode) {
      const pathToRoot = getPathToRoot(hoveredNode);
      pathToRoot.forEach((node) => {
        node.classList.remove("shrunk");
        node.classList.add("grown");
      });

      document.querySelectorAll(".node").forEach((node) => {
        const lca = getLastCommonAncestor(node, hoveredNode);
        if (lca) {
          node.classList.add("gradient-grow");
          node.style.transform = `scale(1)`;
        }
      });

      updateLines();
      updateDisplayWord(hoveredNode);
    } else {
      document.querySelectorAll(".node").forEach((node) => {
        node.classList.add("shrunk");
        node.classList.remove("grown", "gradient-grow", "gradient-shrink");
      });
    }
  });

  document.addEventListener("mouseout", function () {
    document.querySelectorAll(".node").forEach((node) => {
      node.classList.add("shrunk");
      node.classList.remove("grown", "gradient-grow", "gradient-shrink");
    });

    setTimeout(() => {
      updateLines();
    }, 300);
  });

  document.addEventListener("mouseover", function (event) {
    if (
      event.target.classList.contains("node") ||
      event.target.closest(".node")
    ) {
      updateLines(); // Update lines when mouse over textbox
    }
  });

  document.addEventListener("mouseleave", function () {
    updateLines(); // Update lines when mouse off textbox
  });

  document.querySelectorAll(".node").forEach((node) => {
    node.addEventListener("transitionstart", () => {
      startFrequentUpdates();
    });

    node.addEventListener("transitionend", () => {
      updateLines();
      stopFrequentUpdates();
    });
  });
}

function startFrequentUpdates() {
  if (!updateLines.intervalId) {
    updateLines.intervalId = setInterval(updateLines, 30); // More frequent updates approx. 30 times/sec
  }
}

function stopFrequentUpdates() {
  if (updateLines.intervalId) {
    clearInterval(updateLines.intervalId);
    updateLines.intervalId = null;
  }
}

function updateWordsList(words) {
  const wordsListContent = document.getElementById("wordsListContent");

  const containsAllWords = lastwords.every((word) => words.includes(word));

  if (containsAllWords && words.length > lastwords.length) {
    playSound("score.wav");
  }
  if (words != lastwords) {
    lastwords = words;
  }

  wordsListContent.innerHTML = ""; // Clear the list

  words.forEach((word) => {
    const li = document.createElement("li");
    li.textContent = word;
    li.style.fontFamily = "Arial, sans-serif";
    li.style.fontSize = "1.2em";
    li.style.padding = "5px";
    li.style.borderBottom = "1px solid #ccc";
    wordsListContent.appendChild(li);
  });
}

function updateDisplayWord(node) {
  const wordDisplay = document.getElementById("wordDisplay");
  let currentNode = node;
  let word = "";
  while (currentNode) {
    const input = currentNode.querySelector("input");
    if (input && input.value !== "") word = input.value.toUpperCase() + word;
    currentNode = currentNode.parentElement.closest(".node");
  }
  wordDisplay.textContent = word;
  var wordsFormed = collectAllWordsFromTree();
  var wordsFormed = new Set(wordsFormed);
  var wordsFormed = Array.from(wordsFormed);

  wordsFormed = wordsFormed.filter((word) => isWordInDictionary(word));

  const wordsFormedCountDisplay = document.getElementById("wordsFormedCount");

  if (!wordsFormedCountDisplay) {
    const newDisplay = document.createElement("div");
    newDisplay.id = "wordsFormedCount";
    newDisplay.style.position = "fixed";
    newDisplay.style.top = "60px";
    newDisplay.style.left = "50%";
    newDisplay.style.transform = "translateX(-50%)";
    newDisplay.style.fontSize = "18px";
    newDisplay.style.fontWeight = "bold";
    document.body.appendChild(newDisplay);
  }
  document.getElementById("wordsFormedCount").textContent =
    `Words Formed: ${wordsFormed.length}`;
  updateWordsList(wordsFormed);
}

function isWordInDictionary(word) {
  if (!window.dictionary) {
    console.error("Dictionary not loaded yet");
    return false;
  }

  return word.length >= 3 && window.dictionary.includes(word.toUpperCase());
}

function checkCollisions() {
  const nodes = document.querySelectorAll(".node");
  nodes.forEach((node1, index1) => {
    nodes.forEach((node2, index2) => {
      if (index1 !== index2 && isColliding(node1, node2)) {
        const { bucket1, bucket2 } = collectBuckets(node1, node2);
        moveBucketsApart(bucket1, bucket2);
      }
    });
  });
}

function isColliding(node1, node2) {
  const rect1 = node1.getBoundingClientRect();
  const rect2 = node2.getBoundingClientRect();
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  );
}

function getLastCommonAncestorNode(node1, node2) {
  const path1 = getPathToRoot(node1);
  const path2 = getPathToRoot(node2);

  let lca = null;

  for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
    if (path1[i] === path2[i]) {
      lca = path1[i];
    } else {
      break;
    }
  }

  return lca;
}

function getSequenceToLCA(startNode, lcaNode) {
  const path = [];
  let currentNode = startNode;

  while (currentNode && currentNode !== lcaNode) {
    path.push(currentNode);
    currentNode = currentNode.parentElement.closest(".node");
  }

  if (currentNode === lcaNode) {
    path.push(lcaNode);
  }
  return path;
}

function isDescendant(ancestor, possibleDescendant) {
  let currentNode = possibleDescendant;

  while (currentNode) {
    if (currentNode === ancestor) {
      return true;
    }
    currentNode = currentNode.parentElement.closest(".node");
  }

  return false;
}

function collectAllDescendants(node) {
  const descendants = [];

  function recurse(currentNode) {
    descendants.push(currentNode);
    const children = currentNode.querySelectorAll(".node.child");
    children.forEach((child) => recurse(child));
  }

  recurse(node);
  return descendants;
}

function collectBuckets(node1, node2) {
  const lca = getLastCommonAncestorNode(node1, node2);
  if (!lca) return null;

  // Find the sequence of nodes from node 1 to LCA
  const sequence1_to_lca = getSequenceToLCA(node1, lca);

  // Find the first child of LCA in the sequence that node 2 is not descended from
  let bucket_parent1 = null;
  for (let node of sequence1_to_lca) {
    if (!isDescendant(node2, node)) {
      bucket_parent1 = node;
      break;
    }
  }

  // Gather all children of the bucket parent downwards and store them in bucket 1
  const bucket1 = [bucket_parent1, ...collectAllDescendants(bucket_parent1)];
  // Repeat the process for bucket 2
  // Find the sequence of nodes from node 2 to LCA
  const sequence2_to_lca = getSequenceToLCA(node2, lca);

  // Find the first child of LCA in the sequence that node 1 is not descended from
  let bucket_parent2 = null;
  for (let node of sequence2_to_lca) {
    if (!isDescendant(node1, node)) {
      bucket_parent2 = node;
      break;
    }
  }

  // Gather all children of the bucket parent downwards and store them in bucket 2
  const bucket2 = [bucket_parent2, ...collectAllDescendants(bucket_parent2)];

  // The resulting buckets are bucket1 and bucket2
  return { bucket1, bucket2 };
}

function moveBucketsApart(bucket1, bucket2) {
  const distance = 10; // Distance to move the buckets apart
  bucket1.forEach((node) => {
    const left = parseInt(window.getComputedStyle(node).left, 10);
    node.style.left = `${left - distance}px`;
  });

  bucket2.forEach((node) => {
    const left = parseInt(window.getComputedStyle(node).left, 10);
    node.style.left = `${left + distance}px`;
  });

  updateLines(); // Redraw lines since nodes have moved
}

// Initial call to update lines continuously 8 times a second
setInterval(updateLines, 125);
