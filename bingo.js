window.addEventListener('load', run)

var num = ''
var num_map = {}

var sp = null
var sp_count = null
var popover = null

function run() {

    popover = document.createElement('div')

    popover.classList.add('popover')

    sp = document.createElement('H1')

    sp.innerText = 'Analysing bingo cards please wait...'

    sp_count = document.createElement('progress')

    sp_count.value = 0

    sp_count.max = 90

    popover.appendChild(sp)

    popover.appendChild(sp_count)

    document.body.appendChild(popover)

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

        await worker.load()
        await worker.loadLanguage('eng')
        await worker.initialize('eng')
        await worker.setParameters({
            tessedit_char_whitelist: "0123456789",
        })

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

                    sharpen(ctx, canvas.width, canvas.height, 1)

                    let res = await recognize(canvas)

                    if (res) {
                        num_map[res.replace(/(\r\n|\n|\r)/gm, "")] = (27 * cardNo) + (r * 9) + c
                        sp_count.value = sp_count.value + 1
                        sp_count.innerText = sp_count.value + ' / 90'
                    }

                }

            }

            cardNo += 1

        }

        loaded_nums()

    }

    async function recognize(img) {
        result = await worker.recognize(img)
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
        let cross_pos = num_map[num]
        if (cross_pos){
            let cross = document.getElementsByClassName('cross')[cross_pos]
            cross.style.opacity = cross.style.opacity == "0" ? "1" : "0"
        }
        num = ''
    }

    function sharpen(ctx, w, h, mix) {
        var x, sx, sy, r, g, b, a, dstOff, srcOff, wt, cx, cy, scy, scx,
            weights = [0, -1, 0, -1, 5, -1, 0, -1, 0],
            katet = Math.round(Math.sqrt(weights.length)),
            half = (katet * 0.5) | 0,
            dstData = ctx.createImageData(w, h),
            dstBuff = dstData.data,
            srcBuff = ctx.getImageData(0, 0, w, h).data,
            y = h;

        while (y--) {
            x = w;
            while (x--) {
                sy = y;
                sx = x;
                dstOff = (y * w + x) * 4;
                r = 0;
                g = 0;
                b = 0;
                a = 0;

                for (cy = 0; cy < katet; cy++) {
                    for (cx = 0; cx < katet; cx++) {
                        scy = sy + cy - half;
                        scx = sx + cx - half;

                        if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
                            srcOff = (scy * w + scx) * 4;
                            wt = weights[cy * katet + cx];

                            r += srcBuff[srcOff] * wt;
                            g += srcBuff[srcOff + 1] * wt;
                            b += srcBuff[srcOff + 2] * wt;
                            a += srcBuff[srcOff + 3] * wt;
                        }
                    }
                }

                dstBuff[dstOff] = r * mix + srcBuff[dstOff] * (1 - mix);
                dstBuff[dstOff + 1] = g * mix + srcBuff[dstOff + 1] * (1 - mix);
                dstBuff[dstOff + 2] = b * mix + srcBuff[dstOff + 2] * (1 - mix);
                dstBuff[dstOff + 3] = srcBuff[dstOff + 3];
            }
        }

        ctx.putImageData(dstData, 0, 0);
    }

}