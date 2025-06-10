import Image from 'next/image';
import React from 'react';

const testimonials = [
  {
    name: 'João Silva',
    role: 'Coordenador Acadêmico',
    image: 'https://i.pravatar.cc/100?img=1',
    testimonial: 'O UniGate transformou nossa gestão acadêmica. Simples, rápido e eficiente!',
  },
  {
    name: 'Maria Oliveira',
    role: 'Diretora de TI',
    image: 'https://i.pravatar.cc/100?img=2',
    testimonial: 'A integração foi perfeita. A equipe adorou a nova interface.',
  },
  {
    name: 'Carlos Souza',
    role: 'Professor de Matemática',
    image: 'https://i.pravatar.cc/100?img=3',
    testimonial: 'Facilitou muito o acompanhamento dos alunos e suas atividades.',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-16 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-12">
          O que dizem sobre nós
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <div key={index} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={100}  // Adicionando a largura
                  height={100} // Adicionando a altura
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="text-gray-800 dark:text-white font-semibold">{item.name}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{item.role}</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300">{item.testimonial}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
