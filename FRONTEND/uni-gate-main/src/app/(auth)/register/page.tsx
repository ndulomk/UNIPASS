"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Course } from "@/types";
import { api, fetchCourses } from "@/lib/api";
import axios from "axios";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    course: "",
    email: "",
    password: "",
    comprovativo: null as File | null,
    bilhete: null as File | null,
    vacine_card: null as File | null,
    foto: null as File | null,
  });

  const next = () => setStep((prev) => Math.min(prev + 1, 4));
  const back = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const file = e.target.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, [name]: file }));
  };

  useEffect(() => {
    async function loadCourses() {
      try {
        setIsLoadingCourses(true);
        const fetchedCourses = await fetchCourses();
        setCourses(fetchedCourses ?? []);
      } catch (error) {
        console.error(error);
        toast.error("Falha ao carregar cursos.");
      } finally {
        setIsLoadingCourses(false);
      }
    }
    loadCourses();
  }, []);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    console.log("Form Data being submitted:", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        course_id: formData.course,
        files: {
            comprovativo: formData.comprovativo?.name,
            bilhete: formData.bilhete?.name,
            vacine_card: formData.vacine_card?.name,
            foto: formData.foto?.name
        }
    });

    const missingFields = [];
    if (!formData.name) missingFields.push("Nome");
    if (!formData.email) missingFields.push("Email");
    if (!formData.password) missingFields.push("Senha");
    if (!formData.course) missingFields.push("Curso");
    
    const missingFiles = [];
    if (!formData.comprovativo) missingFiles.push("Comprovativo de Pagamento");
    if (!formData.bilhete) missingFiles.push("Bilhete de Identidade");
    if (!formData.vacine_card) missingFiles.push("Cartão de Vacina");
    if (!formData.foto) missingFiles.push("Foto");

    if (missingFields.length > 0) {
        setErrorMessage(`Campos obrigatórios faltando: ${missingFields.join(", ")}`);
        setIsSubmitting(false);
        return;
    }

    if (missingFiles.length > 0) {
        setErrorMessage(`Documentos obrigatórios faltando: ${missingFiles.join(", ")}`);
        setIsSubmitting(false);
        return;
    }

    const formdata = new FormData();
    formdata.append("name", formData.name);
    formdata.append("email", formData.email);
    formdata.append("password", formData.password);
    formdata.append("course_id", formData.course);

    if (formData.comprovativo) {
        formdata.append("comprovativo", formData.comprovativo);
    }
    if (formData.bilhete) {
        formdata.append("bilhete", formData.bilhete);
    }
    if (formData.vacine_card) {
        formdata.append("vacine_card", formData.vacine_card);
    }
    if (formData.foto) {
        formdata.append("foto", formData.foto);
    }

    try {
        console.log("FormData entries being sent:");
        for (const pair of formdata.entries()) {
            console.log(pair[0], ':', pair[1] instanceof File ? pair[1].name : pair[1]);
        }

        const response = await api.post('/auth/register', formdata, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Accept': 'application/json'
            },
            withCredentials: true
        });

        console.log("Server Response:", response.data);
        toast.success(`Registro efetuado com successo. COD: ${response.data.COD}`);
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    } catch (error) {
        console.error("Error details:", error);
        
        if (axios.isAxiosError(error)) {
            const serverErrorMessage = error.response?.data?.message 
                || error.response?.data?.detail
                || error.message 
                || "An unexpected error occurred during registration.";
            
            console.error("Server error response:", error.response?.data);
            toast.error(serverErrorMessage);
            setErrorMessage(serverErrorMessage);
        } else if (error instanceof Error) {
            toast.error(error.message || "An unexpected error occurred");
            setErrorMessage(error.message || "An unexpected error occurred");
        } else {
            toast.error("An unexpected error occurred");
            setErrorMessage("An unexpected error occurred");
        }
    } finally {
        setIsSubmitting(false);
    }
};
  const steps = [
    { id: 1, name: "Informações Pessoais" },
    { id: 2, name: "Documentos" },
    { id: 3, name: "Criar Conta" },
    { id: 4, name: "Revisão" },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen bg-gradient-to-br from-blue-950 to-indigo-900 dark:from-gray-900 dark:to-gray-800 flex flex-col md:flex-row relative"
    >
      <Link
        href="/"
        className="absolute top-6 left-6 text-blue-200 hover:text-white text-sm transition z-10"
      >
        ← Voltar para Home
      </Link>

      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-12 bg-white/5 backdrop-blur-md border-r border-white/10">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Crie sua conta
            </h1>
          </div>

          <p className="text-blue-100 leading-relaxed">
            Complete seu cadastro em poucos passos para acessar todos os
            recursos do sistema.
          </p>

          <div className="space-y-4 mt-8">
            {steps.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= item.id
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-blue-200"
                  }`}
                >
                  {item.id}
                </div>
                <div>
                  <h3
                    className={`text-sm font-medium ${
                      step >= item.id ? "text-white" : "text-blue-200"
                    }`}
                  >
                    {item.name}
                  </h3>
                  {step === item.id && (
                    <p className="text-xs text-blue-300 mt-1">Etapa atual</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-800/30 p-4 rounded-lg border border-blue-700/50 mt-8">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path
                  fillRule="evenodd"
                  d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                  clipRule="evenodd"
                />
              </svg>
              Dados Bancários
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-blue-200">Banco:</p>
                <p className="text-white">BAI</p>
              </div>
              <div>
                <p className="text-blue-200">Conta Nº:</p>
                <p className="text-white">000138764 10 003</p>
              </div>
              <div className="col-span-2">
                <p className="text-blue-200">IBAN:</p>
                <p className="text-white">A0060040 000000138764 1030 5</p>
              </div>
            </div>
            <p className="text-xs text-blue-300 mt-3 flex items-start gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Anexe o comprovativo de pagamento na etapa 2.
            </p>
          </div>
        </div>
      </div>

      <div className="md:w-1/2 p-6 md:p-10 flex items-center justify-center">
        <div className="bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-xl border border-white/10 w-full max-w-xl">
          <div className="mb-8">
            <div className="flex justify-between mb-2 text-xs text-blue-200">
              <span>Progresso</span>
              <span>{step}/4 etapas</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              ></div>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg text-sm">
              <strong>Erro:</strong> {errorMessage}
            </div>
          )}

          <div className="space-y-6">
            {step === 1 && (
              <>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Informações Pessoais
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-blue-100 mb-1">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/10"
                      placeholder="Digite seu nome completo"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-blue-100 mb-1 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                      Curso
                    </label>
                    <select 
                      name="course"
                      value={formData.course}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/10 appearance-none"
                      required
                    >
                      <option className='text-gray-700' value="">Selecione um curso</option>
                      {isLoadingCourses ? (
                        <option className='text-gray-700' disabled>Carregando cursos...</option>
                      ) : courses.length > 0 ? (
                        courses.map(course => (
                          <option className='text-gray-700' key={course.id} value={course.id}>
                            {course.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option className='text-gray-700' value={"1"}>Direito</option>
                          <option className='text-gray-700' value={"2"}>Gestão de Empresas</option>
                          <option className='text-gray-700' value={"3"}>Economia</option>
                          <option className='text-gray-700' value={"4"}>Relações Internacionais</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Documentos Necessários
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <label className="text-sm text-blue-100 mb-2 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Comprovativo de Pagamento (PDF)
                    </label>
                    <input
                      type="file"
                      name="comprovativo"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="w-full text-sm text-blue-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      required
                    />
                    <p className="text-xs text-blue-300 mt-2">
                      Tamanho máximo: 5MB
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <label className="text-sm text-blue-100 mb-2 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Bilhete de Identidade (Imagem)
                    </label>
                    <input
                      type="file"
                      name="bilhete"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-sm text-blue-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      required
                    />
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <label className="text-sm text-blue-100 mb-2 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                      </svg>
                      Cartão de Vacina (PDF ou Imagem)
                    </label>
                    <input
                      type="file"
                      name="vacine_card"
                      id="vacine_card"
                      onChange={handleFileChange}
                      accept="application/pdf,image/*"
                      className="w-full text-sm text-blue-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      required
                    />
                  </div>
                   <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <label className="text-sm text-blue-100 mb-2 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                       </svg>
                      Foto tipo passe (Imagem)
                    </label>
                    <input
                      type="file"
                      name="foto"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-sm text-blue-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      required
                    />
                  </div>
                </div>
              </>
            )}
             {step === 3 && (
              <>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                   </svg>
                  Criar Conta
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-blue-100 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/10"
                      placeholder="seuemail@exemplo.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-blue-100 mb-1">
                      Senha
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/10"
                      placeholder="Crie uma senha forte"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="text-xl font-semibold text-white">Revisão dos Dados</h2>
                <div className="space-y-3 text-sm text-blue-100">
                  <p><strong>Nome:</strong> {formData.name}</p>
                  <p><strong>Curso:</strong> {
                    (courses.find(c => String(c.id) === formData.course) || 
                     [{id:"1", name:"Direito"}, {id:"2", name:"Gestão de Empresas"}, {id:"3", name:"Economia"}, {id:"4", name:"Relações Internacionais"}].find(c => String(c.id) === formData.course)
                    )?.name || 'N/A'
                  }</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Comprovativo:</strong> {formData.comprovativo?.name || 'N/A'}</p>
                  <p><strong>Bilhete:</strong> {formData.bilhete?.name || 'N/A'}</p>
                  <p><strong>Cartão de Vacina:</strong> {formData.vacine_card?.name || 'N/A'}</p>
                  <p><strong>Foto:</strong> {formData.foto?.name || 'N/A'}</p>
                </div>
                <p className="mt-4 text-xs text-blue-300">
                    Ao clicar em Finalizar Cadastro, você concorda com nossos Termos de Serviço e Política de Privacidade.
                </p>
              </>
            )}

          <div className="flex justify-between items-center pt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={back}
                className="px-6 py-3 rounded-lg bg-white/10 text-blue-100 hover:bg-white/20 transition text-sm font-medium"
              >
                Voltar
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={next}
                disabled={
                    (step === 1 && (!formData.name || !formData.course)) ||
                    (step === 2 && (!formData.comprovativo || !formData.bilhete || !formData.vacine_card || !formData.foto)) ||
                    (step === 3 && (!formData.email || !formData.password)) 
                }
                className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 ml-auto"
              >
                Avançar
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-sm font-medium disabled:opacity-50 ml-auto"
              >
                {isSubmitting ? "Enviando..." : "Finalizar Cadastro"}
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </form>
  );
}