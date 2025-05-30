export default function HeroSection() {
    return (
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 bg-gradient-to-br from-blue-900 to-indigo-800 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
        {/* Elementos de fundo com dark mode */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-64 bg-blue-700 dark:bg-blue-900 rounded-full opacity-20 mix-blend-overlay blur-xl"></div>
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-indigo-600 dark:bg-indigo-900 rounded-full opacity-15 mix-blend-overlay blur-xl"></div>
        </div>
  
        <div className="relative container mx-auto px-6 text-center z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-200 dark:from-blue-200 dark:to-indigo-100">
              Processos Seletivos
            </span>
            <br />
            <span className="text-white dark:text-gray-100">na Era Digital</span>
          </h1>
  
          <p className="text-lg md:text-xl lg:text-2xl mb-10 max-w-3xl mx-auto text-blue-100 dark:text-blue-200">
            Automatize inscrições, agendamentos e comunicação com uma plataforma integrada.
          </p>
  
          <div className="flex flex-col sm:flex-row justify-center gap-4 px-4 sm:px-0">
            <button className="relative overflow-hidden group bg-white dark:bg-gray-800 text-blue-900 dark:text-white px-6 py-3 sm:px-8 sm:py-4 rounded-full font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl">
              <span className="relative z-10">Solicitar Demonstração</span>
            </button>
            <button className="relative overflow-hidden group bg-transparent border-2 border-blue-300 dark:border-gray-600 text-white dark:text-gray-200 px-6 py-3 sm:px-8 sm:py-4 rounded-full font-bold hover:bg-white/10 transition-all duration-300 shadow-lg hover:shadow-xl">
              <span className="relative z-10">Explorar Funcionalidades</span>
            </button>
          </div>
  
          <div className="mt-16 mx-auto max-w-4xl px-4 sm:px-0">
            <div className="relative bg-white/10 dark:bg-gray-800/50 backdrop-blur-md rounded-3xl p-1 shadow-2xl border border-white/20 dark:border-gray-700/30">
              <div className="h-64 md:h-96 w-full rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center">
                <span className="text-white/80 text-lg font-medium">
                  Dashboard Preview
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }