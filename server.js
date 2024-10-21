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

// Novo esquema para manter o estado do contador
const counterSchema = new mongoose.Schema({
    lastExecutionOrder: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

let countdownTime = 5.2 * 60; // 108 minutos em segundos

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

let executionCounter = 0; // Contador global de execuções

async function initializeCounter() {
    const counterDoc = await Counter.findOne();
    if (counterDoc) {
        executionCounter = counterDoc.lastExecutionOrder;
    } else {
        // Se não houver, cria o primeiro contador
        const newCounter = new Counter({ lastExecutionOrder: 0 });
        await newCounter.save();
        executionCounter = 0;
    }
}

initializeCounter();

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

    // Restabelecer o contador global
    socket.emit('executionOrder', executionCounter);  // Envia o contador de execuções atual para o cliente

    socket.on('submitCode', (code) => {
        // Expressão regular que lida com os diferentes formatos possíveis
        const formattedCode = code.replace(/[\s-_\/]/g, ''); // Remove espaços, traços, underscores e barras

        if (formattedCode === '4815162342') {
            countdownTime = 5.2 * 60;
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

        // Salva o contador no banco de dados
        await Counter.updateOne({}, { lastExecutionOrder: executionCounter });

        // Criar um novo registro de execução com a ordem de execução atual
        const newRanking = new Ranking({
            name,
            executionOrder: executionCounter
        });

        await newRanking.save();

        // Buscar os últimos 5 nomes do ranking
        const topRankings = await Ranking.find().sort({ executionOrder: -1 }).limit(5);

        // Enviar ranking atualizado para todos os usuários
        io.emit('updateRanking', topRankings);
    });
});

http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

