'use client'

import Link from 'next/link';
import { useState } from 'react';

// Dados mock de agendamentos
const mockSchedules = [
  {
    id: 1,
    examName: 'Avaliação Trimestral de Matemática',
    course: 'Engenharia Civil',
    examType: 'Híbrida',
    examDate: '2023-11-15T09:00:00',
    examDuration: 120,
    publicationDate: '2023-11-20T18:00:00',
    secondCallEligible: true,
    secondCallDate: '2023-11-22T14:00:00',
    status: 'Agendado'
  },
  {
    id: 2,
    examName: 'Prova Final de Direito Constitucional',
    course: 'Direito',
    examType: 'Discursiva',
    examDate: '2023-11-18T14:00:00',
    examDuration: 180,
    publicationDate: '2023-11-25T12:00:00',
    secondCallEligible: false,
    secondCallDate: null,
    status: 'Agendado'
  },
  {
    id: 3,
    examName: 'Teste Intermediário de Economia',
    course: 'Economia',
    examType: 'Objetiva',
    examDate: '2023-11-10T10:00:00',
    examDuration: 90,
    publicationDate: '2023-11-15T12:00:00',
    secondCallEligible: true,
    secondCallDate: '2023-11-17T10:00:00',
    status: 'Concluído'
  },
  {
    id: 4,
    examName: 'Avaliação de Gestão de Projetos',
    course: 'Gestão de Empresas',
    examType: 'Híbrida',
    examDate: '2023-12-05T16:00:00',
    examDuration: 150,
    publicationDate: '2023-12-10T18:00:00',
    secondCallEligible: true,
    secondCallDate: '2023-12-12T16:00:00',
    status: 'Pendente'
  }
];

export default function ViewSchedulesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filtrar agendamentos
  const filteredSchedules = mockSchedules.filter(schedule => {
    const matchesSearch = schedule.examName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         schedule.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = filterCourse === 'all' || schedule.course === filterCourse;
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus;
    
    return matchesSearch && matchesCourse && matchesStatus;
  });

  // Formatador de data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não aplicável';
    
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('pt-BR', options);
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-blue-950 to-indigo-900 dark:from-gray-900 dark:to-gray-800 p-6 md:p-10">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Agendamentos Cadastrados
          </h1>
          <p className="text-blue-200 mt-1">Visualize e gerencie todas as avaliações agendadas</p>
        </div>
        
        <Link 
          href="/admin/SchedulingPage" 
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white flex items-center gap-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Novo Agendamento
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white/5 backdrop-blur-xl p-4 md:p-6 rounded-xl border border-white/10 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-blue-100 mb-1">Buscar</label>
            <input 
              type="text" 
              placeholder="Nome da prova ou curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/10"
            />
          </div>
          
          <div>
            <label className="block text-sm text-blue-100 mb-1">Filtrar por Curso</label>
            <select 
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/10 appearance-none"
            >
              <option className='text-neutral-500' value="all">Todos os Cursos</option>
              <option className='text-neutral-500' value="Engenharia Civil">Engenharia Civil</option>
              <option className='text-neutral-500' value="Direito">Direito</option>
              <option className='text-neutral-500' value="Economia">Economia</option>
              <option className='text-neutral-500' value="Gestão de Empresas">Gestão de Empresas</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-blue-100 mb-1">Filtrar por Status</label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/10 appearance-none"
            >
              <option className='text-neutral-500' value="all">Todos os Status</option>
              <option className='text-neutral-500' value="Agendado">Agendado</option>
              <option className='text-neutral-500' value="Pendente">Pendente</option>
              <option className='text-neutral-500' value="Concluído">Concluído</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Agendamentos */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div className="grid grid-cols-12 p-4 bg-white/10 border-b border-white/10 text-sm text-blue-200 font-medium">
          <div className="col-span-4 md:col-span-3">Prova</div>
          <div className="col-span-3 md:col-span-2">Curso</div>
          <div className="col-span-3 md:col-span-2">Data</div>
          <div className="col-span-2 md:col-span-2">Tipo</div>
          <div className="col-span-2 md:col-span-2">Status</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {/* Corpo da tabela */}
        {filteredSchedules.length > 0 ? (
          filteredSchedules.map(schedule => (
            <div key={schedule.id} className="grid grid-cols-12 p-4 border-b border-white/10 hover:bg-white/5 transition-colors">
              <div className="col-span-4 md:col-span-3 text-white flex items-center">
                {schedule.examName}
              </div>
              <div className="col-span-3 md:col-span-2 text-blue-200">
                {schedule.course}
              </div>
              <div className="col-span-3 md:col-span-2 text-blue-200">
                {formatDate(schedule.examDate)}
              </div>
              <div className="col-span-2 md:col-span-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  schedule.examType === 'Objetiva' ? 'bg-purple-100 text-purple-800' :
                  schedule.examType === 'Discursiva' ? 'bg-blue-100 text-blue-800' :
                  'bg-indigo-100 text-indigo-800'
                }`}>
                  {schedule.examType}
                </span>
              </div>
              <div className="col-span-2 md:col-span-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  schedule.status === 'Agendado' ? 'bg-green-100 text-green-800' :
                  schedule.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {schedule.status}
                </span>
              </div>
              <div className="col-span-1 flex justify-end">
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/agendamento/editar/${schedule.id}`}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    title="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </Link>
                  <button 
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Excluir"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-white">Nenhum agendamento encontrado</h3>
            <p className="mt-1 text-blue-200">Tente ajustar os filtros de busca</p>
          </div>
        )}
      </div>

      {/* Detalhes do agendamento selecionado (modal poderia ser implementado aqui) */}
    </section>
  );
}