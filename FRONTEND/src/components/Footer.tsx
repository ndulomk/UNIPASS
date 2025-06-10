import { Facebook, Twitter, Linkedin } from 'react-feather';

export default function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center md:text-left items-start">

          {/* Logo e descrição */}
          <div>
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">UG</span>
              </div>
              <span className="text-xl font-bold">UniGate</span>
            </div>
            <p className="mt-4 text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto md:mx-0">
              Soluções modernas para portais universitários. Conectando alunos, professores e instituições.
            </p>
          </div>

          {/* Links úteis */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">Links Úteis</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-blue-400 dark:hover:text-blue-300 transition">Termos de Uso</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 dark:hover:text-blue-300 transition">Política de Privacidade</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 dark:hover:text-blue-300 transition">Contato</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 dark:hover:text-blue-300 transition">Ajuda</a></li>
            </ul>
          </div>

          {/* Redes sociais */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">Conecte-se</h4>
            <div className="flex justify-center md:justify-start space-x-4">
              <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-blue-500 transition">
                <Facebook size={18} />
              </a>
              <a href="#" aria-label="Twitter" className="text-gray-400 hover:text-blue-400 transition">
                <Twitter size={18} />
              </a>
              <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-blue-300 transition">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Linha final */}
        <div className="mt-12 border-t border-gray-700 pt-6 text-center text-sm text-gray-500 dark:text-gray-600">
          © {new Date().getFullYear()} UniGate. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
