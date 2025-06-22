import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'react-feather';

/**
 * Componente FAQItem
 * * Um item individual da lista de FAQ, que pode ser expandido ou recolhido.
 */
const FAQItem = ({ question, answer, isOpen, onClick }) => {
  return (
    <div className="border-b">
      <button
        onClick={onClick}
        className="w-full flex justify-between items-center text-left py-4 px-2 hover:bg-sky-50"
      >
        <span className="flex items-center gap-3">
            <HelpCircle className="text-blue-600" size={24} />
            <span className="font-semibold text-lg text-gray-800">{question}</span>
        </span>
        <ChevronDown 
            className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
            size={24} 
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-gray-600">
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Componente FAQSection
 * * Exibe uma lista de perguntas frequentes (FAQ) num formato de acordeão.
 * - Permite aos usuários encontrar respostas para dúvidas comuns rapidamente.
 * - Apenas uma pergunta pode ser expandida de cada vez.
 */
export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "Quem pode participar do Exame de Acesso?",
      answer: "Podem participar todos os candidatos que concluíram o ensino secundário ou equivalente, e que cumpram os pré-requisitos específicos do curso desejado."
    },
    {
      question: "Quais documentos são necessários para a inscrição?",
      answer: "Normalmente, são necessários o Bilhete de Identidade, certificado de habilitações do ensino secundário, e uma fotografia tipo passe. Consulte o edital oficial para a lista completa e actualizada."
    },
    {
      question: "Como faço minha inscrição para Exame de Acesso?",
      answer: "A inscrição é feita online através desta plataforma. Deverá preencher o formulário, submeter os documentos necessários e efectuar o pagamento da taxa de inscrição."
    },
    {
        question: "Qual o valor da taxa de inscrição?",
        answer: "O valor da taxa de inscrição é definido anualmente e publicado no edital do exame. O pagamento pode ser feito por referência bancária ou outros métodos indicados na plataforma."
    },
    {
        question: "Onde posso encontrar o edital do exame?",
        answer: "O edital oficial com todas as informações, incluindo datas, vagas e conteúdos programáticos, estará disponível para download na secção de 'Notícias' do nosso site."
    },
    {
        question: "Quando e onde as provas serão realizadas?",
        answer: "As datas e os locais de realização das provas são divulgados no edital e confirmados no comprovativo de inscrição do candidato."
    },
     {
        question: "Posso mudar meu curso após realizar a inscrição?",
        answer: "Não é possível alterar a opção de curso após a finalização e pagamento da inscrição. Escolha com atenção no momento do registo."
    }
  ];

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-sky-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Perguntas Frequentes
        </h2>
        <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
            Encontre aqui respostas para as dúvidas mais comuns sobre o processo seletivo.
        </p>

        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}