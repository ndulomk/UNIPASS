import { useEffect, useState } from 'react';

/**
 * Componente Counter (Versão Corrigida)
 * * A seção de destaque com um contador regressivo preciso.
 * - Utiliza setInterval para uma atualização a cada segundo, garantindo que o contador funcione corretamente.
 */
export default function Counter() {
    // IMPORTANTE: Mude esta data para a data real do seu exame
    const targetDate = new Date('2025-08-20T00:00:00');

    const calculateTimeLeft = () => {
        const difference = +targetDate - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                dias: Math.floor(difference / (1000 * 60 * 60 * 24)),
                horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutos: Math.floor((difference / 1000 / 60) % 60),
                segundos: Math.floor((difference / 1000) % 60),
            };
        } else {
            timeLeft = { dias: 0, horas: 0, minutos: 0, segundos: 0 };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        // Inicia um temporizador que executa a cada segundo
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // Limpa o temporizador quando o componente é removido para evitar memory leaks
        return () => clearInterval(timer);
    }, []);

    return (
        <section
            id="home"
            className="relative text-white bg-cover bg-center"
            style={{ backgroundImage: `url(${3})` }}
        >
            <div className="absolute inset-0 bg-blue-900 bg-opacity-70" />

            <div className="relative z-10 container mx-auto px-4 py-24 md:py-32 text-center">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                    UNIPASS
                </h1>
                <p className="mt-2 text-yellow-400 font-semibold text-lg md:text-xl">
                    SOBRE EXAME DE ACESSO: ADMISSÃO
                </p>

                <div className="max-w-4xl mx-auto mt-12">
                    <div className="bg-yellow-400 text-blue-900 p-4 rounded-lg shadow-lg mb-8">
                        <p className="font-bold">▲ Aviso: A plataforma será reactivada na véspera da realização do processo de Exames de Acesso.</p>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="bg-red-600 p-4 rounded-lg">
                            <span className="text-4xl md:text-5xl font-bold">{String(timeLeft.dias).padStart(2, '0')}</span>
                            <p className="text-sm uppercase">Dias</p>
                        </div>
                        <div className="bg-yellow-500 p-4 rounded-lg">
                            <span className="text-4xl md:text-5xl font-bold">{String(timeLeft.horas).padStart(2, '0')}</span>
                            <p className="text-sm uppercase">Horas</p>
                        </div>
                        <div className="bg-blue-500 p-4 rounded-lg">
                            <span className="text-4xl md:text-5xl font-bold">{String(timeLeft.minutos).padStart(2, '0')}</span>
                            <p className="text-sm uppercase">Minutos</p>
                        </div>
                        <div className="bg-green-500 p-4 rounded-lg">
                            <span className="text-4xl md:text-5xl font-bold">{String(timeLeft.segundos).padStart(2, '0')}</span>
                            <p className="text-sm uppercase">Segundos</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}