import { FileText, Shield, CheckCircle } from 'react-feather';

// Dados das funcionalidades para facilitar a manutenção.
const features = [
  {
    icon: <FileText size={32} className="text-blue-600" />,
    title: "Gestão de Candidaturas",
    description: "Administradores podem verificar documentos, confirmar pagamentos e aprovar candidatos para a prova, tudo em um painel centralizado.",
  },
  {
    icon: <Shield size={32} className="text-blue-600" />,
    title: "Provas Seguras e Anti-Cabula",
    description: "Nosso foco principal. Um ambiente de prova robusto com tecnologia de ponta para garantir a integridade do exame e a justiça para todos os candidatos.",
  },
  {
    icon: <CheckCircle size={32} className="text-blue-600" />,
    title: "Listas de Resultados Automatizadas",
    description: "Após as provas, o sistema gera automaticamente as listas de aprovados, candidatos em segunda chamada e reprovados, de forma clara e acessível.",
  },
];

/**
 * Componente FeaturesSection
 * * Descreve os principais benefícios e funcionalidades do sistema.
 * - Usa um layout de grade para apresentar as informações de forma organizada.
 * - Cada "feature" é representada por um card com ícone, título e descrição.
 * - A estrutura visa ser escaneável e de fácil digestão para o usuário.
 */
export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-6 text-center">
        
        {/* Cabeçalho da Seção */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Uma Plataforma Completa Para Sua Instituição
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-16">
          Desde a validação dos requisitos até a publicação dos resultados, cobrimos cada etapa.
        </p>
        
        {/* Grade de Funcionalidades */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-gray-50 p-8 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-gray-100"
            >
              {/* Ícone da Funcionalidade */}
              <div className="inline-block bg-sky-100 p-4 rounded-full mb-6">
                {feature.icon}
              </div>
              
              {/* Título e Descrição */}
              <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}