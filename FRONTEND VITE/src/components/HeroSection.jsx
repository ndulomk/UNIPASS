import HeroImage from "/uni.jpg"
import { ArrowRight, Shield } from 'react-feather';

/**
 * Componente HeroSection
 * * A primeira e mais impactante seção da página.
 * - Utiliza uma imagem de fundo para criar um forte apelo visual.
 * - Sobrepõe a imagem com um gradiente azul translúcido para garantir a legibilidade do texto.
 * - Apresenta o título principal (H1), a proposta de valor e os principais botões de ação (CTAs).
 * - O objetivo é capturar a atenção do usuário imediatamente e comunicar o propósito do sistema.
 */
export default function HeroSection() {
  return (
    <section id="home" className="relative h-[95vh] min-h-[600px] md:h-screen flex items-center justify-center text-white overflow-hidden">
      
      {/* Container da Imagem de Fundo.
        A imagem é posicionada absolutamente para preencher toda a seção.
        'object-cover' garante que a imagem cubra o espaço sem distorcer.
        O filtro 'brightness-50' escurece a imagem para que o texto branco se destaque.
      */}
      <div className="absolute inset-0 z-0">
        <img 
          src={HeroImage} 
          alt="Estudantes universitários focados em um exame" 
          className="w-full h-full object-cover" 
        />
        {/* Overlay de gradiente para melhorar a legibilidade do texto sobre a imagem. */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-700/60 to-sky-500/70"></div>
      </div>

      {/* Conteúdo da Hero Section */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        
        {/* Tag de destaque, como "Segurança Máxima" */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-1 rounded-full mb-4 border border-white/30">
          <Shield size={16} />
          {/* <span className="font-semibold text-sm">Sistema Anti-Cabula Integrado</span> */}
        </div>

        {/* Título Principal (H1) */}
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight shadow-lg">
          O Futuro dos Exames de Admissão
        </h1>

        {/* Subtítulo / Proposta de Valor */}
        <p className="text-lg md:text-xl lg:text-2xl mb-10 max-w-3xl mx-auto font-light">
          Uma plataforma completa, segura e eficiente para gerir todo o processo seletivo da sua universidade, da inscrição ao resultado final.
        </p>

        {/* Botões de Call-to-Action (CTA) */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <a
            href="#cta"
            className="flex items-center justify-center gap-2 bg-white text-blue-700 px-8 py-3 rounded-full font-bold text-lg shadow-xl hover:bg-gray-200 transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
          >
            Começar Inscrição
            <ArrowRight size={20} />
          </a>
          <a
            href="#features"
            className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-white/20 transition-all duration-300 w-full sm:w-auto"
          >
            Ver Funcionalidades
          </a>
        </div>
      </div>
    </section>
  );
}