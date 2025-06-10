'use client';

// components/FAQSection.tsx
import React, { useState } from 'react';

const faqs = [
  {
    question: 'Como posso me inscrever?',
    answer: 'Você pode se inscrever acessando a seção de inscrições e preenchendo o formulário online.',
  },
  {
    question: 'O sistema é compatível com dispositivos móveis?',
    answer: 'Sim, o UniGate é totalmente responsivo e funciona em qualquer dispositivo.',
  },
  {
    question: 'Posso acompanhar o progresso dos alunos?',
    answer: 'Claro! O painel administrativo permite monitorar o desempenho dos alunos em tempo real.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-12">
          Perguntas Frequentes
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left flex justify-between items-center text-gray-800 dark:text-white focus:outline-none"
              >
                <span>{faq.question}</span>
                <span>{openIndex === index ? '-' : '+'}</span>
              </button>
              {openIndex === index && (
                <p className="mt-2 text-gray-600 dark:text-gray-400">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
