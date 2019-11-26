// Page search functionality
// Author : Dave Kahn
// Date   : Novermber 2019
// Update : November 24, 2019 Improved search functionality -Dave
// Update : November 25, 2019 Bug fix to ignore non matching nodes. -Dave

// GLOBALS
var restoreNode     = null;
var seachButton     = null;
var seachBox        = null;
var scrollToValue   = 0;
var firstMatch      = true;
var globalRootNode  = null

// Init
document.onreadystatechange = function (e) {

  if ("complete" === document.readyState) {
    searchForm = document.querySelector ("#searchForm");
    if (null == searchForm) { return (false); }
    searchForm.onsubmit = function (e) { e.preventDefault (); };
    searchButton = document.querySelector ("#searchButton");
    searchBox = document.querySelector ("#searchBox");

    searchBox.onkeyup = function (e) {
      if ("Enter" == e.code || "NumPadEnter" == e.code) {
        searchButton.click ();
      }
    };

    searchButton.onclick = function (e) { doSearch (searchBox.value); };

    window.onunload = function (e) {
      console.log ("unloading");
      clearSearch ();
      window.scrollTo (0, 0);
    };
  } // if "complete" === document.readyState
};



// Function doSearch
// First clears any previous search
// Finds all matches for searchStr, loads document into
// restoreNode to clear the search later, and processes the nodes to highlight
// matching text
function doSearch (searchStr) {
  let content;
  let matches = null;
  let re = new RegExp (searchStr, "gi");

  // Clear any previous highlighting
  clearSearch (searchStr);

  globalRootNode = document.querySelector (".container");

  if (null == searchStr || undefined == searchStr || searchStr.length < 1) {
    // I chose this route for error handling because using try blocks
    // and throw blew out the functionality on subsequent searches
    handleError ("Please enter a search term");
    return (false);
  }

  matches = [...globalRootNode.innerText.matchAll (re)];
  if (matches.length > 0) {
    if (firstMatch) {
      restoreNode = globalRootNode.cloneNode (true);
    }
    nodeVisitor (globalRootNode, processNode, searchStr);
  } else {
    handleError (searchStr + " not found");
  }
  return (false);
} // End function doSearch



// Function processNodes
// Loops through list of nodes containg matched text
// Traverses element nodes and their child nodes recursively
// until matching text node is found
// Matching text node is passed to processText to be highlighted
function processNode (node, searchStr) {
  let retVal = false;
  let re = new RegExp (searchStr, "gi");
  let matches = null;

  if (null !== node && undefined !== node) {
    if (Node.TEXT_NODE == node.nodeType) {
      matches = [...node.nodeValue.matchAll (re)];
      if (matches.length < 1) {
        return (true);
      } else {
        if (firstMatch) {
          scrollToValue = node.parentElement.getBoundingClientRect ().y
                          - window.innerHeight/2;
          searchBox.blur ();
          node.parentElement.focus ();
          firstMatch = false;
        }
        // Text node, if it contains a searchStr of the search,
        // highlight the searchString text.
        retVal = processText (node, matches); /* Text Node */
        return (retVal);
      }
    }
    return (true);
  }
  return (false);
} // End function processNode



// function processText
// finds matches in text node argument
// for each match creates a span with class "searchMatch" and assigns matched
// text to it. Creates new text nodes for each substring surrounding matched
// text so as to apply highlight only to matched text
function processText (node, matches) {
  let newMatch       = node.nodeValue;
  let newNodes       = [matches.length];
  let parent         = node.parentNode;
  let parentClone    = null;
  let removeNode     = node.nextSibling;
  let firstNode      = true;
  let matchCount     = 0;
  let nextIndex      = 0;
  let lastIndex      = 0;
  let insertPoint    = null;

  if (parent.contains (node)) {
    parentClone = parent.cloneNode (true);
  }

  if (parent.childNodes.length > 1) {
    for (i = 0; i < parent.childNodes.length; i++) {
      if (node === parent.childNodes [i]) {
        // Matching nodes only
        removeNode = parentClone.childNodes [i];
        insertPoint = parentClone.childNodes [i + 1];
      } // Ignore non matching nodes
    }
  }

  if (removeNode == null) {
    removeNode = parentClone.lastChild;
  }

  if (parent.contains (node)) {
    parentClone.removeChild (removeNode);
  }

  for (const current of matches) {
    newNodes [matchCount] = [];

/*
 *  Cases:
 *  1. There is only one match in string
 *     a. Match occurs at the start:
 *        current.index == 0
 *         i. Create span, assign class, assign matched string to innerHTML
 *        ii. If there is any remaining text after the match,
 *            create text node, assign remaining string to it
 *     b. Match occurs at the end:
 *        current.index + current [0].length == newMatch.length
 *         i. Create text node, assign substring up to matched string to it
 *        ii. Create span, assign class, assign matched string to innerHTML
 *     c. Match is inside string
 *         i. Create text node, assign substring up to matched string to it
 *        ii. Create span, assign class, assign matched string to innerHTML
 *       iii. If there is any remaining text after the match,
 *            create text node, assign remaining string to it
 *  2. There is more than one match in this string
 *     a. A match occurs at the start
 *     b. A match occurs at the end
 *     c. One or more matches occur inside string
 *
 */
    if (current.index == 0) {
      // First word is matched
      newNodes [matchCount][0] = document.createElement ("span");
      newNodes [matchCount][0].className =  "searchMatch" ;
      newNodes [matchCount][0].innerText = current [0];
      if (1 == matches.length) {
        // Only one match in this string, append remaining text, if any
        if (current.index + current [0].length < newMatch.length) {
          newNodes [matchCount][1] = document.createTextNode (newMatch.slice (current.index + current [0].length, newMatch.length));
        }
      } // Else there is more than one match
        // which >should< load in the next iteration

    } else if (1 == matches.length) {
      // One match occurs inside

      if (lastIndex < current.index) {
        // First copy text between the last match, if any, and the current one
        // OR from the start of the string (lastMatch == 0) and the match
        newNodes [matchCount][0] = document.createTextNode (newMatch.slice (lastIndex, current.index));
        newNodes [matchCount][1] = document.createElement ("span");
        newNodes [matchCount][1].className =  "searchMatch" ;
        newNodes [matchCount][1].innerText = current [0];
      } // Else last word matches, which >should< be handled in the
        // next iteration

      if (current.index + current [0].length < newMatch.length) {
        // Any remaining text post-match
        newNodes [matchCount][2] = document.createTextNode (newMatch.slice (current.index + current [0].length, newMatch.length));
      }

    } else if (matches.length > 1) {
      // More than one match occurs inside

      if (lastIndex < current.index) {
        // First copy text between the last match, if any, and the current one
        // OR from the start of the string (lastMatch == 0) and the match
        newNodes [matchCount][0] = document.createTextNode (newMatch.slice (lastIndex, current.index));
        newNodes [matchCount][1] = document.createElement ("span");
        newNodes [matchCount][1].className =  "searchMatch" ;
        newNodes [matchCount][1].innerText = current [0];
        if (current.index + current [0].length < newMatch.length) {
          if (matchCount + 1 == matches.length) {
            // Last match done, copy remaining text into new text node
            newNodes [matchCount][2] = document.createTextNode (newMatch.slice (current.index + current [0].length, newMatch.length));
          } // Else there are one or more remaining matches, which >should<
            // be handled in the next iteration
        }

      } else { // Else lastIndex == current.index, it can never be greater
               // meaning one of the matches is at the start of the string
               // and the others will be handled in the next iteration
        newNodes [matchCount][0] = document.createElement ("span");
        newNodes [matchCount][0].className =  "searchMatch" ;
        newNodes [matchCount][0].innerText = current [0];
      }

    } else if (current.index + current [0].length == newMatch.length) {
      // Last word matches
        newNodes [matchCount][0] = document.createElement ("span");
        newNodes [matchCount][0].className =  "searchMatch" ;
        newNodes [matchCount][0].innerText = newMatch.slice (current.index, current.index + current [0].length);
    }

    if (insertPoint) { // Meaning there are sibling nodes so the new node(s)
                       // need to be put in the right order under the parentNode
      parentClone.insertBefore (newNodes [matchCount][0], insertPoint);
      if (null != newNodes [matchCount][1]
          && undefined != newNodes [matchCount][1]) {
        parentClone.insertBefore (newNodes [matchCount][1], insertPoint);
      }

      if (null != newNodes [matchCount][2]
          && undefined != newNodes [matchCount][2]) {
        parentClone.insertBefore (newNodes [matchCount][2], insertPoint);
      }

    } else { // if insertPoint
      // The text node where the match was found is the only
      // childNode of its parentNode. There are no silings,
      // so the one textNode was removed and the new group of nodes
      // simply appended
      parentClone.appendChild (newNodes [matchCount][0]);
      if (null != newNodes [matchCount][1]
          && undefined != newNodes [matchCount][1]) {
        parentClone.appendChild (newNodes [matchCount][1]);
      }

      if (null != newNodes [matchCount][2]
          && undefined != newNodes [matchCount][2]) {
        parentClone.appendChild (newNodes [matchCount][2]);
      }
    } // if insertPoint: Else

    if (firstNode) {
      window.scrollTo (0, scrollToValue);
      firstNode = false;
    }

    matchCount++;
    if (matches.length > 1) {
      lastIndex += current.index + current [0].length;
    }

    if (matchCount >= matches.length) {
      parent.parentNode.replaceChild (parentClone, parent);
    }

  } // for const current of matches
  return (false);
} // End function processText



// function clearSearch
// clears the last search highlighting and prepares functionality for
// the next search
function clearSearch (searchStr) {
  scrollToValue = 0;
  firstMatch = true;
  // console.clear ();

  if (restoreNode != null) {
    // Because the restoreNode value contains the >last< search
    // restoreNode.parentNode.querySelector ("#searchBox").value = searchStr;
    globalRootNode.parentNode.querySelector ("#searchBox").value = searchStr;
    globalRootNode.parentNode.replaceChild (restoreNode, globalRootNode);
    globalRootNode = null;
  }
}



// function nodeVisitor
// recursively traverses the dom tree starting at the root node
// returning false ends the recursion at the current node
function nodeVisitor (rootNode, callback, searchStr) {
  if (!callback) {
    var nodes = [];
    nodeVisitor (rootNode, function (node) {
      nodes.push (node);
    });
    return (nodes);
  }

  if (false == callback (rootNode, searchStr)) {
    return (false);
  }

  if (rootNode.hasChildNodes ()) {
    var nodes = rootNode.childNodes;
    for (var i = 0, l = nodes.length; i < l; i++) {
      if (false == nodeVisitor (nodes [i], callback, searchStr)) {
        return;
      }
    }
  }
} // End function nodeVisitor



// function handleError
// displays the error message argument
function handleError (msg) {
  let errorMsg = document.createElement ("div");
  let closeButton = document.createElement ("button");
  let x = document.createElement ("span");
  let attachNode = document.querySelector ("#searchForm");

  x.innerHTML = "&times;";
  closeButton.setAttribute ("type", "button");
  closeButton.setAttribute ("data-dismiss", "alert");
  closeButton.setAttribute ("aria-label", "close");
  closeButton.className = "close";
  closeButton.appendChild (x);
  errorMsg.className = "alert alert-danger alert-dismissible fade show"
                     + " border border-danger rounded-lg searchError";
  errorMsg.setAttribute("role", "alert");
  errorMsg.style.width = msg.length + "rem";
  errorMsg.style.marginRight = "1.5rem";
  errorMsg.innerText = msg;
  errorMsg.appendChild (closeButton);
  attachNode.insertBefore (errorMsg, attachNode.firstChild);
  clearSearch ("");
}
