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

	// Check if the container already exists
	let div = document.getElementById("animate-one-dynamic-sketch-container");
	let canvas = document.getElementById("animate-one-dynamic-sketch-canvas");

	if (!div) {
		div = document.createElement("div");
		div.id = "animate-one-dynamic-sketch-container";
		div.style.display = "flex";
		div.style.flexDirection = "column";
		div.style.resize = "both";
		div.style.overflow = "hidden";
		div.style.width = "500px";
		div.style.height = "500px";

		container.appendChild(div);
	}

	if (!canvas) {
		canvas = document.createElement("canvas");
		canvas.id = "animate-one-dynamic-sketch-canvas";
		canvas.width = 500;
		canvas.height = 500;
		canvas.style.border = "1px solid #000";

		div.appendChild(canvas);

		new ResizeObserver(() => {
			canvas.width = div.clientWidth;
			canvas.height = div.clientHeight;
		}).observe(div);
	}

	return [canvas, div];
};

// @ts-ignore
const [canvas, container] = __injectCanvas();
