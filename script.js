import {
    ObjectDetector,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

const demosSection = document.getElementById("demos");
let objectDetector;
let runningMode = "IMAGE";

// Initialize the object detector
const initializeObjectDetector = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
    );
    objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite`,
            delegate: "GPU"
        },
        scoreThreshold: 0.5,
        runningMode: runningMode
    });
    console.log("Model loaded!");
};
initializeObjectDetector();

// Webcam setup
const video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
const enableWebcamButton = document.getElementById("webcamButton");

// Check if webcam access is supported
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

if (hasGetUserMedia()) {
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

async function enableCam(event) {
    if (!objectDetector) {
        console.log("Wait! ObjectDetector not loaded yet.");
        return;
    }

    // Toggle webcam on/off
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    } else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }

    // Activate the webcam stream
    const constraints = { video: true };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
}

let webcamRunning = false;
let lastVideoTime = -1;
let children = [];

async function predictWebcam() {
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await objectDetector.setOptions({ runningMode: "VIDEO" });
    }

    let startTimeMs = performance.now();

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const detections = objectDetector.detectForVideo(video, startTimeMs);
        displayVideoDetections(detections);
    }

    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}

function displayVideoDetections(result) {
    // Clear previous highlights
    for (let child of children) {
        liveView.removeChild(child);
    }
    children = [];

    // Draw new highlights
    for (let detection of result.detections) {
        const p = document.createElement("p");
        p.setAttribute("class", "p-info");
        p.innerText = detection.categories[0].categoryName + 
            " - " + Math.round(parseFloat(detection.categories[0].score) * 100) + "%";
            
        p.style.left = (video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX) + "px";
        p.style.top = detection.boundingBox.originY + "px";
        p.style.width = (detection.boundingBox.width - 10) + "px";

        const highlighter = document.createElement("div");
        highlighter.setAttribute("class", "highlighter");
        highlighter.style.left = (video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX) + "px";
        highlighter.style.top = detection.boundingBox.originY + "px";
        highlighter.style.width = (detection.boundingBox.width - 10) + "px";
        highlighter.style.height = detection.boundingBox.height + "px";

        liveView.appendChild(highlighter);
        liveView.appendChild(p);
        children.push(highlighter);
        children.push(p);
    }
}
