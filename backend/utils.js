import pictures from '../mapping/pictures.json' assert {type: 'json'}

export const randomNumber = () => {
    return Math.floor(Math.random() * 9) + 1
}

export const randomPicture = () => {
    const keys = Object.keys(pictures)

    console.log(keys);

    const idx = parseInt(Math.random() * keys.length)
    console.log(idx);

    return keys[idx]
}

export const randomColor = () => '#' + (0x1000000 + (Math.random()) * 0xffffff).toString(16).substring(0, 6)