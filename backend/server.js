import express from 'express'
import fs from 'fs'
import { WebSocketServer } from 'ws'

import { randomNumber, randomPicture, randomColor } from './utils.js'

import pictures from '../mapping/pictures.json' assert {type: 'json'}

const app = express()

const wsServer = new WebSocketServer({
    noServer: true
})

const rooms = {}

const getNewRoomKey = () => {
    while (true) {
        const newRoomKey = randomNumber() * 1000 + randomNumber() * 100 + randomNumber() * 10 + randomNumber()
        if (!(newRoomKey in rooms)) return newRoomKey
    }
}

const getRoomPlayersData = (roomKey, except) => {
    return Object.keys(rooms[roomKey]).map((k) => {
        return {
            username: k,
            color: rooms[roomKey][k].color,
            picture: {
                key: rooms[roomKey][k].picture,
                name: pictures[rooms[roomKey][k].picture].name
            }
        }
    }).filter((p) => p.username != except)
}

const playerFitsTheRoom = (player, roomKey) => {
    for (const p of Object.values(rooms[roomKey])) {
        if (p.picture == player.picture || p.color == player.color) return false
    }
    return true
}

wsServer.on('connection', function(socket) {
  socket.on('message', function(msg) {
    // console.log(msg)

    try {
        const json = JSON.parse(msg)
        // console.log(json)

        switch (json.action) {
            case 'createRoom':
                if (!json.data.username) {
                    return socket.send(JSON.stringify({type: 'error', data: { error: 'No username provided' } }))
                }

                const roomKey = getNewRoomKey()
                rooms[roomKey] = {
                    [json.data.username]: {
                        picture: randomPicture(),
                        color: randomColor()
                    }
                }

                const continiouslySendCreateData = () => {
                    try {
                        // console.log(rooms);
                        // console.log(JSON.stringify({type: 'roomData', data: { roomKey: roomKey, players: getRoomPlayersData(roomKey) }}))
                        socket.send(JSON.stringify({type: 'roomData', data: { roomKey: roomKey, players: getRoomPlayersData(roomKey, json.data.username) }}))
                        setTimeout(continiouslySendCreateData, 1000)
                    } catch(err) {
                        return
                    }
                }
        
                continiouslySendCreateData()

                socket.on('close', function() {
                    delete rooms[roomKey][json.data.username]
                    console.log(rooms[roomKey])

                    if (Object.keys(rooms[roomKey]).length === 0) {
                        delete rooms[roomKey]
                    }    
                })                

                break
            case 'joinRoom':
                if (!json.data.username) {
                    return socket.send(JSON.stringify({type: 'error', data: { error: 'No username provided' } }))
                }

                if (!json.data.roomKey || !rooms[json.data.roomKey]) {
                    return socket.send(JSON.stringify({type: 'error', data: { error: 'Invalid room key' } }))
                }

                if (json.data.username in rooms[json.data.roomKey]) {
                    return socket.send(JSON.stringify({type: 'error', data: { error: 'Username already exists in the room' } }))
                }

                if (rooms[json.data.roomKey] >= 4) {
                    return socket.send(JSON.stringify({type: 'error', data: { error: 'Too many people in the room' } }))
                }

                const newPlayer = {
                    picture: randomPicture(),
                    color: randomColor()
                }

                while (!playerFitsTheRoom(newPlayer, json.data.roomKey)) {
                    newPlayer.picture = randomPicture()
                    newPlayer.color = randomColor()
                }

                rooms[json.data.roomKey][json.data.username] = newPlayer

                console.log('added new gay')
                // console.log(rooms[json.data.roomKey][socket])

                const continiouslySendJoinData = () => {
                    try {
                        // console.log(rooms);
                        // console.log(JSON.stringify({type: 'roomData', data: { roomKey: json.data.roomKey, players: getRoomPlayersData(json.data.roomKey) }}));
                        socket.send(JSON.stringify({type: 'roomData', data: { roomKey: json.data.roomKey, players: getRoomPlayersData(json.data.roomKey, json.data.username) }}))
                        setTimeout(continiouslySendJoinData, 1000)
                    } catch(err) {
                        return
                    }
                }
        
                continiouslySendJoinData()

                socket.on('close', function() {
                    delete rooms[json.data.roomKey][json.data.username]
                    console.log(rooms[json.data.roomKey])

                    if (Object.keys(rooms[json.data.roomKey]).length === 0) {
                    delete rooms[json.data.roomKey]

                    }
                })

                break
            default:
                console.log(json.action);
                return socket.send(JSON.stringify({type: 'error', data: { error: 'Invalid action' }}))
        }
    } catch (error) {
        console.error(error)
        return socket.send(JSON.stringify({type: 'error', data: { error: error }}))
    }
  })
})

app.get('/picture/:id', (req, res) => {

    const pic = pictures[req.params.id]

    if (!pic) return res.status(404).send()

    const filePath = `pictures/${pic.file}`

    if (!fs.existsSync(filePath)) return res.status(404).send()

    res.sendFile(filePath, { root: '.' })
})

const httpServer = app.listen(process.env.PORT, () => {
    console.log(`Listening on 0.0.0.0:${process.env.PORT}`)
});

httpServer.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, socket => {
    wsServer.emit('connection', socket, request);
  });
});