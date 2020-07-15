window.addEventListener('load', run)

function run() {

    let imageUrl = document.getElementById('bingo-holder').style.backgroundImage.slice(4, -1).replace(/"/g, "")

    console.log(imageUrl)
    
    chrome.runtime.sendMessage(
        { message: "convert_image_url_to_data_url", url: imageUrl },
        function (response) {
            bingo(response)
        }
    )

}

function bingo(imageUrl) {

    const worker = Tesseract.createWorker()

    var cellWidth = 31.9
    var cellHeight = 31.6
    var cellBorderWidth = 0

    var cellStartPadding = 2
    var cellEndPadding = 2

    var cellBorderHeight = 6

    var image = new Image(258, 665),
        canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d')

    ctx.filter = `blur(10px)`

    canvas.width = cellWidth / 2
    canvas.height = cellHeight / 2

    var topCardY = 88
    var cardGapY = 18.7

    var cardOffsetX = 6

    var cards = {
        card1: {
            offsetY: topCardY,
            cells: [],
        },

        card2: {
            offsetY: topCardY + cardGapY + (cellHeight * 3),
            cells: [],
        },

        card3: {
            offsetY: topCardY + (cardGapY * 2) + (cellHeight * 6),
            cells: [],
        },

        card4: {
            offsetY: topCardY + (cardGapY * 3) + (cellHeight * 9),
            cells: [],
        },

        card5: {
            offsetY: topCardY + (cardGapY * 4) + (cellHeight * 12),
            cells: [],
        },

        card6: {
            offsetY: topCardY + (cardGapY * 5) + (cellHeight * 15),
            cells: [],
        }
    }


    image.addEventListener('load', processCards)

    image.src = imageUrl

    async function processCards() {

        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');

        let cardNo = 0

        for (var cardId in cards) {
            let card = cards[cardId]

            //Rows
            for (var r = 0; r < 3; r++) {
                let cellOffsetY = (cellHeight * r) - cellBorderHeight

                //Cells
                for (var c = 0; c < 9; c++) {
                    let cellOffsetX = (cellWidth + cellBorderWidth) * c
                    ctx.drawImage(image, cardOffsetX + cellOffsetX + cellStartPadding, card.offsetY + cellOffsetY + cellBorderHeight, cellWidth - cellEndPadding, cellHeight - cellBorderHeight, 0, 0, cellWidth / 2, cellHeight / 2)

                    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

                    let data = imageData.data

                    let cellImg = new Image()

                    let imgSrc = canvas.toDataURL()

                    cellImg.src = imgSrc

                    let res = await recognize(cellImg)

                    if (res) {
                        console.log(`${res}:[${(9 * 3 * cardNo) + (r * 9) + c}]`)
                    }

                }

            }

            cardNo += 1

        }

    }

    async function recognize(img) {
        result = await worker.recognize(img, 'eng', {
            tessedit_char_whitelist: '0123456789'
        });

        return result.data.text
    }
}