const socket = io(); // Conectar ao servidor através do Socket.io

let countdownDisplay = document.querySelectorAll('.digit');
let errorMessage = document.getElementById('errorMessage');
const rankingList = document.getElementById('rankingList');
const beepSound = document.getElementById('beepSound');
const alarmSound = document.getElementById('alarmSound');
const resetSound = document.getElementById('resetSound');
const interSound = document.getElementById('interSound');
const emSound = document.getElementById('emSound');
const weirdSound = document.getElementById('weirdSound');
let colorInterval; // Para armazenar o intervalo de mudança de cor
let isRandomizing = false; // Para controlar se o contador está no modo aleatório
let randomInterval; // Variável para armazenar o intervalo de randomização
let isInputActivated = false; // Controla se o input já foi ativado
let isBeepPlaying = false;


window.onload = () => {
    const dharmaModal = document.getElementById('dharmaModal');
    dharmaModal.style.display = 'block'; // Exibe o modal

    const closeModalButton = document.getElementById('closeModalButton');
    const video = document.getElementById('orientationVideo');

    // Função para fechar o modal ao clicar no botão "OK"
    closeModalButton.onclick = () => {
        dharmaModal.style.display = 'none'; // Esconde o modal
        video.pause(); // Para o vídeo
        video.currentTime = 0; // Reseta o vídeo para o início
        video.style.display = 'none'; // Esconde o vídeo novamente
    };
};

// Função para fechar o modal ao clicar no botão "Close" no vídeo
document.getElementById('closeVideoButton').addEventListener('click', () => {
    const video = document.getElementById('orientationVideo');
    dharmaModal.style.display = 'none';
    video.pause(); // Pausa o vídeo
    video.style.display = 'none'; // Esconde o modal
    video.currentTime = 0; // Reseta o vídeo para o início
    const closeVideoButton = document.getElementById('closeVideoButton');
    closeVideoButton.style.display = 'none';

});

// Exibir o vídeo diretamente no modal quando o link for clicado
document.getElementById('orientationLink').addEventListener('click', (event) => {
    event.preventDefault(); // Prevenir o comportamento padrão

    const video = document.getElementById('orientationVideo');
    video.style.display = 'block'; // Mostrar o vídeo
    video.play(); // Iniciar a reprodução do vídeo
    closeVideoButton.style.display = 'block';
});

// Função para alternar entre vermelho e preto
function toggleBackgroundColor() {
    const currentColor = document.body.style.backgroundColor;

    // Alterna a cor
    if (currentColor === 'red') {
        document.body.style.backgroundColor = 'black';
    } else {
        document.body.style.backgroundColor = 'red';
    }
}

// Função para formatar os segundos como HH:MM:SS
function formatTime(seconds) {
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;

    //let hours = Math.floor(totalMinutes / 60);
    //minutes = totalMinutes % 60;

    return [
        String(minutes).padStart(3, '0'),
        String(remainingSeconds).padStart(2, '0')
    ];
}

// Função para exibir números aleatórios nos 5 mostradores
function randomizeDisplay() {
    countdownDisplay.forEach((digit) => {
        const randomNum = Math.floor(Math.random() * 10); // Gera um número aleatório entre 0 e 9
        digit.textContent = randomNum;
    });
}

// Ouvir o evento de atualização do ranking
socket.on('updateRanking', (rankings) => {
    rankingList.innerHTML = ''; // Limpa a lista anterior

    rankings.forEach((ranking) => {
        const li = document.createElement('li');
        li.style.display = 'flex'; // Para alinhar nome e data em linha
        li.style.justifyContent = 'space-between'; // Nome à esquerda, data à direita

        // Cria um elemento para o número de execução
        const executionOrderSpan = document.createElement('span');
        executionOrderSpan.textContent = `#${ranking.executionOrder}`; // Exibe o número de execução

        const nameSpan = document.createElement('span');
        nameSpan.textContent = ranking.name; // Exibe o nome do ranking

        const dateSpan = document.createElement('span');
        const formattedDate = new Date(ranking.timestamp).toLocaleString(); // Formatar a data
        dateSpan.textContent = formattedDate; // Exibe a data e hora

        li.appendChild(executionOrderSpan);
        li.appendChild(nameSpan);
        li.appendChild(dateSpan);
        rankingList.appendChild(li);
    })
});

// Ouvir os eventos do servidor para atualizar o contador
socket.on('updateCountdown', (secondsLeft) => {
    if (isRandomizing) return;

    if (secondsLeft > 0) {
        const [minutes, seconds] = formatTime(secondsLeft);

        countdownDisplay[0].textContent = minutes[0]; // Primeiro dígito dos minutos
        countdownDisplay[1].textContent = minutes[1]; // Segundo dígito dos minutos
        countdownDisplay[2].textContent = minutes[2] || '0'; // Terceiro dígito dos minutos

        // Trava os segundos em "00" até que o tempo chegue a 5 minutos
        if (secondsLeft > 5 * 60) {
            countdownDisplay[3].textContent = '0';  // Segundos fixos em '00'
            countdownDisplay[4].textContent = '0';
            codeInput.disabled = true; // Desabilita o input
            executeButton.disabled = true; // Desabilita o botão
            isInputActivated = false; // Reseta o estado de ativação do input
        } else {
            countdownDisplay[3].textContent = seconds[0];  // Primeiro dígito dos segundos
            countdownDisplay[4].textContent = seconds[1];

            // Habilita o input e o botão quando o tempo estiver abaixo de 5 minutos
            if (secondsLeft <= 5 * 60 && !isInputActivated) {
                codeInput.disabled = false; // Habilita o input
                executeButton.disabled = false; // Habilita o botão
                document.getElementById('codeInput').focus();
                isInputActivated = true; // Marca como ativado
            }

            if (secondsLeft <= 5 * 60 && secondsLeft > 1 * 60 && !isBeepPlaying) {
                beepSound.loop = true; // Define o loop para manter o som ativo
                beepSound.play();      // Toca o som beep
                isBeepPlaying = true;  // Marca que o som beep está tocando
            }

            if (secondsLeft <= 1 * 60) {
                if (isBeepPlaying) {
                    beepSound.pause();
                    beepSound.currentTime = 0; // Reseta o som beep
                    isBeepPlaying = false;     // Para de tocar o beep
                }
                if (alarmSound.paused) {
                    alarmSound.play();
                }
            }
        }
    } else {
        // Quando o contador chegar a zero, inicie a randomização imediatamente
        isRandomizing = true; // Muda para o modo aleatório
        // Inicia a exibição de números aleatórios
        randomInterval = setInterval(randomizeDisplay, 200); // Atualiza os números a cada 200ms
        if (interSound.paused && emSound.paused && weirdSound.paused) {
            interSound.currentTime = 0; // Reseta o som para o início
            emSound.currentTime = 0; // Reseta o som para o início
            weirdSound.currentTime = 0;
            interSound.play(); // Toca o som
            emSound.play(); // Toca o som
            weirdSound.play();
        }
        // Começa a alternar a cor do fundo
        document.body.style.backgroundColor = 'red'; // Define a cor inicial
        colorInterval = setInterval(toggleBackgroundColor, 500); // Alterna a cor a cada 500ms
    }
});

// Ouvir o evento de reset e atualizar o contador
socket.on('resetCountdown', () => {
    isRandomizing = false; // Sai do modo aleatório
    if (randomInterval) {
        clearInterval(randomInterval); // Para a exibição de números aleatórios
    }

    // Para a alternância de cor ao resetar
    clearInterval(colorInterval); // Para de alternar a cor
    document.body.style.backgroundColor = ''; // Reseta a cor do fundo para a padrão

    // Reiniciar o contador e atualizar a interface gráfica
    if (!interSound.paused && !emSound.paused && !weirdSound) {
        interSound.currentTime = 0; // Reseta o som para o início
        interSound.pause(); // Toca o som
        emSound.currentTime = 0; // Reseta o som para o início
        emSound.pause(); // Toca o som
        weirdSound.currentTime = 0; // Reseta o som para o início
        weirdSound.pause(); // Toca o som
    }
    resetSound.play();
    const [minutes, seconds] = formatTime(108 * 60);
    countdownDisplay[0].textContent = minutes[0];
    countdownDisplay[1].textContent = minutes[1];
    countdownDisplay[2].textContent = minutes[2];
    countdownDisplay[3].textContent = '0';
    countdownDisplay[4].textContent = '0';

    // Desabilita o input e o botão após o reset
    codeInput.disabled = true;
    executeButton.disabled = true;
    // Limpa o conteúdo da textbox e esconde a mensagem de erro
    document.getElementById('codeInput').value = '';
    errorMessage.style.visibility = 'hidden'; // Esconde a mensagem de erro
    isInputActivated = false; // Reseta a ativação ao resetar o contador
    isBeepPlaying = false;    // Reseta o estado de reprodução do beep

    beepSound.pause(); // Para o som beep, se estiver tocando
    beepSound.currentTime = 0; // Reseta o som beep para o início

    socket.emit('getRanking');
});

// Lógica para o envio do código quando o botão 'Execute' é clicado
document.getElementById('executeButton').addEventListener('click', () => {
    const code = document.getElementById('codeInput').value;
    socket.emit('submitCode', code);
});

// Lógica para o envio do código quando a tecla Enter é pressionada
document.getElementById('codeInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const code = document.getElementById('codeInput').value;
        socket.emit('submitCode', code);
    }
});

// Mostrar mensagem de erro se o código estiver incorreto
socket.on('errorCode', (message) => {
    errorMessage.style.visibility = 'visible'; // Mostra a mensagem de erro
    document.getElementById('codeInput').value = '';
    document.getElementById('codeInput').focus();
});

// Ouvir o evento de solicitar nome do usuário
socket.on('requestName', () => {
    // Adicionar um atraso de 2 segundo (2000ms) antes de exibir o modal
    setTimeout(() => {
        // Exibir o modal
        const modal = document.getElementById('customModal');
        modal.style.display = 'block';

        const submitNameButton = document.getElementById('submitNameButton');

        // Função para capturar o nome inserido e enviar para o servidor
        submitNameButton.onclick = () => {
            const name = document.getElementById('nameInput').value;

            if (name) {
                // Enviar o nome para o servidor
                socket.emit('submitName', name);
                // Fechar o modal
                modal.style.display = 'none';
            }
        };
    }, 2000);
});
