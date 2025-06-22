// src/components/Footer.jsx

import { Mail, MapPin, Phone } from 'react-feather';

/**
 * Componente Footer (Rodapé)
 * * Contém informações essenciais de contato, links de navegação e direitos autorais.
 * - Fornece informações cruciais para a verificação presencial (endereço, telefone).
 * - Oferece uma navegação secundária para as seções principais da página.
 * - Finaliza a página com uma aparência profissional e limpa.
 */
export default function Footer() {
  const SYSTEM_NAME = "UniNext";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Coluna 1: Logo e Descrição */}
          <div className="md:col-span-2">
             <div className="flex items-center space-x-2 mb-4">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">UN</span>
              </div>
              <span className="text-xl font-bold text-gray-800">{SYSTEM_NAME}</span>
            </div>
            <p className="text-gray-500 max-w-sm">
              Modernizando o acesso ao ensino superior com tecnologia, segurança e transparência.
            </p>
          </div>

          {/* Coluna 2: Links Úteis */}
          <div>
            <h4 className="font-bold text-gray-700 mb-4">Navegação</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-gray-500 hover:text-blue-600 transition">Funcionalidades</a></li>
              <li><a href="#results" className="text-gray-500 hover:text-blue-600 transition">Resultados</a></li>
              <li><a href="#faq" className="text-gray-500 hover:text-blue-600 transition">FAQ</a></li>
              <li><a href="#" className="text-gray-500 hover:text-blue-600 transition">Portal do Candidato</a></li>
            </ul>
          </div>
          
          {/* Coluna 3: Contato */}
          <div>
            <h4 className="font-bold text-gray-700 mb-4">Contato (Verificação Presencial)</h4>
            <ul className="space-y-3 text-gray-500">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-gray-400 mt-1 flex-shrink-0" />
                <span>Av. Ho Chi Minh, 123, Luanda, Angola</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-gray-400" />
                <a href="mailto:contato@uninext.ao" className="hover:text-blue-600">contato@uninext.ao</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <a href="tel:+244999123456" className="hover:text-blue-600">(+244) 999 123 456</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Linha de Direitos Autorais */}
        <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {currentYear} {SYSTEM_NAME}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}