import  { useState, useEffect } from 'react'
import StudentSidebar from './StundentSidebar.jsx'
import StudentHeader from './StudentHeader.jsx'
import { api } from '../lib/api.js'

const StudentLayout = ({ children, enrollmentId }) => {
  const [studentName, setStudentName] = useState(undefined)
  const [courseName, setCourseName] = useState(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)
  const openMobileSidebar = () => setIsCollapsed(false)

  useEffect(() => {
    if (enrollmentId) {
      const fetchEnrollmentDetails = async () => {
        setIsLoading(true)
        try {
          const response = await api.get(`/enrollments/${enrollmentId}/details`)
          const data = response.data
          setStudentName(`${data.user.first_name} ${data.user.last_name}`)
          setCourseName(data.course.name)
        } catch (error) {
          console.error("Erro ao buscar detalhes da inscrição:", error)
        } finally {
          setIsLoading(false)
        }
      }
      fetchEnrollmentDetails()
    } else {
      setIsLoading(false)
    }
  }, [enrollmentId])

  return (
    <div className="flex min-h-screen bg-slate-100 max-[1px]:bg-slate-900 text-slate-900 max-[1px]:text-slate-100">
      <StudentSidebar studentName={studentName} courseName={courseName} />
      <div className={`flex-1 ${isCollapsed ? 'ml-0' : 'ml-72'} flex flex-col`}>
        <StudentHeader
          studentName={studentName}
          isCollapsed={isCollapsed}
          onToggleSidebar={toggleSidebar}
          onOpenMobileSidebar={openMobileSidebar}
        />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {isLoading && !studentName ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-sky-500"></div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}

export default StudentLayout