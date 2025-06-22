// src/components/TestimonialsSection.jsx

/**
 * Componente TestimonialsSection
 * * Exibe depoimentos de usuários para construir credibilidade e confiança (prova social).
 * - Utiliza um layout de cards para separar visualmente cada depoimento.
 * - Cada card contém a citação, o nome do autor e sua afiliação.
 * - O design limpo foca na legibilidade e na autenticidade percebida.
 */
export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: "A implementação do UniNext transformou nosso processo de admissão. A verificação de documentos e pagamentos ficou incrivelmente mais rápida e organizada.",
      author: "Dra. Ana Silva",
      role: "Reitora da Universidade Central"
    },
    {
      quote: "Fazer a prova online foi uma experiência muito tranquila. O sistema é intuitivo e me senti seguro de que não haveria problemas com cabulas, o que torna o processo mais justo.",
      author: "João Miguel",
      role: "Candidato Aprovado"
    }
  ];

  return (
    <section id="results" className="py-20 md:py-28 bg-gradient-to-br from-sky-50 to-blue-100">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Confiança e Eficiência Reconhecidas
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Veja o que administradores e candidatos dizem sobre a nossa plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-lg flex flex-col">
              <p className="text-gray-600 italic mb-6 flex-grow">"{testimonial.quote}"</p>
              <div>
                <p className="font-bold text-gray-800">{testimonial.author}</p>
                <p className="text-sm text-blue-600">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}