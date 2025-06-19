//all of these functions exist in the file to which this is imported to
(async () => {
  try{
    function runAfterPrevInstanceStopped() {
        // @ts-ignore
        const scheduler = new TaskScheduler();
        // @ts-ignore
        const store = new DataStore();
        // @ts-ignore
        const context = new Context(canvas, container, scheduler, store);
        // @ts-ignore
        const gestureDetector = new GestureDetector(context); 
        // @ts-ignore
        registerDrawLoop(context);
        // console.log(canvas, container, scheduler, store, context, gestureDetector);

        //GENERATED CODE STARTS HERE

        buildSketch(context, canvas, scheduler, store, gestureDetector);

        //GENERATED CODE ENDS HERE
        scheduler.start();
    }

    //wait incase this sketch environment is already posting request animation frames
    self.AnimateOneEnvironment.stopSketchEnvironment(__ExternallyDefinedSketchId__);
    (async () => {
        while (self.AnimateOneEnvironment.sketchEnvironmentIsPosting(__ExternallyDefinedSketchId__)) {
            await new Promise(resolve => setTimeout(resolve, 100)) // wait 100 ms
        }
        runAfterPrevInstanceStopped();
    })();
  } catch (error) {
    console.warn(error);
  }
})();