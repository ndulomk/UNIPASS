import Link from "next/link"
import { Button } from "@/components/ui/button"
import LottieAnimation from "@/components/LottieAnimation"
import animationData from "../../public/animations/not-found.json"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 dark:from-blue-900/10 dark:to-gray-900">
      <div className="mx-auto w-full max-w-md text-center">
        {/* Animação Lottie */}
        <div className="mx-auto h-64 w-64">
          <LottieAnimation 
            animationData={animationData} 
            loop={true}
          />
        </div>

        {/* Título e Mensagem */}
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Página não encontrada
        </h1>
        
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          Ops! A página que você está procurando não existe ou foi movida.
        </p>
        
        {/* Sugestões específicas para o sistema educacional */}
        <div className="mt-6 space-y-2 text-left">
          <p className="text-blue-700 dark:text-gray-400">
            Como administrador do sistema, você pode:
          </p>
          <ul className="list-inside list-decimal space-y-1 text-gray-600 dark:text-gray-400">
            <li>Verificar se o endereço está correto</li>
            <li>Acessar diretamente os módulos principais</li>
            <li>Consultar a documentação do sistema</li>
            <li>Reportar o problema ao suporte técnico</li>
          </ul>
        </div>

        {/* Botões de ação relevantes para o painel admin */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild variant="default" className="bg-blue-600 hover:bg-blue-700">
            <Link href="/admin">Painel Administrativo</Link>
          </Button>
          <div className="flex gap-4">
            <Button asChild variant="outline">
              <Link href="/admin/candidatos">Candidatos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/agendamentos">Agendamentos</Link>
            </Button>
          </div>
        </div>

        {/* Link para suporte */}
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          Precisa de ajuda? <Link href="/suporte" className="text-blue-600 dark:text-blue-400 hover:underline">Contate o suporte</Link>
        </div>
      </div>
    </div>
  );
}