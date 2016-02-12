var data = {};
var ui = {};
var socket = null;
function start() {
    socket = SupClient.connect(SupClient.query.project);
    socket.on("connect", onConnected);
    socket.on("disconnect", SupClient.onDisconnected);
    SupClient.setupHotkeys();
    // Main
    ui.audioElt = document.querySelector("audio");
    // Upload
    var fileSelect = document.querySelector("input.file-select");
    fileSelect.addEventListener("change", onFileSelectChange);
    document.querySelector("button.upload").addEventListener("click", function () { fileSelect.click(); });
    document.querySelector("button.download").addEventListener("click", onDownloadSound);
    // Sidebar
    ui.streamingSelect = document.querySelector(".property-streaming");
    ui.streamingSelect.addEventListener("change", function (event) {
        data.projectClient.editAsset(SupClient.query.asset, "setProperty", "streaming", ui.streamingSelect.value === "true");
    });
}
// Network callbacks
var onAssetCommands = {};
function onConnected() {
    data.projectClient = new SupClient.ProjectClient(socket);
    var soundSubscriber = {
        onAssetReceived: onAssetReceived,
        onAssetEdited: onAssetEdited,
        onAssetTrashed: SupClient.onAssetTrashed
    };
    data.projectClient.subAsset(SupClient.query.asset, "sound", soundSubscriber);
}
function onAssetReceived(err, asset) {
    data.asset = asset;
    setupSound();
    setupProperty("streaming", data.asset.pub.streaming);
}
function onAssetEdited(id, command) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    if (onAssetCommands[command] != null)
        onAssetCommands[command].apply(data.asset, args);
}
// User interface
var objectURL;
function onFileSelectChange(event) {
    if (event.target.files.length === 0)
        return;
    var reader = new FileReader();
    reader.onload = function (event) {
        data.projectClient.editAsset(SupClient.query.asset, "upload", reader.result);
    };
    reader.readAsArrayBuffer(event.target.files[0]);
    event.target.parentElement.reset();
}
function onDownloadSound() {
    function triggerDownload(name) {
        var anchor = document.createElement("a");
        document.body.appendChild(anchor);
        anchor.style.display = "none";
        anchor.href = objectURL;
        // Not yet supported in IE and Safari (http://caniuse.com/#feat=download)
        anchor.download = name;
        anchor.click();
        document.body.removeChild(anchor);
    }
    var options = {
        initialValue: SupClient.i18n.t("soundEditor:sidebar.settings.sound.file.download.defaultName"),
        validationLabel: SupClient.i18n.t("common:actions.download")
    };
    if (SupClient.isApp) {
        triggerDownload(options.initialValue);
    }
    else {
        /* tslint:disable:no-unused-expression */
        new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("soundEditor:sidebar.settings.sound.file.download.prompt"), options, function (name) {
            /* tslint:enable:no-unused-expression */
            if (name == null)
                return;
            triggerDownload(name);
        });
    }
}
function setupSound() {
    if (objectURL != null)
        URL.revokeObjectURL(objectURL);
    var typedArray = new Uint8Array(data.asset.pub.sound);
    var blob = new Blob([typedArray], { type: "audio" });
    objectURL = URL.createObjectURL(blob);
    ui.audioElt.src = objectURL;
}
function setupProperty(path, value) {
    switch (path) {
        case "streaming":
            ui.streamingSelect.value = value;
            break;
    }
}
onAssetCommands.upload = setupSound;
onAssetCommands.setProperty = setupProperty;
// Start
SupClient.i18n.load([{ root: window.location.pathname + "/../..", name: "soundEditor" }], start);
