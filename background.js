chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

        console.log(request)

        if (request.message == "convert_image_url_to_data_url") {
            var canvas = document.createElement("canvas")
            var img = new Image()
            img.addEventListener("load", function () {
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                canvas.getContext("2d").drawImage(img, 0, 0)
                sendResponse(canvas.toDataURL())
            })
            img.src = request.url
        }

        return true
    }
)