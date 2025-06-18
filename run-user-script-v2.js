//all of these functions exist in the file to which this is imported to
(async () => {
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
    console.log(canvas, container, scheduler, store, context, gestureDetector);

    //GENERATED CODE STARTS HERE

    buildSketch(context, canvas, scheduler, store, gestureDetector);

    //GENERATED CODE ENDS HERE

    scheduler.start();
})();
