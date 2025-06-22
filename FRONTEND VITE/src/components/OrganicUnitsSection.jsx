// Importe os logos das suas unidades orgânicas
// Exemplo: import fcn from '../assets/logos/fcn.png';

/**
 * Componente OrganicUnitsSection
 * * Exibe os logotipos das diferentes faculdades ou Unidades Orgânicas da universidade.
 * - Serve como um diretório visual para os candidatos explorarem as opções.
 * - Cada logo pode ser um link para a página da respectiva faculdade.
 */
export default function OrganicUnitsSection() {
    
    // Adicione os logos e nomes das suas unidades orgânicas aqui
    const units = [
        // Exemplo: { name: "Faculdade de Ciências Naturais", logo: fcn, href: "#" },
        { name: "Unidade Orgânica 1", logo: "https://via.placeholder.com/100", href: "#" },
        { name: "Unidade Orgânica 2", logo: "https://via.placeholder.com/100", href: "#" },
        { name: "Unidade Orgânica 3", logo: "https://via.placeholder.com/100", href: "#" },
        { name: "Unidade Orgânica 4", logo: "https://via.placeholder.com/100", href: "#" },
        { name: "Unidade Orgânica 5", logo: "https://via.placeholder.com/100", href: "#" },
        { name: "Unidade Orgânica 6", logo: "https://via.placeholder.com/100", href: "#" },
        { name: "Unidade Orgânica 7", logo: "https://via.placeholder.com/100", href: "#" },
        { name: "Unidade Orgânica 8", logo: "https://via.placeholder.com/100", href: "#" },
    ];

    return (
        <section id="unidades" className="py-20 bg-white">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-4 border-b-2 border-yellow-400 pb-2 inline-block">
                    Concorra Para Uma Vaga Nas Nossas Unidades Orgânicas
                </h2>
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 items-center">
                    {units.map((unit, index) => (
                        <a 
                            key={index} 
                            href={unit.href} 
                            title={unit.name} 
                            className="flex justify-center transform hover:scale-110 transition-transform duration-300"
                        >
                            <img src={unit.logo} alt={unit.name} className="h-24 w-24 object-contain rounded-full shadow-md" />
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}