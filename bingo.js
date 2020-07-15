window.addEventListener('load', run)

var num = ''
var num_map = {}

var elem = null
var sp = null
var sp_count = null

function run() {

    elem = document.getElementById('loader-holder')

    sp = document.createElement('H1')

    sp.innerText = 'Analysing bingo cards please wait...'

    sp_count = document.createElement('H2')

    elem.parentNode.insertBefore(sp, elem)
    sp.parentNode.insertBefore(sp_count, sp)

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
                        num_map[res.replace(/(\r\n|\n|\r)/gm, "")] = (27 * cardNo) + (r * 9) + c
                        sp_count.innerHTML = parseInt(sp_count.innerHTML || 0) + 1
                    }

                }

            }

            cardNo += 1

        }

        loaded_nums()

    }

    async function recognize(img) {
        result = await worker.recognize(img, 'eng', {
            tessedit_char_whitelist: '0123456789'
        });

        return result.data.text
    }

    function loaded_nums()
    {
        sp_count.style.display = 'none'
        sp.innerHTML = 'Bingo cards have been parsed, you can now type numbers followed by enter to dab'

        document.addEventListener('keypress', function(event){
            if (Number.isInteger(parseInt(event.key))){
                set_num(event.key)
            }

            if (event.key == 'Enter' && num){
                submit_num()
            }
        })
    }

    function set_num(new_num) {
        console.log('setNum', new_num)
        if(num.length < 2){
            num = `${num}${new_num}`
        }
    }

    function submit_num() {
        console.log('submit', num)
        console.log(num_map)
        let cross_pos = num_map[num]
        if (cross_pos){
            let cross = document.getElementsByClassName('cross')[cross_pos]
            console.log(cross)
            cross.style.opacity = cross.style.opacity == "0" ? "1" : "0"
            num = ''
        }
    }

}