//REMEMBER TO WRAP WITH IIFE
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

console.log("In browser:", isBrowser);

if (!isBrowser) {
    return;
}

// Create a global logging stream
// @ts-ignore
window.debugConsole = (() => {
  const listeners = new Set();

  // @ts-ignore
  function log(...args) {
    const msg = args.map(arg => String(arg)).join(' ');
    for (const listener of listeners) {
      try {
        listener(msg);
      } catch (e) {
        console.warn("myConsole listener error:", e);
      }
    }
  }

  // @ts-ignore
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener); // return unsubscribe function
  }

  return { log, subscribe };
})();

let projectId = "92Fdw42dbgo4q5mPD12J92ndQA"
const __injectCanvas = () => {
    const scriptEl = document.currentScript;
    if (!scriptEl) {
        console.error("Cannot find current script element");
        return;
    }
    
    const container = scriptEl.parentElement;
    if (!container) {
        console.error("Script has no parent container");
        return;
    }
    
    const div = document.createElement("div");
    // @ts-ignore
    div.width = 500;
    // @ts-ignore
    div.height = 500;
    //keep it a column, more elements might be added later
    div.style = "display: flex; flex-direction: column; resize: both; overflow: hidden; width: 500px; height: 500px;";

    // Create canvas element
    const canvas = document.createElement("canvas");
    canvas.id = `animate-one-canvas-${projectId}`
    canvas.width = 500;
    canvas.height = 500;
    canvas.style.border = "1px solid #000";
    
    new ResizeObserver(() => {
        canvas.width = div.clientWidth;
        canvas.height = div.clientHeight;
    }).observe(div);

    // Append the canvas to the parent container of the script
    div.appendChild(canvas);
    container.appendChild(div);

    return [canvas, div];
};

// @ts-ignore
const [canvas, container] = __injectCanvas();

//@ts-ignore
function __loadExternalScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        // @ts-ignore
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
}

//=======================================================================
//  Sketch src code goes here + load functions
//=======================================================================
