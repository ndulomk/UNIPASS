const features = [
    {
      title: "Inscrição Digital",
      description: "Formulários online com validação automática e upload de documentos.",
      icon: "📝",
    },
    {
      title: "Agendamento Inteligente",
      description: "Calendário integrado para provas e prazos personalizados.",
      icon: "🗓️",
    },
    {
      title: "Painel Administrativo",
      description: "Controle total de candidatos, cursos e relatórios.",
      icon: "📊",
    },
  ];
  
  export default function FeaturesSection() {
    return (
      <section className="py-20 md:py-28 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-16 text-gray-900 dark:text-white leading-tight">
            Tecnologia a Serviço da Educação
          </h2>
  
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1"
                aria-label={`Recurso: ${feature.title}`}
              >
                <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-blue-100 dark:bg-blue-900 text-3xl mb-6 transition-all duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  