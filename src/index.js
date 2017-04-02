const express = require('express');
const bodyParser = require('body-parser');
const firebase = require('firebase-admin');
const net = require('net');

var serviceAccount = require('../firebase.json');
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: "https://faight-d08d7.firebaseio.com/",
});

const app = express();

app.set('port', (process.env.PORT || 3001));
app.use(bodyParser.json());

if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
}

app.post('/api/match', (req, res) => {
    let body = {
        uid: req.body.uid,
        //elo: req.body.ai.elo,
        lang: req.body.ai.lang,
        code: req.body.ai.code,
    };
    console.log(req.body);
    let ref = firebase.database().ref("/matches");
    ref.once("value").then(data => {
        return new Promise((resolve, reject) => {
            if (data.val() == null) {
                let newkey = ref.push(body);
                reject();
            } else {
                const val = data.val();
                const keys = Object.keys(val);
                console.log(keys);
                if (keys.length > 0) {
                    const match = val[keys[0]];
                    ref.child(keys[0]).remove();
                    console.log(match);
                    resolve(match);
                } else {
                    let newkey = ref.push(body);
                    reject();
                }
            }
        });
    }).then(a => {
        let games = firebase.database().ref("/games");
        let gamekey = games.push();

        gamekey.set({
            bot1: body,
            bot2: a,
        }).then(() => res.json({key: gamekey.key}));

        const history = gamekey.child("history");
        const client = net.connect({
            host: '10.8.0.14',
            port: '8069',
        }, () => {
            client.write(JSON.stringify({ bot1: body, bot2: a }));
            client.write("\r\n");
        });
        var data = "";
        client.on('data', (data) => {
            console.log(data.toString());
            let move;
            var index = chunk.indexOf("\n");
            if (index === -1) {
                data += chunk;
            } else {
                data += chunk.slice(0, index);

                try {
                    move = JSON.parse(data);
                } catch (e) {
                    socket.end();
                }

                data = chunk.slice(index + 1);
            }

            let move = JSON.parse(data.toString());
            console.log(move);
            history.push(move);

            if (move.message == "Winner") {
                if (move.bot == 1) {
                    firebase.database().ref("/users/" + body.uid + "/ai/wins").once("value")
                    .then(snap => {
                        firebase.database().ref("/users/" + body.uid + "/ai/wins").set(snap.val() + 1);
                    });
                    firebase.database().ref("/users/" + a.uid + "/ai/losses").once("value")
                    .then(snap => {
                        firebase.database().ref("/users/" + a.uid + "/ai/losses").set(snap.val() + 1);
                    });
                } else {
                    firebase.database().ref("/users/" + body.uid + "/ai/losses").once("value")
                    .then(snap => {
                        firebase.database().ref("/users/" + body.uid + "/ai/losses").set(snap.val() + 1);
                    });
                    firebase.database().ref("/users/" + a.uid + "/ai/wins").once("value")
                    .then(snap => {
                        firebase.database().ref("/users/" + a.uid + "/ai/wins").set(snap.val() + 1);
                    });
                }
            }
        });
        client.on('end', () => {
            console.log("Connection died");
        });
        client.on('error', () => {
            console.log("Connection died");
        });
    }, () => console.log("e"));
});

app.listen(app.get('port'), () => {
    console.log('fuck you');
});
