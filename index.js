const { writeFileSync, readFileSync } = require('fs');
const { decode } = require('png-js');
const puppeteer = require('puppeteer');

(async () => {
    // Initialize browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const SCALE = 7;
    await page.setViewport({ width: 133 * SCALE, height: 83 * SCALE });

    await page.goto('https://example.com');

    await page.screenshot({ path: 'page.png' });

    // Read pixels
    decode('page.png', async (pixels) => {
        // These bytes always begin the image data section and must be counted into the data length
        let data = [0xE5, 0x56, 0x81];
        // Compress image by 10 times to fit calculator screen
        for (let y = 82 * SCALE; y >= 0; y -= SCALE) {
            for (let x = 0; x < 133 * SCALE; x += SCALE) {
                let count = r = g = b = 0;
                for (let i = 0; i < SCALE; i++)
                    for (let j = 0; j < SCALE && x + j < 133 * SCALE; j++) {
                        const k = ((y + i) * (133 * SCALE) + (x + j)) * 4;
                        // Convert to 16-bit color
                        r += Math.round(pixels[k] * 31 / 255);
                        g += Math.round(pixels[k + 1] * 63 / 255);
                        b += Math.round(pixels[k + 2] * 31 / 255);
                        count++;
                    }

                let color = ((r / count) << 11) | ((g / count) << 5) | (b / count);
                data.push(color & 0xFF, color >> 8);
            }
            // Row terminator
            data.push(0xFF, 0xFF);
        }

        // Data header
        const header = [
            // Constant
            0x0D,
            0x00,
            // Variable data length
            data.length & 0xFF,
            data.length >> 8,
            // Variable type (image)
            0x1A,
            // Variable name (Image6)
            0x3C,
            0x05,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            // Version
            0x0A,
            // Flags (archive)
            0x80,
            // Repeat of length
            data.length & 0xFF,
            data.length >> 8,
        ];
        data = header.concat(data);

        const metadata = [
            // Signature
            0x2A,
            0x2A,
            0x54,
            0x49,
            0x38,
            0x33,
            0x46,
            0x2A,
            // Further signature
            0x1A,
            0x0A,
            0x00,
            // Comment (GitHub page)
            0x68,
            0x74,
            0x74,
            0x70,
            0x73,
            0x3a,
            0x2f,
            0x2f,
            0x67,
            0x69,
            0x74,
            0x68,
            0x75,
            0x62,
            0x2e,
            0x63,
            0x6f,
            0x6d,
            0x2f,
            0x6e,
            0x61,
            0x72,
            0x6c,
            0x6f,
            0x74,
            0x6c,
            0x2f,
            0x63,
            0x61,
            0x6c,
            0x63,
            0x62,
            0x72,
            0x6f,
            0x77,
            0x73,
            0x65,
            0x72,
            0x00,
            0x00,
            0x00,
            0x00,
            // Data length
            data.length & 0xFF,
            (data.length >> 8) & 0xFF,
        ];
        data = metadata.concat(data);

        // Calculate checksum
        let checksum = 0;
        for (let i = 55; i < data.length; i++)
            checksum += data[i];
        data.push(checksum & 255, checksum >> 8 & 255);

        writeFileSync('Image6.8ca', Buffer.from(data));
        writeFileSync('Image6.txt', data.map(x => x.toString(16).padStart(2, '0')).join('\n'));

        await browser.close();
    })
})();