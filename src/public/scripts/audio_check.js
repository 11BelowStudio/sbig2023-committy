let startPlayPromise = new Audio("/assets/audio/silence.ogg").play();

if (startPlayPromise !== undefined) {
startPlayPromise
    .then(() => {
    })
    .catch((error) => {
    if (error.name === "NotAllowedError") {
        let res = window.confirm(
            "ERROR!\n" +
            "It appears that you have not granted Committy permission to autoplay audio.\n" +
            "Committy won't function correctly without this permission.\nPlease enable it."
        );
        window.location.reload();
    } else {
        // Handle a load or playback error
    }
    });
}