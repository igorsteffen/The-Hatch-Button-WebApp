require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');

//env secrets
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASS;

// Conecte-se ao MongoDB
mongoose.connect(`mongodb+srv://${dbUser}:${dbPassword}@cluster0.mwtnv.mongodb.net/teste?retryWrites=true&w=majority&appName=Cluster0`);

// Esquema do ranking
const rankingSchema = new mongoose.Schema({
    name: String,
    timestamp: { type: Date, default: Date.now },
    executionOrder: { type: Number, default: 1 }
});

const Ranking = mongoose.model('Ranking', rankingSchema);

let countdownTime = 108 * 60; // 108 minutos em segundos

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Função de contagem regressiva
setInterval(() => {
    if (countdownTime > 0) {
        countdownTime--;
        io.emit('updateCountdown', countdownTime);
    }
}, 1000);

io.on('connection', (socket) => {
    console.log('User connected');
    socket.emit('updateCountdown', countdownTime);

    Ranking.find().sort({ timestamp: -1 }).limit(5).then((topRankings) => {
        socket.emit('updateRanking', topRankings);
    });

    socket.on('getRanking', async () => {
        const topRankings = await Ranking.find().sort({ timestamp: -1 }).limit(5);
        socket.emit('updateRanking', topRankings);
    });

    let executionCounter = 0; // Contador global de execuções
    socket.on('submitCode', (code) => {
        if (code === '4 8 15 16 23 42') {
            countdownTime = 108 * 60;
            io.emit('resetCountdown');
            // Solicitar nome do usuário para o ranking
            socket.emit('requestName');
        } else {
            // Se o código estiver incorreto
            socket.emit('errorCode', 'Incorrect code. Try again.');
        }
    });
    // Salvar o nome do usuário no ranking
    socket.on('submitName', async (name) => {
        if (!name || name.trim() === '' || name === null) {
            name = 'anonymous';
        }

        // Incrementa o contador global de execuções
        executionCounter++;

        // Criar um novo registro de execução com a ordem de execução atual
        const newRanking = new Ranking({
            name,
            executionOrder: executionCounter
        });

        await newRanking.save();

        // Buscar os últimos 10 nomes do ranking
        const topRankings = await Ranking.find().sort({ executionOrder: -1 }).limit(5);

        // Enviar ranking atualizado para todos os usuários
        io.emit('updateRanking', topRankings);
    });
});

http.listen(PORT, '0.0.0.0',() => {
    console.log(`Server running on port ${PORT}`);
});

