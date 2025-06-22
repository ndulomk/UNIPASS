// src/components/FinalCTASection.jsx

import { Edit3 } from 'react-feather';

/**
 * Componente FinalCTASection (Call to Action Final)
 * * Esta é a última chance de converter o usuário antes do rodapé.
 * - Apresenta um título claro e um botão de ação proeminente.
 * - O objetivo é direcionar tanto candidatos (para se inscreverem) quanto
 * administradores (para adotarem o sistema).
 * - O design é vibrante para chamar a atenção.
 */
export default function FinalCTASection() {
  return (
    <section id="cta" className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-2xl shadow-2xl p-10 md:p-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para Modernizar seu Processo Seletivo?
          </h2>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8">
            Junte-se às instituições que estão revolucionando os exames de admissão. Comece hoje.
          </p>
          <a
            href="#"
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-8 py-3 rounded-full font-bold text-lg shadow-xl hover:bg-gray-200 transform hover:scale-105 transition-all duration-300"
          >
            <Edit3 size={20} />
            Iniciar Inscrição ou Pedir Demo
          </a>
        </div>
      </div>
    </section>
  );
}