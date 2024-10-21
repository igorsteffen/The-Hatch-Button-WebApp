window.onload = () => {
    const dharmaModal = document.getElementById('dharmaModal');
    dharmaModal.style.display = 'block'; // Exibe o modal

    const closeModalButton = document.getElementById('closeModalButton');
    const video = document.getElementById('orientationVideo');

    closeModalButton.onclick = () => { // evento para fechar o modal ao clicar no botão "OK"
        dharmaModal.style.display = 'none'; // Esconde o modal
        video.pause(); // Para o vídeo
        video.currentTime = 0; // Reseta o vídeo para o início
        video.style.display = 'none'; // Esconde o vídeo novamente
        initializeRules();
    };
};

document.getElementById('orientationLink').addEventListener('click', (event) => { // Exibir o vídeo diretamente no modal quando o link for clicado
    event.preventDefault(); // Prevenir o comportamento padrão

    const video = document.getElementById('orientationVideo');
    video.style.display = 'block'; // Mostrar o vídeo
    video.play(); // Iniciar a reprodução do vídeo
    closeVideoButton.style.display = 'block';
});

document.getElementById('closeVideoButton').addEventListener('click', () => { // evento para fechar o modal ao clicar no botão "Close" no vídeo
    const video = document.getElementById('orientationVideo');
    dharmaModal.style.display = 'none';
    video.pause(); // Pausa o vídeo
    video.style.display = 'none'; // Esconde o modal
    video.currentTime = 0; // Reseta o vídeo para o início
    const closeVideoButton = document.getElementById('closeVideoButton');
    closeVideoButton.style.display = 'none';
    initializeRules();
});

function initializeRules() {
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
    const modal = document.getElementById('customModal');
    const hintText = document.getElementById('hintText');
    const hintImage = document.getElementById('hintImage');
    let colorInterval; // Para armazenar o intervalo de mudança de cor
    let isRandomizing = false; // Para controlar se o contador está no modo aleatório
    let randomInterval; // Variável para armazenar o intervalo de randomização
    let isInputActivated = false; // Controla se o input já foi ativado
    let isBeepPlaying = false;
    let isAlarmPlaying = false;

    // Exibe a imagem ao passar o mouse sobre "Hint"
    hintText.addEventListener('mouseenter', () => {
        hintImage.style.display = 'block';
    });

    // Oculta a imagem ao sair do mouse sobre "Hint"
    hintText.addEventListener('mouseleave', () => {
        hintImage.style.display = 'none';
    });

    function toggleBackgroundColor() { // Função para alternar entre vermelho e preto
        const currentColor = document.body.style.backgroundColor;
        if (currentColor === 'red') {
            document.body.style.backgroundColor = 'black';
        } else {
            document.body.style.backgroundColor = 'red';
        }
    }

    function formatTime(seconds) { // Função para formatar os segundos como HH:MM:SS
        let minutes = Math.floor(seconds / 60);
        let remainingSeconds = seconds % 60;
        return [
            String(minutes).padStart(3, '0'),
            String(remainingSeconds).padStart(2, '0')
        ];
    }

    function randomizeDisplay() { // Função para exibir números aleatórios nos 5 mostradores
        countdownDisplay.forEach((digit) => {
            const randomNum = Math.floor(Math.random() * 10); // Gera um número aleatório entre 0 e 9
            digit.textContent = randomNum;
        });
    }

    socket.on('updateRanking', (rankings) => { // Ouvir o evento de atualização do ranking
        rankingList.innerHTML = ''; // Limpa a lista anterior

        rankings.forEach((ranking) => {
            const li = document.createElement('li');
            li.style.display = 'flex'; // Para alinhar nome e data em linha
            li.style.justifyContent = 'space-between'; // Nome à esquerda, data à direita

            // Cria um elemento para o número de execução
            const executionOrderSpan = document.createElement('span');
            executionOrderSpan.textContent = `${ranking.executionOrder}`; // Exibe o número de execução
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

    socket.on('updateCountdown', (secondsLeft) => { // Ouvir os eventos do servidor para atualizar o contador
        if (isRandomizing) return;

        if (secondsLeft > 0) {
            const [minutes, seconds] = formatTime(secondsLeft);
            countdownDisplay[0].textContent = minutes[0]; // Primeiro dígito dos minutos
            countdownDisplay[1].textContent = minutes[1]; // Segundo dígito dos minutos
            countdownDisplay[2].textContent = minutes[2] || '0'; // Terceiro dígito dos minutos

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

                if (secondsLeft > 1 * 60 && secondsLeft <= 5 * 60 && !isBeepPlaying) {
                    beepSound.loop = true; // Define o loop para manter o som ativo
                    beepSound.play();      // Toca o som beep
                    isBeepPlaying = true;  // Marca que o som beep está tocando
                }

                if (secondsLeft <= 1 * 60 && !isAlarmPlaying) {
                    // Pausar o beep quando o alarme começar a tocar
                    if (isBeepPlaying) {
                        beepSound.pause();
                        beepSound.currentTime = 0; // Reseta o som beep
                        isBeepPlaying = false;     // Para de tocar o beep
                    }
                    // Reiniciar o alarme corretamente ao reabrir a página
                    alarmSound.loop = true;
                    alarmSound.play(); // Garante que o alarme toque sempre que <= 1 minuto
                    isAlarmPlaying = true; // Marca que o alarme está tocando
                }
            }
        } else {
            // Quando o contador chegar a zero, inicie a randomização imediatamente
            isRandomizing = true; // Muda para o modo aleatório
            randomInterval = setInterval(randomizeDisplay, 200); // Atualiza os números a cada 200ms
            if (interSound.paused && emSound.paused && weirdSound.paused) {
                interSound.currentTime = 0; // Reseta o som para o início
                emSound.currentTime = 0; // Reseta o som para o início
                weirdSound.currentTime = 0;
                interSound.play(); // Toca o som
                emSound.play(); // Toca o som
                weirdSound.play();
            }
            document.body.style.backgroundColor = 'red'; // Define a cor inicial
            colorInterval = setInterval(toggleBackgroundColor, 500); // Alterna a cor a cada 500ms

            //Habilitar o input e o botão quando randomizando
            codeInput.disabled = false; // Habilita o input mesmo na randomização
            executeButton.disabled = false; // Habilita o botão
            document.getElementById('codeInput').focus(); // Dá o foco no input
            isInputActivated = true; // Marca que o input está ativado
        }
    });

    socket.on('resetCountdown', () => { // Ouvir o evento de reset e atualizar o contador
        isRandomizing = false; // Sai do modo aleatório
        if (randomInterval) {
            clearInterval(randomInterval); // Para a exibição de números aleatórios
        }
        clearInterval(colorInterval); // Para de alternar a cor
        document.body.style.backgroundColor = ''; // Reseta a cor do fundo

        // Reseta os sons e exibe a contagem inicial
        resetSound.play();
        const [minutes, seconds] = formatTime(108 * 60);
        countdownDisplay[0].textContent = minutes[0];
        countdownDisplay[1].textContent = minutes[1];
        countdownDisplay[2].textContent = minutes[2];
        countdownDisplay[3].textContent = '0';
        countdownDisplay[4].textContent = '0';

        codeInput.disabled = true;
        executeButton.disabled = true;
        document.getElementById('codeInput').value = '';
        errorMessage.style.visibility = 'hidden';
        isInputActivated = false;
        isBeepPlaying = false;
        isAlarmPlaying = false;
        beepSound.pause();
        beepSound.currentTime = 0;
        alarmSound.pause();
        alarmSound.currentTime = 0;
        interSound.pause();
        interSound.currentTime = 0;
        emSound.pause();
        emSound.currentTime = 0;
        weirdSound.pause();
        weirdSound.currentTime = 0;

        socket.emit('getRanking');
    });

    document.getElementById('executeButton').addEventListener('click', () => { // evento do envio do código quando o botão 'Execute' é clicado
        const code = document.getElementById('codeInput').value;
        socket.emit('submitCode', code);
    });

    document.getElementById('codeInput').addEventListener('keydown', (event) => { // evento do envio do código quando a tecla Enter é pressionada
        if (event.key === 'Enter') {
            const code = document.getElementById('codeInput').value;
            socket.emit('submitCode', code);
        }
    });

    socket.on('errorCode', (message) => { // Mostrar mensagem de erro se o código estiver incorreto
        errorMessage.style.visibility = 'visible'; // Mostra a mensagem de erro
        document.getElementById('codeInput').value = '';
        document.getElementById('codeInput').focus();
    });

    socket.on('requestName', () => { // Ouvir o evento de solicitar nome do servidor
        setTimeout(() => {
            const modal = document.getElementById('customModal');
            modal.style.display = 'block'; // Exibir o modal

            let nameSubmitted = false; // Variável para verificar se o nome já foi enviado

            // Função para capturar o nome inserido e enviar para o servidor
            function submitName() {
                if (!nameSubmitted) {
                    let name = document.getElementById('nameInput').value;
                    if (!name || name.trim() === '') {
                        name = 'anonymous'; // Se o campo estiver vazio, definir como 'anonymous'
                    }
                    socket.emit('submitName', name); // Enviar o nome para o servidor
                    modal.style.display = 'none'; // Fechar o modal
                    nameSubmitted = true; // Define que o nome já foi enviado
                }
            }

            // Evento de clique no botão de envio
            document.getElementById('submitNameButton').addEventListener('click', submitName);

            // Evento para detectar o 'Enter' na caixa de texto
            document.getElementById('nameInput').addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    submitName();
                }
            });
        }, 1000); // Exibir o modal após 1 segundo (1000ms)
    });
}
